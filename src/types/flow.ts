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
  | 'takeScreenshot';

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
}

export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

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
