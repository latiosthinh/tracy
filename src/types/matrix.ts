export type MatrixBrowserTarget = 'chromium' | 'firefox' | 'webkit';

export type MatrixWorkerStatus = 'idle' | 'queued' | 'running' | 'passed' | 'failed' | 'skipped';

export type MatrixWorkerState = 'idle' | 'busy' | 'recovering' | 'terminated';

export interface MatrixWorkerProgress {
  browser: MatrixBrowserTarget;
  status: MatrixWorkerStatus;
  currentStepIndex: number;
  totalSteps: number;
  currentStepName?: string;
  durationMs?: number;
  error?: string;
  passedCount: number;
  failedCount: number;
}

export interface MatrixExecutionSummary {
  flowId: string;
  flowName?: string;
  timestamp: number;
  browsers: Record<MatrixBrowserTarget, MatrixWorkerProgress>;
  overallStatus: 'passed' | 'failed' | 'running';
  durationMs: number;
  error?: string;
}

export interface MatrixStoreState {
  selectedBrowsers: MatrixBrowserTarget[];
  maxConcurrency: number;
  isMatrixRunning: boolean;
  activeMatrixRun: MatrixExecutionSummary | null;
  matrixHistory: MatrixExecutionSummary[];
  selectedBrowserDetail: MatrixBrowserTarget | null;

  // Actions
  toggleBrowser: (browser: MatrixBrowserTarget) => void;
  setBrowsers: (browsers: MatrixBrowserTarget[]) => void;
  setMaxConcurrency: (concurrency: number) => void;
  startMatrixRun: (flowId: string, flowName?: string, totalSteps?: number) => void;
  updateWorkerProgress: (browser: MatrixBrowserTarget, progress: Partial<MatrixWorkerProgress>) => void;
  completeMatrixRun: (summary: MatrixExecutionSummary) => void;
  cancelMatrixRun: () => void;
  setSelectedBrowserDetail: (browser: MatrixBrowserTarget | null) => void;
  clearHistory: () => void;
}
