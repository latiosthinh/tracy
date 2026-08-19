import type { Page } from 'playwright-core';
import { computeDomSkeletonHash } from './domSkeleton.js';
import { filterSafeInteractiveElements } from './safetyFilter.js';
import { planFormInteractions, FormPlanContext } from './formExplorer.js';
import type {
  CrawlNode,
  CrawlEdge,
  CrawlOptions,
  CrawlProgressEvent,
  InteractiveElement,
} from './types.js';

export interface CrawlGraph {
  nodes: Map<string, CrawlNode>;
  edges: CrawlEdge[];
}

export interface CrawlQueueItem {
  url: string;
  depth: number;
  pathSoFar: CrawlEdge[];
  previousNodeId?: string;
  triggerEdge?: Omit<CrawlEdge, 'targetNodeId'>;
}

export interface CrawlPageDriver {
  goto(url: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<any>;
  content(): Promise<string>;
  url(): string;
  title(): Promise<string>;
  evaluate<T>(fn: (...args: any[]) => T | Promise<T>, ...args: any[]): Promise<T>;
  click?(selector: string, options?: { timeout?: number }): Promise<void>;
  waitForTimeout?(ms: number): Promise<void>;
}

export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    const parsed = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    // Only accept http and https protocols (mitigates T-18-04)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    // Normalize: strip hashes, strip trailing slashes if not root
    parsed.hash = '';
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isSameOrigin(targetUrl: string, originBase: string): boolean {
  try {
    const target = new URL(targetUrl);
    const origin = new URL(originBase);
    return target.origin === origin.origin;
  } catch {
    return false;
  }
}

export class BfsCrawler {
  private options: Required<Omit<CrawlOptions, 'allowedPaths' | 'blockedPaths' | 'originBoundary'>> & {
    allowedPaths?: RegExp[];
    blockedPaths?: RegExp[];
    originBoundary: string;
  };
  private visitedStates = new Set<string>(); // key: `${normalizedUrl}::${skeletonHash}`
  private visitedUrls = new Set<string>();
  private graph: CrawlGraph = {
    nodes: new Map<string, CrawlNode>(),
    edges: [],
  };
  private queue: CrawlQueueItem[] = [];
  private abortController: AbortController = new AbortController();
  private onProgress?: (event: CrawlProgressEvent) => void;

  constructor(
    startUrl: string,
    options: CrawlOptions = {},
    onProgress?: (event: CrawlProgressEvent) => void
  ) {
    const normalizedStart = normalizeUrl(startUrl);
    if (!normalizedStart) {
      throw new Error(`Invalid start URL scheme or format: "${startUrl}". Only http/https supported.`);
    }

    const defaultOrigin = new URL(normalizedStart).origin;
    const originBoundary =
      typeof options.originBoundary === 'string'
        ? options.originBoundary
        : defaultOrigin;

    // Enforce limits (T-18-05 DoS mitigation)
    const maxDepth = Math.min(Math.max(options.maxDepth ?? 3, 1), 10);
    const maxPages = Math.min(Math.max(options.maxPages ?? 50, 1), 200);

    this.options = {
      maxDepth,
      maxPages,
      originBoundary,
      fillForms: options.fillForms ?? true,
      timeoutMs: options.timeoutMs ?? 15000,
      allowedPaths: options.allowedPaths,
      blockedPaths: options.blockedPaths,
    };

    this.onProgress = onProgress;

    this.queue.push({
      url: normalizedStart,
      depth: 0,
      pathSoFar: [],
    });
  }

  public abort(): void {
    this.abortController.abort();
  }

  public getGraph(): CrawlGraph {
    return this.graph;
  }

  private isAllowed(url: string): boolean {
    if (!isSameOrigin(url, this.options.originBoundary)) {
      return false;
    }
    const parsed = new URL(url);
    if (this.options.blockedPaths) {
      for (const pattern of this.options.blockedPaths) {
        if (pattern.test(parsed.pathname)) return false;
      }
    }
    if (this.options.allowedPaths && this.options.allowedPaths.length > 0) {
      return this.options.allowedPaths.some((pattern) => pattern.test(parsed.pathname));
    }
    return true;
  }

