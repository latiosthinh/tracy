import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouteCanvas } from './RouteCanvas';
import { useCrawlerStore } from '@/src/stores/crawlerStore';
import type { CrawlNode, CrawlEdge } from '@/src/types/crawler';

// Mock @xyflow/react components for jsdom compatibility
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ReactFlow: ({ nodes, edges, onNodeClick, onEdgeClick, children }: any) => (
      <div data-testid="react-flow-canvas">
        <div data-testid="nodes-list">
          {nodes.map((node: any) => (
            <button
              type="button"
              key={node.id}
              data-testid={`node-${node.id}`}
              onClick={() => onNodeClick?.({}, node)}
            >
              {node.data?.pathname || node.id}
            </button>
          ))}
        </div>
        <div data-testid="edges-list">
          {edges.map((edge: any) => (
            <button
              type="button"
              key={edge.id}
              data-testid={`edge-${edge.id}`}
              onClick={() => onEdgeClick?.({}, edge)}
            >
              {edge.data?.actionType || edge.id}
            </button>
          ))}
        </div>
        {children}
      </div>
    ),
    Background: () => <div data-testid="rf-background" />,
    Controls: () => <div data-testid="rf-controls" />,
    MiniMap: () => <div data-testid="rf-minimap" />,
    Handle: () => <div data-testid="rf-handle" />,
    useReactFlow: () => ({
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    }),
  };
});

describe('RouteCanvas', () => {
  const mockNodes: CrawlNode[] = [
    {
      id: 'node_root',
      url: 'http://localhost:3000/',
      pathname: '/',
      title: 'Home',
      skeletonHash: 'sk_1',
      visitedAt: Date.now(),
      interactiveElements: [],
    },
    {
      id: 'node_login',
      url: 'http://localhost:3000/login',
      pathname: '/login',
      title: 'Login',
      skeletonHash: 'sk_2',
      visitedAt: Date.now(),
      interactiveElements: [],
    },
  ];

  const mockEdges: CrawlEdge[] = [
    {
      sourceNodeId: 'node_root',
      targetNodeId: 'node_login',
      actionType: 'click',
      selector: '#login-btn',
      triggerText: 'Sign In',
    },
  ];

  beforeEach(() => {
    useCrawlerStore.getState().resetGraph();
    mockNodes.forEach((n) => useCrawlerStore.getState().addNode(n));
    mockEdges.forEach((e) => useCrawlerStore.getState().addEdge(e));
  });

  it('renders XYFlow canvas with mapped nodes and edges', () => {
    render(<RouteCanvas />);
    expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('node-node_root')).toHaveTextContent('/');
    expect(screen.getByTestId('node-node_login')).toHaveTextContent('/login');
    expect(screen.getByTestId('edge-edge-node_root-node_login-0')).toHaveTextContent('click');
  });

  it('updates selected node in crawlerStore when a node is clicked', () => {
    render(<RouteCanvas />);
    const nodeEl = screen.getByTestId('node-node_login');
    fireEvent.click(nodeEl);
    expect(useCrawlerStore.getState().selectedNodeId).toBe('node_login');
  });
});
