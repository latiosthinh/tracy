import type {
  CrawlNode,
  CrawlEdge,
  CrawlProgressEvent,
  DiscoveredFlow,
  CrawlOptions,
  InteractiveElement,
  CrawlActionType,
} from '@/electron/core/crawler/types';
import type { FlowFile } from '@/src/types/flow';

export type {
  CrawlNode,
  CrawlEdge,
  CrawlProgressEvent,
  DiscoveredFlow,
  CrawlOptions,
  InteractiveElement,
  CrawlActionType,
};

export type RouteCoverageStatus = 'covered' | 'partial' | 'unvisited';

export interface VisualizerNodeData extends Record<string, unknown> {
  label: string;
  url: string;
  pathname: string;
  title?: string;
  skeletonHash: string;
  coverageStatus: RouteCoverageStatus;
  matchedFlowNames: string[];
  interactiveCount: number;
  isCurrentCrawlTarget?: boolean;
  isTerminal?: boolean;
  visitedAt?: number;
}

export interface VisualizerEdgeData extends Record<string, unknown> {
  actionType: 'click' | 'navigate' | 'fill_submit';
  selector?: string;
  triggerText?: string;
  isTraversed?: boolean;
}

export interface FlowGenerationOptions {
  baseTitle?: string;
  maxPaths?: number;
}

export interface CrawlerStoreState {
  nodes: CrawlNode[];
  edges: CrawlEdge[];
  isCrawling: boolean;
  progress: CrawlProgressEvent | null;
  error: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  discoveredFlows: DiscoveredFlow[];
  maxNodesLimit: number;

  // Actions
  startCrawl: (startUrl: string, options?: CrawlOptions) => Promise<boolean>;
  stopCrawl: () => Promise<void>;
  handleProgressEvent: (event: CrawlProgressEvent) => void;
  addNode: (node: CrawlNode) => void;
  addEdge: (edge: CrawlEdge) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  generateFlowsForRoute: (nodeId: string) => Promise<DiscoveredFlow[]>;
  generateAllFlows: (options?: FlowGenerationOptions) => Promise<DiscoveredFlow[]>;
  resetGraph: () => void;
  syncCoverageWithFlows: (flows: FlowFile[]) => void;
}

