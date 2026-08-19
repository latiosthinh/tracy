import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  CrawlNode,
  CrawlEdge,
  CrawlProgressEvent,
  DiscoveredFlow,
  CrawlOptions,
  FlowGenerationOptions,
  RouteCoverageStatus,
  CrawlerStoreState,
} from '@/src/types/crawler';
import type { FlowFile } from '@/src/types/flow';
import { tracyApi } from '@/src/lib/ipc';

const MAX_GRAPH_NODES = 500;

let unlistenProgress: (() => void) | null = null;

/**
 * Pure helper to calculate route coverage against active project flows.
 */
export function calculateRouteCoverage(
  pathname: string,
  url: string,
  existingFlows: FlowFile[]
): { status: RouteCoverageStatus; matchedFlowNames: string[] } {
  if (!existingFlows || existingFlows.length === 0) {
    return { status: 'unvisited', matchedFlowNames: [] };
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const matchedExact: string[] = [];
  const matchedPartial: string[] = [];

  for (const flow of existingFlows) {
    const flowName = flow.name || flow.id;
    let hasExact = false;
    let hasPrefix = false;

    // Check flow metadata URL
    if (flow.metadata?.url) {
      try {
        const parsed = new URL(flow.metadata.url, 'http://localhost');
        if (parsed.pathname === normalizedPath || flow.metadata.url === url) {
          hasExact = true;
        } else if (
          normalizedPath !== '/' &&
          parsed.pathname !== '/' &&
          (normalizedPath.startsWith(parsed.pathname) || parsed.pathname.startsWith(normalizedPath))
        ) {
          hasPrefix = true;
        }
      } catch {
        if (flow.metadata.url.includes(normalizedPath)) {
          hasExact = true;
        }
      }
    }

    // Check individual flow steps for navigation or URL references
    if (flow.steps && flow.steps.length > 0) {
      for (const step of flow.steps) {
        const stepVal = step.value || (typeof step.target === 'string' ? step.target : '');
        if (!stepVal) continue;

        if (step.command === 'navigate' || step.command === 'assertUrl') {
          if (stepVal === normalizedPath || stepVal === url) {
            hasExact = true;
            break;
          }
          if (
            normalizedPath !== '/' &&
            stepVal !== '/' &&
            (normalizedPath.startsWith(stepVal) || stepVal.startsWith(normalizedPath))
          ) {
            hasPrefix = true;
          }
        }
      }
    }

    if (hasExact) {
      matchedExact.push(flowName);
    } else if (hasPrefix) {
      matchedPartial.push(flowName);
    }
  }

  if (matchedExact.length > 0) {
    return { status: 'covered', matchedFlowNames: Array.from(new Set(matchedExact)) };
  }

  if (matchedPartial.length > 0) {
    return { status: 'partial', matchedFlowNames: Array.from(new Set(matchedPartial)) };
  }

  return { status: 'unvisited', matchedFlowNames: [] };
}

export const useCrawlerStore = create<CrawlerStoreState>()(
  immer((set, get) => ({
    nodes: [],
    edges: [],
    isCrawling: false,
    progress: null,
    error: null,
    selectedNodeId: null,
    selectedEdgeId: null,
    discoveredFlows: [],
    maxNodesLimit: MAX_GRAPH_NODES,

    startCrawl: async (startUrl: string, options?: CrawlOptions): Promise<boolean> => {
      // Clean up any stale listener
      if (unlistenProgress) {
        unlistenProgress();
        unlistenProgress = null;
      }

      set((state) => {
        state.isCrawling = true;
        state.error = null;
        state.progress = {
          phase: 'discovering',
          totalDiscovered: 0,
          totalVisited: 0,
          queueLength: 1,
          currentUrl: startUrl,
          message: 'Starting route crawl...',
        };
      });

      // Register live progress stream
      try {
        unlistenProgress = await tracyApi.onCrawlerProgress((event: CrawlProgressEvent) => {
          get().handleProgressEvent(event);
        });
      } catch (err: any) {
        console.warn('Failed to attach crawler progress listener:', err);
      }

      try {
        const result = await tracyApi.startCrawl(startUrl, options);
        if (!result.ok) {
          set((state) => {
            state.isCrawling = false;
            state.error = result.error || 'Crawler failed to initialize.';
          });
          if (unlistenProgress) {
            unlistenProgress();
            unlistenProgress = null;
          }
          return false;
        }
        return true;
      } catch (err: any) {
        set((state) => {
          state.isCrawling = false;
          state.error = err?.message || 'Crawler execution error.';
        });
        if (unlistenProgress) {
          unlistenProgress();
          unlistenProgress = null;
        }
        return false;
      }
    },

    stopCrawl: async (): Promise<void> => {
      try {
        await tracyApi.stopCrawl();
      } catch (err) {
        console.warn('Error invoking stopCrawl:', err);
      } finally {
        if (unlistenProgress) {
          unlistenProgress();
          unlistenProgress = null;
        }
        set((state) => {
          state.isCrawling = false;
          if (state.progress) {
            state.progress.phase = 'complete';
            state.progress.message = 'Crawl stopped by user.';
          }
        });
      }
    },

    handleProgressEvent: (event: CrawlProgressEvent) => {
      set((state) => {
        state.progress = event;
        if (event.phase === 'complete') {
          state.isCrawling = false;
        } else if (event.phase === 'error') {
          state.isCrawling = false;
          state.error = event.message || 'Crawl error encountered.';
        }
      });
    },

    addNode: (node: CrawlNode) => {
      set((state) => {
        if (state.nodes.length >= state.maxNodesLimit) return;
        const exists = state.nodes.some((n) => n.id === node.id);
        if (!exists) {
          state.nodes.push(node);
        }
      });
    },

    addEdge: (edge: CrawlEdge) => {
      set((state) => {
        const exists = state.edges.some(
          (e) =>
            e.sourceNodeId === edge.sourceNodeId &&
            e.targetNodeId === edge.targetNodeId &&
            e.actionType === edge.actionType &&
            e.selector === edge.selector
        );
        if (!exists) {
          state.edges.push(edge);
        }
      });
    },

    setSelectedNode: (nodeId: string | null) => {
      set((state) => {
        state.selectedNodeId = nodeId;
      });
    },

    setSelectedEdge: (edgeId: string | null) => {
      set((state) => {
        state.selectedEdgeId = edgeId;
      });
    },

    generateFlowsForRoute: async (nodeId: string): Promise<DiscoveredFlow[]> => {
      const targetNode = get().nodes.find((n) => n.id === nodeId);
      const title = targetNode ? `Route: ${targetNode.pathname}` : 'Target Route';
      const result = await tracyApi.generateCrawlFlows({ baseTitle: title, maxPaths: 3 });
      if (result.ok && result.flows) {
        set((state) => {
          state.discoveredFlows.push(...result.flows);
        });
        return result.flows;
      }
      return [];
    },

    generateAllFlows: async (options?: FlowGenerationOptions): Promise<DiscoveredFlow[]> => {
      const result = await tracyApi.generateCrawlFlows(options);
      if (result.ok && result.flows) {
        set((state) => {
          state.discoveredFlows = result.flows;
        });
        return result.flows;
      }
      return [];
    },

    resetGraph: () => {
      if (unlistenProgress) {
        unlistenProgress();
        unlistenProgress = null;
      }
      set((state) => {
        state.nodes = [];
        state.edges = [];
        state.isCrawling = false;
        state.progress = null;
        state.error = null;
        state.selectedNodeId = null;
        state.selectedEdgeId = null;
        state.discoveredFlows = [];
      });
    },

    syncCoverageWithFlows: (_flows: FlowFile[]) => {
      // Force trigger state reactivity when project flows change
      set((state) => {
        // Refresh nodes to trigger reactive re-computation
        state.nodes = [...state.nodes];
      });
    },
  }))
);
