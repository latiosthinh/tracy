export interface CliOptions {
  ci: boolean;
  heal: boolean;
  timeout: number;
  reporter: 'junit' | 'console' | 'json' | 'all';
  output: string;
  baseUrl?: string;
  headless: boolean;
  concurrency: number;
  browsers?: Array<'chromium' | 'firefox' | 'webkit'>;
  workers?: number;
  patchFile?: string;
  help: boolean;
  version: boolean;
  paths: string[];
}

export interface CliStepResult {
  index: number;
  command: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
  skippedReason?: string;
  healResult?: {
    healedSelector: string;
    confidence: number;
    explanation?: string;
    strategy?: string;
    [key: string]: unknown;
  };
}

export interface CliTestResult {
  flowPath: string;
  flowName: string;
  browser?: 'chromium' | 'firefox' | 'webkit';
  status: 'passed' | 'failed';
  durationMs: number;
  steps: CliStepResult[];
  error?: string;
  healedCount: number;
  artifacts?: {
    screenshotPath?: string;
    domSnapshotPath?: string;
  };
}

export interface CliMatrixResult {
  totalExecutions: number;
  passedExecutions: number;
  failedExecutions: number;
  skippedExecutions: number;
  totalDurationMs: number;
  browsers: Array<'chromium' | 'firefox' | 'webkit'>;
  flowResults: Map<string, Record<string, CliTestResult>>;
  results: CliTestResult[];
  startTime: string;
  endTime: string;
}

export interface CliSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  healedTests: number;
  totalDurationMs: number;
  results: CliTestResult[];
  startTime: string;
  endTime: string;
}

export interface Reporter {
  format(suite: CliSuiteResult, options: CliOptions): Promise<string> | string;
}