  public async crawl(pageDriver: CrawlPageDriver | Page): Promise<CrawlGraph> {
    while (this.queue.length > 0) {
      if (this.abortController.signal.aborted) {
        this.emitProgress({
          phase: 'complete',
          totalDiscovered: this.graph.nodes.size,
          totalVisited: this.visitedStates.size,
          queueLength: 0,
          message: 'Crawl aborted by user signal.',
        });
        break;
      }

      if (this.graph.nodes.size >= this.options.maxPages) {
        break;
      }

      const item = this.queue.shift()!;
      const { url, depth, previousNodeId, triggerEdge } = item;

      if (!this.isAllowed(url)) {
        continue;
      }

      try {
        this.emitProgress({
          phase: 'discovering',
          currentUrl: url,
          totalDiscovered: this.graph.nodes.size,
          totalVisited: this.visitedStates.size,
          queueLength: this.queue.length,
          message: `Navigating to ${url} (depth ${depth})`,
        });

        await pageDriver.goto(url, {
          timeout: this.options.timeoutMs,
          waitUntil: 'domcontentloaded',
        });

        const html = await pageDriver.content();
        const currentLiveUrl = pageDriver.url();
        const normalizedLiveUrl = normalizeUrl(currentLiveUrl, url) || url;
        const skeletonHash = computeDomSkeletonHash(html);
        const stateKey = `${normalizedLiveUrl}::${skeletonHash}`;
        const nodeId = `${normalizedLiveUrl}#${skeletonHash}`;

        // Connect previous edge if present
        if (previousNodeId && triggerEdge) {
          this.graph.edges.push({
            sourceNodeId: previousNodeId,
            targetNodeId: nodeId,
            actionType: triggerEdge.actionType,
            selector: triggerEdge.selector,
            triggerText: triggerEdge.triggerText,
          });
        }

        if (this.visitedStates.has(stateKey)) {
          continue;
        }
        this.visitedStates.add(stateKey);
        this.visitedUrls.add(normalizedLiveUrl);

        let pageTitle = '';
        try {
          pageTitle = await pageDriver.title();
        } catch {
          pageTitle = '';
        }

        const rawElements = await this.extractInteractiveElements(pageDriver);
        const { safe: safeElements } = filterSafeInteractiveElements(rawElements);

        const node: CrawlNode = {
          id: nodeId,
          url: normalizedLiveUrl,
          pathname: new URL(normalizedLiveUrl).pathname,
          title: pageTitle,
          skeletonHash,
          visitedAt: Date.now(),
          interactiveElements: safeElements,
        };

        this.graph.nodes.set(nodeId, node);

        this.emitProgress({
          phase: 'interacting',
          currentNodeId: nodeId,
          currentUrl: normalizedLiveUrl,
          totalDiscovered: this.graph.nodes.size,
          totalVisited: this.visitedStates.size,
          queueLength: this.queue.length,
          message: `Discovered node ${node.pathname} with ${safeElements.length} safe elements`,
        });

        if (depth < this.options.maxDepth && this.graph.nodes.size < this.options.maxPages) {
          // 1. Process links
          for (const el of safeElements) {
            if (el.tagName === 'a' && el.href) {
              const targetUrl = normalizeUrl(el.href, normalizedLiveUrl);
              if (targetUrl && this.isAllowed(targetUrl)) {
                const isAlreadyQueuedOrVisited =
                  this.visitedUrls.has(targetUrl) ||
                  this.queue.some((q) => q.url === targetUrl);

                if (!isAlreadyQueuedOrVisited) {
                  this.queue.push({
                    url: targetUrl,
                    depth: depth + 1,
                    pathSoFar: [...item.pathSoFar],
                    previousNodeId: nodeId,
                    triggerEdge: {
                      sourceNodeId: nodeId,
                      actionType: 'navigate',
                      selector: el.selector,
                      triggerText: el.text,
                    },
                  });
                } else if (this.visitedUrls.has(targetUrl)) {
                  // Connect edge to any known node matching URL if possible
                  for (const [existingId, existingNode] of this.graph.nodes.entries()) {
                    if (existingNode.url === targetUrl) {
                      this.graph.edges.push({
                        sourceNodeId: nodeId,
                        targetNodeId: existingId,
                        actionType: 'navigate',
                        selector: el.selector,
                        triggerText: el.text,
                      });
                      break;
                    }
                  }
                }
              }
            }
          }

          // 2. Process forms if enabled
          if (this.options.fillForms) {
            const forms = await this.extractForms(pageDriver);
            for (const form of forms) {
              const formSteps = planFormInteractions(form);
              if (formSteps.length > 0) {
                // Record form interaction edge in graph
                this.graph.edges.push({
                  sourceNodeId: nodeId,
                  targetNodeId: nodeId, // Self-loop or state transition
                  actionType: 'fill_submit',
                  selector: form.selector,
                  triggerText: form.submitButton?.text || 'Submit Form',
                });
              }
            }
          }

          // 3. Process buttons (record as potential actions on current node)
          for (const el of safeElements) {
            if (el.tagName === 'button' && !el.isSubmit) {
              this.graph.edges.push({
                sourceNodeId: nodeId,
                targetNodeId: nodeId,
                actionType: 'click',
                selector: el.selector,
                triggerText: el.text,
              });
            }
          }
        }
      } catch (err: any) {
        this.emitProgress({
          phase: 'error',
          currentUrl: url,
          totalDiscovered: this.graph.nodes.size,
          totalVisited: this.visitedStates.size,
          queueLength: this.queue.length,
          message: `Error crawling ${url}: ${err?.message || String(err)}`,
        });
      }
    }

    this.emitProgress({
      phase: 'complete',
      totalDiscovered: this.graph.nodes.size,
      totalVisited: this.visitedStates.size,
      queueLength: 0,
      message: `Crawl complete. Discovered ${this.graph.nodes.size} nodes and ${this.graph.edges.length} edges.`,
    });

    return this.graph;
  }

