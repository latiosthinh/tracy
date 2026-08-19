import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BfsCrawler, normalizeUrl, isSameOrigin, CrawlPageDriver } from './bfsCrawler';
import { CrawlProgressEvent } from './types';

describe('BfsCrawler helper functions', () => {
  it('normalizeUrl rejects non-http/https schemes', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('file:///etc/passwd')).toBeNull();
    expect(normalizeUrl('data:text/html,<h1>hi</h1>')).toBeNull();
    expect(normalizeUrl('mailto:test@example.com')).toBeNull();
    expect(normalizeUrl('http://localhost:3000/')).toBe('http://localhost:3000/');
    expect(normalizeUrl('https://example.com/app/')).toBe('https://example.com/app');
  });

  it('isSameOrigin correctly enforces hostname and port boundaries', () => {
    expect(isSameOrigin('https://example.com/sub/page', 'https://example.com')).toBe(true);
    expect(isSameOrigin('https://api.example.com/page', 'https://example.com')).toBe(false);
    expect(isSameOrigin('http://localhost:3000/items', 'http://localhost:3000')).toBe(true);
    expect(isSameOrigin('http://localhost:8080/items', 'http://localhost:3000')).toBe(false);
  });
});

describe('BfsCrawler execution', () => {
  let mockPages: Record<string, { html: string; title: string; elements: any[]; forms?: any[] }>;

  beforeEach(() => {
    mockPages = {
      'http://localhost:3000/': {
        title: 'Home Page',
        html: '<html><body><nav><a href="/about">About</a><a href="/pricing">Pricing</a><a href="https://external.com/out">External</a></nav></body></html>',
        elements: [
          { tagName: 'a', href: 'http://localhost:3000/about', text: 'About', selector: 'a[href="/about"]' },
          { tagName: 'a', href: 'http://localhost:3000/pricing', text: 'Pricing', selector: 'a[href="/pricing"]' },
          { tagName: 'a', href: 'https://external.com/out', text: 'External', selector: 'a[href="https://external.com/out"]' },
          { tagName: 'button', text: 'Logout', selector: 'button#logout', id: 'logout' }, // Dangerous, should be filtered
        ],
        forms: [],
      },
      'http://localhost:3000/about': {
        title: 'About Page',
        html: '<html><body><main><h1>About</h1><a href="/pricing">Pricing</a><a href="/">Home</a></main></body></html>',
        elements: [
          { tagName: 'a', href: 'http://localhost:3000/pricing', text: 'Pricing', selector: 'a[href="/pricing"]' },
          { tagName: 'a', href: 'http://localhost:3000/', text: 'Home', selector: 'a[href="/"]' },
        ],
        forms: [],
      },
      'http://localhost:3000/pricing': {
        title: 'Pricing Page',
        html: '<html><body><form id="contact-sales"><input name="email" type="email" /><button type="submit">Send</button></form></body></html>',
        elements: [
          { tagName: 'input', type: 'email', name: 'email', selector: 'input[name="email"]' },
          { tagName: 'button', type: 'submit', text: 'Send', selector: 'button[type="submit"]', isSubmit: true },
        ],
        forms: [
          {
            id: 'contact-sales',
            selector: 'form#contact-sales',
            fields: [{ name: 'email', type: 'email', selector: 'input[name="email"]' }],
            submitButton: { tagName: 'button', text: 'Send', selector: 'button[type="submit"]' },
          },
        ],
      },
    };
  });

  function createMockDriver(): CrawlPageDriver {
    let currentUrl = 'http://localhost:3000/';

    return {
      goto: vi.fn(async (url: string) => {
        currentUrl = url;
      }),
      content: vi.fn(async () => {
        const page = mockPages[currentUrl] || { html: '<html><body>Empty</body></html>' };
        return page.html;
      }),
      url: () => currentUrl,
      title: vi.fn(async () => {
        const page = mockPages[currentUrl] || { title: 'Not Found' };
        return page.title;
      }),
      evaluate: vi.fn(async (fn: any) => {
        const page = mockPages[currentUrl] || { elements: [], forms: [] };
        // If the evaluate is extracting forms:
        const fnStr = fn.toString();
        if (fnStr.includes('querySelectorAll(\'form\')')) {
          return page.forms || [];
        }
        // Extract interactive elements:
        return page.elements || [];
      }),
    };
  }

  it('explores within origin boundary and ignores external links', async () => {
    const driver = createMockDriver();
    const crawler = new BfsCrawler('http://localhost:3000/', { maxDepth: 2, maxPages: 10 });
    const graph = await crawler.crawl(driver);

    expect(graph.nodes.size).toBe(3);
    const urls = Array.from(graph.nodes.values()).map((n) => n.url);
    expect(urls).toContain('http://localhost:3000/');
    expect(urls).toContain('http://localhost:3000/about');
    expect(urls).toContain('http://localhost:3000/pricing');
    expect(urls.some((u) => u.includes('external.com'))).toBe(false);
  });

  it('breaks cycles with (normalizedUrl, skeletonHash) state tracking', async () => {
    const driver = createMockDriver();
    const crawler = new BfsCrawler('http://localhost:3000/', { maxDepth: 5, maxPages: 10 });
    const graph = await crawler.crawl(driver);

    // About links back to Home and Pricing, Pricing links to nowhere
    // Visited states shouldn't cause infinite loop
    expect(graph.nodes.size).toBe(3);
  });

  it('respects maxPages and maxDepth limits', async () => {
    const driver = createMockDriver();
    const crawler = new BfsCrawler('http://localhost:3000/', { maxDepth: 0, maxPages: 1 });
    const graph = await crawler.crawl(driver);

    expect(graph.nodes.size).toBe(1);
    expect(Array.from(graph.nodes.values())[0].url).toBe('http://localhost:3000/');
  });

  it('filters dangerous buttons from discovered interactive elements', async () => {
    const driver = createMockDriver();
    const crawler = new BfsCrawler('http://localhost:3000/', { maxDepth: 1 });
    const graph = await crawler.crawl(driver);

    const homeNode = Array.from(graph.nodes.values()).find((n) => n.url === 'http://localhost:3000/');
    expect(homeNode).toBeDefined();
    // Logout button should be filtered out by safety filter
    const logoutEl = homeNode?.interactiveElements.find((el) => el.id === 'logout');
    expect(logoutEl).toBeUndefined();
  });

  it('emits progress events across crawl lifecycle', async () => {
    const driver = createMockDriver();
    const progressEvents: CrawlProgressEvent[] = [];
    const crawler = new BfsCrawler(
      'http://localhost:3000/',
      { maxDepth: 2 },
      (ev) => progressEvents.push(ev)
    );

    await crawler.crawl(driver);

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents.some((e) => e.phase === 'discovering')).toBe(true);
    expect(progressEvents.some((e) => e.phase === 'complete')).toBe(true);
  });

  it('aborts cleanly when abort signal is triggered', async () => {
    const driver = createMockDriver();
    const crawler = new BfsCrawler('http://localhost:3000/', { maxDepth: 5 });
    crawler.abort();
    const graph = await crawler.crawl(driver);

    expect(graph.nodes.size).toBe(0);
  });
});
