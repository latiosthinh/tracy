import { Page } from 'playwright-core';
import { DOMCandidateElement } from './types';

/**
 * Extracts interactable DOM candidate elements from active Playwright Page.
 * Queries interactive buttons, links, inputs, selects, textareas, and test-id nodes.
 */
export async function extractLiveDOMCandidates(page: Page): Promise<DOMCandidateElement[]> {
  if (!page) return [];

  try {
    const candidates = await page.evaluate(() => {
      const selector = [
        'button',
        'a',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="textbox"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[onclick]',
        '[data-testid]',
        '[data-test]',
        '[data-cy]',
      ].join(',');

      const elements = Array.from(document.querySelectorAll(selector));
      const seen = new Set<Element>();
      const results: Array<{
        tagName: string;
        id?: string;
        testId?: string;
        ariaLabel?: string;
        role?: string;
        text?: string;
        selector?: string;
        path?: string;
        classes?: string[];
        attributes?: Record<string, string>;
        boundingBox?: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }> = [];

      for (const el of elements) {
        if (seen.has(el)) continue;
        seen.add(el);

        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();

        // Check computed visibility
        const style = window.getComputedStyle(htmlEl);
        const isHidden =
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          rect.width === 0 ||
          rect.height === 0;

        if (isHidden) continue;

        // Extract attributes
        const attributes: Record<string, string> = {};
        for (let i = 0; i < htmlEl.attributes.length; i++) {
          const attr = htmlEl.attributes[i];
          if (
            ['id', 'name', 'type', 'placeholder', 'title', 'value', 'href', 'role'].includes(attr.name) ||
            attr.name.startsWith('data-') ||
            attr.name.startsWith('aria-')
          ) {
            attributes[attr.name] = attr.value;
          }
        }

        const testId =
          htmlEl.getAttribute('data-testid') ||
          htmlEl.getAttribute('data-test') ||
          htmlEl.getAttribute('data-cy') ||
          undefined;

        const ariaLabel =
          htmlEl.getAttribute('aria-label') ||
          htmlEl.getAttribute('aria-labelledby') ||
          undefined;

        const text = (htmlEl.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 150);

        // Simple DOM path
        const buildPath = (node: HTMLElement): string => {
          const parts: string[] = [];
          let curr: HTMLElement | null = node;
          while (curr && curr.tagName && curr !== document.body) {
            let part = curr.tagName.toLowerCase();
            if (curr.id) {
              part += `#${curr.id}`;
              parts.unshift(part);
              break;
            } else if (curr.getAttribute('data-testid')) {
              part += `[data-testid="${curr.getAttribute('data-testid')}"]`;
              parts.unshift(part);
              break;
            } else if (curr.parentElement) {
              const siblings = Array.from(curr.parentElement.children).filter(
                (c) => c.tagName === curr!.tagName
              );
              if (siblings.length > 1) {
                const idx = siblings.indexOf(curr) + 1;
                part += `:nth-of-type(${idx})`;
              }
            }
            parts.unshift(part);
            curr = curr.parentElement;
          }
          return parts.join(' > ');
        };

        results.push({
          tagName: htmlEl.tagName.toLowerCase(),
          id: htmlEl.id || undefined,
          testId,
          ariaLabel,
          role: htmlEl.getAttribute('role') || undefined,
          text: text || undefined,
          path: buildPath(htmlEl),
          classes: Array.from(htmlEl.classList),
          attributes,
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        });
      }

      return results;
    });

    return candidates;
  } catch {
    return [];
  }
}

/**
 * Generates a compact indented HTML/DOM string representation for LLM context without
 * scripts, SVGs, or heavy styling.
 */
export async function captureCompactSnapshot(page: Page, maxNodes = 120): Promise<string> {
  if (!page) return '';

  try {
    const compactHtml = await page.evaluate((maxCount) => {
      const interactiveSelector = [
        'button',
        'a[href]',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="textbox"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[data-testid]',
        'form',
        'h1',
        'h2',
        'h3',
        'label',
      ].join(',');

      const nodes = Array.from(document.querySelectorAll(interactiveSelector)).slice(0, maxCount);
      const lines: string[] = [];

      for (const el of nodes) {
        const htmlEl = el as HTMLElement;
        const tag = htmlEl.tagName.toLowerCase();
        const testId = htmlEl.getAttribute('data-testid');
        const role = htmlEl.getAttribute('role');
        const id = htmlEl.id;
        const name = htmlEl.getAttribute('name');
        const type = htmlEl.getAttribute('type');
        const placeholder = htmlEl.getAttribute('placeholder');
        const ariaLabel = htmlEl.getAttribute('aria-label');
        const text = (htmlEl.innerText || htmlEl.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);

        const attrs: string[] = [];
        if (id) attrs.push(`id="${id}"`);
        if (testId) attrs.push(`data-testid="${testId}"`);
        if (role) attrs.push(`role="${role}"`);
        if (name) attrs.push(`name="${name}"`);
        if (type) attrs.push(`type="${type}"`);
        if (placeholder) attrs.push(`placeholder="${placeholder}"`);
        if (ariaLabel) attrs.push(`aria-label="${ariaLabel}"`);

        const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
        if (['input', 'img', 'br', 'hr'].includes(tag)) {
          lines.push(`<${tag}${attrStr} />`);
        } else {
          lines.push(`<${tag}${attrStr}>${text}</${tag}>`);
        }
      }

      return lines.join('\n');
    }, maxNodes);

    return compactHtml;
  } catch {
    return '';
  }
}