  private emitProgress(event: CrawlProgressEvent) {
    if (this.onProgress) {
      try {
        this.onProgress(event);
      } catch {
        // Suppress listener callback errors
      }
    }
  }

  private async extractInteractiveElements(page: CrawlPageDriver | Page): Promise<InteractiveElement[]> {
    return page.evaluate(() => {
      const elements: any[] = [];
      const query = 'a[href], button, input, select, textarea, [role="button"], [role="link"]';
      const domNodes = document.querySelectorAll(query);

      domNodes.forEach((node, index) => {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        const href = (el as HTMLAnchorElement).href || undefined;
        const text = (el.textContent || '').trim().slice(0, 100);
        const ariaLabel = el.getAttribute('aria-label') || undefined;
        const name = el.getAttribute('name') || undefined;
        const id = el.id || undefined;
        const className = el.className && typeof el.className === 'string' ? el.className : undefined;
        const role = el.getAttribute('role') || undefined;
        const type = el.getAttribute('type') || undefined;
        const title = el.getAttribute('title') || undefined;
        const isSubmit = tagName === 'button' && (type === 'submit' || !type);

        let selector = '';
        if (id) {
          selector = `#${id}`;
        } else if (name) {
          selector = `${tagName}[name="${name}"]`;
        } else if (ariaLabel) {
          selector = `${tagName}[aria-label="${ariaLabel}"]`;
        } else if (text && text.length < 30 && tagName === 'button') {
          selector = `button:has-text("${text.replace(/"/g, '\\"')}")`;
        } else {
          selector = `${tagName}:nth-of-type(${index + 1})`;
        }

        elements.push({
          tagName,
          type,
          role,
          selector,
          text,
          isSafe: true,
          href,
          formId: (el as HTMLInputElement).form?.id,
          isSubmit,
          name,
          id,
          ariaLabel,
          className,
          title,
        });
      });

      return elements;
    });
  }

  private async extractForms(page: CrawlPageDriver | Page): Promise<FormPlanContext[]> {
    return page.evaluate(() => {
      const forms: any[] = [];
      const formNodes = document.querySelectorAll('form');

      formNodes.forEach((form, index) => {
        const formId = form.id || undefined;
        const formSelector = formId ? `form#${formId}` : `form:nth-of-type(${index + 1})`;
        const fields: any[] = [];

        const inputElements = form.querySelectorAll('input, select, textarea');
        inputElements.forEach((input) => {
          const inp = input as HTMLInputElement;
          const tagName = inp.tagName.toLowerCase();
          const type = (inp.type || 'text').toLowerCase();
          const name = inp.name || undefined;
          const placeholder = inp.placeholder || undefined;
          const id = inp.id || undefined;

          let selector = '';
          if (id) selector = `#${id}`;
          else if (name) selector = `${tagName}[name="${name}"]`;
          else selector = `${tagName}`;

          fields.push({
            name,
            type,
            placeholder,
            selector,
          });
        });

        const submitBtnNode = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
        let submitButton: any = undefined;
        if (submitBtnNode) {
          const btn = submitBtnNode as HTMLElement;
          submitButton = {
            tagName: btn.tagName.toLowerCase(),
            selector: btn.id ? `#${btn.id}` : `${formSelector} button[type="submit"]`,
            text: (btn.textContent || '').trim(),
            isSafe: true,
          };
        }

        forms.push({
          id: formId,
          selector: formSelector,
          fields,
          submitButton,
        });
      });

      return forms;
    });
  }
}

export async function crawlWebsite(
  startUrl: string,
  options: CrawlOptions,
  pageDriver: CrawlPageDriver | Page,
  onProgress?: (event: CrawlProgressEvent) => void
): Promise<CrawlGraph> {
  const crawler = new BfsCrawler(startUrl, options, onProgress);
  return crawler.crawl(pageDriver);
}
