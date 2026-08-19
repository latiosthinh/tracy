import { ipcMain } from 'electron';
import { BfsCrawler, CrawlGraph } from '../core/crawler/bfsCrawler.js';
import { generateFlowsFromCrawlGraph } from '../core/crawler/flowGenerator.js';
import type { CrawlOptions, DiscoveredFlow } from '../core/crawler/types.js';

let activeCrawler: BfsCrawler | null = null;
let lastCrawlGraph: CrawlGraph | null = null;

export function registerCrawlerHandlers(): void {
  ipcMain.handle(
    'start_crawl',
    async (
      event,
      { startUrl, options }: { startUrl: string; options?: CrawlOptions }
    ): Promise<{ ok: boolean; graph?: { nodeCount: number; edgeCount: number }; error?: string }> => {
      try {
        if (!startUrl || typeof startUrl !== 'string') {
          return { ok: false, error: 'Target start URL is required' };
        }

        // Validate scheme (mitigates T-18-04)
        if (!startUrl.startsWith('http://') && !startUrl.startsWith('https://')) {
          return { ok: false, error: 'Start URL must use http:// or https:// protocol' };
        }

        if (activeCrawler) {
          activeCrawler.abort();
          activeCrawler = null;
        }

        // Dynamically import playwrightEngine to use its browser context/page if needed
        const { getPlaywrightSession } = await import('./playwrightEngine.js');
        const session = await getPlaywrightSession();

        if (!session?.page) {
          return { ok: false, error: 'Playwright browser is not initialized. Please launch browser first.' };
        }

        const crawler = new BfsCrawler(startUrl, options || {}, (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('crawler_progress', progress);
          }
        });

        activeCrawler = crawler;
        const graph = await crawler.crawl(session.page);
        lastCrawlGraph = graph;
        activeCrawler = null;

        return {
          ok: true,
          graph: {
            nodeCount: graph.nodes.size,
            edgeCount: graph.edges.length,
          },
        };
      } catch (err: any) {
        activeCrawler = null;
        return {
          ok: false,
          error: err?.message || String(err),
        };
      }
    }
  );

  ipcMain.handle('stop_crawl', async () => {
    if (activeCrawler) {
      activeCrawler.abort();
      activeCrawler = null;
      return { ok: true, message: 'Crawler stopping...' };
    }
    return { ok: true, message: 'No active crawler running' };
  });

  ipcMain.handle(
    'generate_crawl_flows',
    async (
      _event,
      { baseTitle, maxPaths }: { baseTitle?: string; maxPaths?: number } = {}
    ): Promise<{ ok: boolean; flows: DiscoveredFlow[]; error?: string }> => {
      try {
        if (!lastCrawlGraph || lastCrawlGraph.nodes.size === 0) {
          return { ok: false, flows: [], error: 'No crawl graph available. Please run a crawl first.' };
        }

        const flows = generateFlowsFromCrawlGraph(lastCrawlGraph, {
          baseTitle,
          maxPaths,
        });

        return { ok: true, flows };
      } catch (err: any) {
        return { ok: false, flows: [], error: err?.message || String(err) };
      }
    }
  );
}
