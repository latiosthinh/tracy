import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CrawlerControlOverlay } from './CrawlerControlOverlay';
import { NodeActionModal } from './NodeActionModal';
import { useCrawlerStore } from '@/src/stores/crawlerStore';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';
import { useUiStore } from '@/src/stores/uiStore';
import type { CrawlNode, CrawlProgressEvent, DiscoveredFlow } from '@/src/types/crawler';

describe('CrawlerControlOverlay', () => {
  beforeEach(() => {
    useCrawlerStore.getState().resetGraph();
    useProjectStore.setState({
      projects: [
        {
          id: 'proj_1',
          name: 'Demo App',
          description: '',
          targetUrl: 'http://localhost:3000',
          environment: 'local',
          tags: [],
          createdAt: '',
          updatedAt: '',
          lastRunStatus: 'NEVER_RUN',
          lastRunTime: '',
          flows: [],
        },
      ],
      activeProjectId: 'proj_1',
      activeFlowId: '',
    });
  });

  it('renders idle controls with default target URL, max pages, and start button', () => {
    render(<CrawlerControlOverlay />);
    expect(screen.getByDisplayValue('http://localhost:3000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Route Crawl/i })).toBeInTheDocument();
  });

  it('displays crawling ticker, metric chips, and stop button when isCrawling is true', () => {
    const progress: CrawlProgressEvent = {
      phase: 'discovering',
      totalDiscovered: 12,
      totalVisited: 4,
      queueLength: 8,
      currentUrl: 'http://localhost:3000/pricing',
      message: 'Discovering elements...',
    };

    useCrawlerStore.setState({
      isCrawling: true,
      progress,
    });

    render(<CrawlerControlOverlay />);
    expect(screen.getByText('http://localhost:3000/pricing')).toBeInTheDocument();
    expect(screen.getByText(/Visited: 4 \/ 12/i)).toBeInTheDocument();
    expect(screen.getByText(/Queue: 8/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stop Crawl/i })).toBeInTheDocument();
  });

  it('calls startCrawl when start button is clicked', async () => {
    const startCrawlSpy = vi.fn().mockResolvedValue(true);
    useCrawlerStore.setState({ startCrawl: startCrawlSpy });

    render(<CrawlerControlOverlay />);
    const startBtn = screen.getByRole('button', { name: /Start Route Crawl/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(startCrawlSpy).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({ maxPages: 25, maxDepth: 3, originBoundary: true })
      );
    });
  });

  it('calls stopCrawl when stop button is clicked', async () => {
    const stopCrawlSpy = vi.fn().mockResolvedValue(undefined);
    useCrawlerStore.setState({ isCrawling: true, stopCrawl: stopCrawlSpy });

    render(<CrawlerControlOverlay />);
    const stopBtn = screen.getByRole('button', { name: /Stop Crawl/i });
    fireEvent.click(stopBtn);

    await waitFor(() => {
      expect(stopCrawlSpy).toHaveBeenCalled();
    });
  });
});

describe('NodeActionModal', () => {
  const mockNode: CrawlNode = {
    id: 'node_checkout',
    url: 'http://localhost:3000/checkout',
    pathname: '/checkout',
    title: 'Checkout Page',
    skeletonHash: 'sk_checkout_123',
    visitedAt: Date.now(),
    interactiveElements: [
      {
        selector: 'button#pay-now',
        tagName: 'button',
        type: 'submit',
        text: 'Pay Now',
        isSafe: true,
      },
    ],
  };

  beforeEach(() => {
    useCrawlerStore.getState().resetGraph();
    useCrawlerStore.getState().addNode(mockNode);
    useCrawlerStore.getState().setSelectedNode('node_checkout');

    useProjectStore.setState({
      projects: [
        {
          id: 'proj_1',
          name: 'Demo App',
          description: '',
          targetUrl: 'http://localhost:3000',
          environment: 'local',
          tags: [],
          createdAt: '',
          updatedAt: '',
          lastRunStatus: 'NEVER_RUN',
          lastRunTime: '',
          flows: [
            {
              id: 'flow_checkout_1',
              name: 'Checkout Flow',
              path: 'flows/checkout.yaml',
              tags: [],
              metadata: { url: 'http://localhost:3000/checkout' },
              yamlContent: '# checkout\n- navigate: /checkout',
              steps: [{ id: 's1', command: 'navigate', value: '/checkout', status: 'pending' }],
            },
          ],
        },
      ],
      activeProjectId: 'proj_1',
      activeFlowId: 'flow_checkout_1',
    });
  });

  it('renders route details, interactive elements summary, and matched existing flows', () => {
    render(<NodeActionModal />);
    expect(screen.getByText('/checkout')).toBeInTheDocument();
    expect(screen.getByText('Checkout Page')).toBeInTheDocument();
    expect(screen.getByText(/sk_checkout_123/)).toBeInTheDocument();
    expect(screen.getByText('Pay Now')).toBeInTheDocument();
    expect(screen.getByText('Checkout Flow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Flow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Synthesize Flow for Route/i })).toBeInTheDocument();
  });

  it('triggers flow execution when Run Flow button is clicked', () => {
    const startExecutionSpy = vi.fn();
    useExecutionStore.setState({ startExecution: startExecutionSpy });

    render(<NodeActionModal />);
    const runBtn = screen.getByRole('button', { name: /Run Flow/i });
    fireEvent.click(runBtn);

    expect(startExecutionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'flow_checkout_1' }),
      'http://localhost:3000'
    );
    expect(useUiStore.getState().activeTab).toBe('timeline');
  });

  it('synthesizes new flow and adds to project when synthesize button is clicked', async () => {
    const mockDiscoveredFlow: DiscoveredFlow = {
      id: 'disc_1',
      name: 'Journey to Checkout',
      startUrl: 'http://localhost:3000/',
      targetUrl: 'http://localhost:3000/checkout',
      steps: [
        { navigate: '/checkout' },
        { leftClick: 'button#pay-now' },
      ],
    };

    const generateFlowsSpy = vi.fn().mockResolvedValue([mockDiscoveredFlow]);
    useCrawlerStore.setState({ generateFlowsForRoute: generateFlowsSpy });

    render(<NodeActionModal />);
    const synthBtn = screen.getByRole('button', { name: /Synthesize Flow for Route/i });
    fireEvent.click(synthBtn);

    await waitFor(() => {
      expect(generateFlowsSpy).toHaveBeenCalledWith('node_checkout');
      const activeProj = useProjectStore.getState().getActiveProject();
      expect(activeProj.flows.some((f) => f.yamlContent.includes('Journey to Checkout'))).toBe(true);
      expect(useUiStore.getState().activeTab).toBe('editor');
    });
  });
});
