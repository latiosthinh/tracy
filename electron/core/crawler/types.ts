import { YamlStep } from '@/src/types/flow';

export interface InteractiveElement {
  tagName: string;
  type?: string;
  role?: string;
  selector: string;
  text?: string;
  isSafe: boolean;
  href?: string;
  formId?: string;
  isSubmit?: boolean;
  name?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
  title?: string;
}

export interface CrawlNode {
  id: string; // url + '#' + skeletonHash
  url: string;
  pathname: string;
  title?: string;
  skeletonHash: string;
  visitedAt: number;
  interactiveElements: InteractiveElement[];
  isTerminal?: boolean;
}

export type CrawlActionType = 'click' | 'navigate' | 'fill_submit';

export interface CrawlEdge {
  sourceNodeId: string;
  targetNodeId: string;
  actionType: CrawlActionType;
  selector?: string;
  triggerText?: string;
}

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  originBoundary?: boolean | string;
  allowedPaths?: RegExp[];
  blockedPaths?: RegExp[];
  fillForms?: boolean;
  timeoutMs?: number;
}

export interface CrawlProgressEvent {
  phase: 'discovering' | 'interacting' | 'submitting' | 'complete' | 'error';
  currentNodeId?: string;
  totalDiscovered: number;
  totalVisited: number;
  queueLength: number;
  currentUrl?: string;
  message?: string;
}

export interface DiscoveredFlow {
  id: string;
  name: string;
  description?: string;
  steps: YamlStep[];
  startUrl: string;
  targetUrl: string;
}
