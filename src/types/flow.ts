import type { TestRunResult } from '@/src/types/execution';

export type CommandType =
  | 'navigate'
  | 'leftClick'
  | 'doubleClick'
  | 'rightClick'
  | 'hover'
  | 'tap'
  | 'twoFingersTap'
  | 'fill'
  | 'eraseText'
  | 'press'
  | 'waitFor'
  | 'selectOption'
  | 'uploadFile'
  | 'assertVisible'
  | 'assertNotVisible'
  | 'assertTitle'
  | 'assertUrl'
  | 'assertTrue'
  | 'scroll'
  | 'scrollUntilVisible'
  | 'waitForNetwork'
  | 'interceptNetwork'
  | 'copyTextFrom'
  | 'clearCookies'
  | 'clearStorage'
  | 'setViewport'
  | 'runFlow'
  | 'evalScript'
  | 'wait'
  | 'takeScreenshot'
  | 'mockRoute'
  | 'unmockRoute'
  | 'recordHar'
  | 'replayHar'
  | 'assertRequest';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL';

export type AbortReason = 'failed' | 'timedout' | 'connectionreset' | 'accessdenied' | 'blockedbyclient';

export interface NetworkMockRule {
  id?: string;
  url: string; // glob, regex pattern string, or exact URL
  method?: HttpMethod;
  status?: number;
  headers?: Record<string, string>;
  body?: any;
  contentType?: string;
  fixture?: string; // Path to fixture JSON or raw file
  delayMs?: number;
  abort?: boolean | AbortReason;
  times?: number; // Max number of times to match before falling back
}

export type RouteMockOptions = NetworkMockRule;

export interface HarReplayOptions {
  path: string;
  notFound?: 'fallback' | 'abort';
  url?: string;
}

export interface AssertRequestStep {
  url: string;
  method?: HttpMethod;
  count?: number; // Exact count (default: >= 1)
  minCount?: number;
  maxCount?: number;
  queryParams?: Record<string, string>;
  bodyPattern?: string | Record<string, any>;
}

export interface YamlStep {
  action?: string;
  command?: CommandType | string;
  selector?: string;
  text?: string;
  key?: string;
  value?: string;
  timeout?: number;
  navigate?: string;
  fill?: string;
  leftClick?: boolean | string;
  rightClick?: boolean | string;
  waitFor?: string | number;
  [key: string]: any;
}

export type SelectorType = 'testId' | 'role' | 'text' | 'id' | 'css' | 'label' | 'placeholder' | 'altText' | 'xpath';

export interface SelectorRule {
  type: SelectorType;
  value: string;
  name?: string;
  role?: string;
  exact?: boolean;
  contains?: boolean;
  within?: string;
  index?: number;
}

export interface FlowMetadata {
  url?: string;
  tags?: string[];
  env?: Record<string, string>;
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: { width: number; height: number };
  device?: string;
  timeout?: number;
  retries?: number;
  continueOnFailure?: boolean;
  video?: boolean;
  trace?: boolean;
  mocks?: NetworkMockRule[];
  har?: HarReplayOptions;
}

export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface HealMetadata {
  healed: boolean;
  strategy?: 'heuristic' | 'ai';
  originalSelector: string;
  healedSelector: string;
  confidence: number;
  reason?: string;
  artifacts?: {
    screenshotPath?: string;
    domSnapshotPath?: string;
  };
}

export interface FlowStep {
  id: string;
  command: CommandType;
  target?: string | SelectorRule;
  value?: string;
  args?: Record<string, any>;
  timeout?: number;
  optional?: boolean;
  status: StepStatus;
  durationMs?: number;
  errorMessage?: string;
  screenshotUrl?: string;
  retriesLeft?: number;
  lineNumber?: number;
  rawYaml?: string;
  healResult?: HealMetadata;
}

export type FlowCategory = 'E2E' | 'API' | 'Smoke' | 'Visual' | 'Component';

export interface FlowFile {
  id: string;
  name: string;
  path: string;
  category?: FlowCategory;
  yamlContent: string;
  metadata: FlowMetadata;
  steps: FlowStep[];
  tags: string[];
  lastRunResult?: TestRunResult;
}

export interface InspectedElement {
  tagName: string;
  text: string;
  id?: string;
  testId?: string;
  role?: string;
  label?: string;
  placeholder?: string;
  altText?: string;
  className?: string;
  rect: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
  suggestedSelectors: {
    type: SelectorType;
    value: string;
    description: string;
    rating: 'best' | 'recommended' | 'fallback' | 'fragile';
    yamlSnippet: string;
  }[];
}
