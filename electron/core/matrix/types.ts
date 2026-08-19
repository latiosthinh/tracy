export type MatrixBrowserTarget = 'chromium' | 'firefox' | 'webkit';

export interface WorkerPoolOptions {
  maxWorkers?: number;
  headless?: boolean;
  defaultTimeoutMs?: number;
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;
  locale?: string;
  timezoneId?: string;
}

export interface MatrixTask<TFlow = any> {
  id: string;
  flow: TFlow;
  flowPath?: string;
  browser: MatrixBrowserTarget;
}

export interface MatrixTaskStepResult {
  index: number;
  command: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
  skippedReason?: string;
}

export interface MatrixTaskResult {
  taskId: string;
  browser: MatrixBrowserTarget;
  flowName: string;
  flowPath?: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  steps: MatrixTaskStepResult[];
  error?: string;
  artifacts?: {
    screenshotPath?: string;
    tracePath?: string;
  };
}

export type MatrixWorkerState = 'idle' | 'busy' | 'recovering' | 'terminated';
