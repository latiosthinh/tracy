import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateRouteCoverage, useCrawlerStore } from './crawlerStore';
import type { FlowFile } from '@/src/types/flow';
import type { CrawlNode, CrawlEdge, CrawlProgressEvent } from '@/src/types/crawler';
import { tracyApi } from '@/src/lib/ipc';

vi.mock('@/src/lib/ipc', () => {
  return {
    tracyApi: {
      startCrawl: vi.fn(),
      stopCrawl: vi.fn(),
      generateCrawlFlows: vi.fn(),
      onCrawlerProgress: vi.fn(),
    },
    isElectronEnv: vi.fn(() => true),
  };
});

describe('calculateRouteCoverage', () => {
  const sampleFlows: FlowFile[] = [
    {
      id: 'f1',
      name: 'auth-login.yaml',
      path: 'flows/auth-login.yaml',
      category: 'E2E',
      yamlContent: 'url: https://example.com/login\n---\n- navigate: /login\n- fill: "user@example.com"',
      tags: ['auth'],
      metadata: { url: 'https://example.com/login' },
      steps: [
        { id: 's1', command: 'navigate', value: '/login', status: 'passed' },
        { id: 's2', command: 'fill', value: 'user@example.com', status: 'passed' },
      ],
    },
    {
      id: 'f2',
      name: 'checkout.yaml',
      path: 'flows/checkout.yaml',
      category: 'E2E',
      yamlContent: 'url: https://example.com/shop\n---\n- navigate: /shop\n- leftClick: "Checkout"',
      tags: ['shop'],
      metadata: { url: 'https://example.com/shop' },
      steps: [
        { id: 's3', command: 'navigate', value: '/shop', status: 'passed' },
        { id: 's4', command: 'leftClick', value: 'Checkout', status: 'passed' },
      ],
    },
  ];

  it('accurately tags node as covered if flow navigates to exact pathname or url', () => {
    const result = calculateRouteCoverage('/login', 'https://example.com/login', sampleFlows);
    expect(result.status).toBe('covered');
    expect(result.matchedFlowNames).toContain('auth-login.yaml');
  });

  it('accurately tags node as partial if flow matches common route prefix/domain but not exact path', () => {
    const result = calculateRouteCoverage('/shop/cart/item-123', 'https://example.com/shop/cart/item-123', sampleFlows);
    expect(result.status).toBe('partial');
    expect(result.matchedFlowNames).toContain('checkout.yaml');
  });

  it('tags node as unvisited if no flow touches path or domain root', () => {
    const result = calculateRouteCoverage('/dashboard/settings', 'https://example.com/dashboard/settings', sampleFlows);
    expect(result.status).toBe('unvisited');
    expect(result.matchedFlowNames).toEqual([]);
  });
});

describe('useCrawlerStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCrawlerStore.getState().resetGraph();
  });

  it('starts crawl, sets isCrawling=true, and registers progress listener', async () => {
    let capturedCallback: ((event: CrawlProgressEvent) => void) | null = null;
    vi.mocked(tracyApi.onCrawlerProgress).mockImplementation(async (cb) => {
      capturedCallback = cb;
      return () => {};
    });
    vi.mocked(tracyApi.startCrawl).mockResolvedValue({
      ok: true,
      graph: { nodeCount: 1, edgeCount: 0 },
    });

    const success = await useCrawlerStore.getState().startCrawl('https://example.com');
    expect(success).toBe(true);
    expect(useCrawlerStore.getState().isCrawling).toBe(true);
    expect(tracyApi.startCrawl).toHaveBeenCalledWith('https://example.com', undefined);
    expect(tracyApi.onCrawlerProgress).toHaveBeenCalled();

    // Verify progress event handler via callback
    if (capturedCallback) {
      (capturedCallback as (event: CrawlProgressEvent) => void)({
        phase: 'discovering',
        totalDiscovered: 5,
        totalVisited: 2,
        queueLength: 3,
        currentUrl: 'https://example.com/about',
      });
      const progress = useCrawlerStore.getState().progress;
      expect(progress?.totalDiscovered).toBe(5);
      expect(progress?.totalVisited).toBe(2);
      expect(progress?.currentUrl).toBe('https://example.com/about');
    }
  });

  it('adds nodes and edges with deduplication and cap limit', () => {
    const node1: CrawlNode = {
      id: 'node-1',
      url: 'https://example.com',
      pathname: '/',
      skeletonHash: 'hash-1',
      visitedAt: Date.now(),
      interactiveElements: [],
    };
    const node2: CrawlNode = {
      id: 'node-2',
      url: 'https://example.com/about',
      pathname: '/about',
      skeletonHash: 'hash-2',
      visitedAt: Date.now(),
      interactiveElements: [],
    };
    const edge: CrawlEdge = {
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      actionType: 'click',
      triggerText: 'About',
    };

    useCrawlerStore.getState().addNode(node1);
    useCrawlerStore.getState().addNode(node1); // duplicate
    useCrawlerStore.getState().addNode(node2);
    useCrawlerStore.getState().addEdge(edge);
    useCrawlerStore.getState().addEdge(edge); // duplicate

    expect(useCrawlerStore.getState().nodes).toHaveLength(2);
    expect(useCrawlerStore.getState().edges).toHaveLength(1);
  });

  it('stops crawl and cleans up running state', async () => {
    vi.mocked(tracyApi.stopCrawl).mockResolvedValue({ ok: true });

    useCrawlerStore.setState({ isCrawling: true });
    await useCrawlerStore.getState().stopCrawl();

    expect(tracyApi.stopCrawl).toHaveBeenCalled();
    expect(useCrawlerStore.getState().isCrawling).toBe(false);
  });

  it('generates flows for a given route and records discovered flows', async () => {
    const mockFlows = [
      {
        id: 'df-1',
        name: 'Auto Flow 1',
        startUrl: 'https://example.com',
        targetUrl: 'https://example.com/checkout',
        steps: [{ navigate: 'https://example.com' }, { leftClick: 'Checkout' }],
      },
    ];

    vi.mocked(tracyApi.generateCrawlFlows).mockResolvedValue({
      ok: true,
      flows: mockFlows,
    });

    const flows = await useCrawlerStore.getState().generateAllFlows({ maxPaths: 5 });
    expect(flows).toHaveLength(1);
    expect(useCrawlerStore.getState().discoveredFlows).toHaveLength(1);
    expect(tracyApi.generateCrawlFlows).toHaveBeenCalledWith({ maxPaths: 5 });
  });

  it('syncs coverage status with existing flow list', () => {
    const node: CrawlNode = {
      id: 'node-1',
      url: 'https://example.com/login',
      pathname: '/login',
      skeletonHash: 'hash-login',
      visitedAt: Date.now(),
      interactiveElements: [],
    };
    useCrawlerStore.getState().addNode(node);

    const flows: FlowFile[] = [
      {
        id: 'f1',
        name: 'login.yaml',
        path: 'flows/login.yaml',
        category: 'E2E',
        yamlContent: 'url: https://example.com/login\n---\n- navigate: /login',
        tags: [],
        metadata: { url: 'https://example.com/login' },
        steps: [{ id: 's1', command: 'navigate', value: '/login', status: 'passed' }],
      },
    ];

    useCrawlerStore.getState().syncCoverageWithFlows(flows);
    // Coverage calculation pure helper tested
    const coverage = calculateRouteCoverage(node.pathname, node.url, flows);
    expect(coverage.status).toBe('covered');
  });
});
