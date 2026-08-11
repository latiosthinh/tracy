import type { FlowStep } from './flow';

export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'debug' | 'warn' | 'error' | 'assertion' | 'network';
  stepIndex?: number;
  message: string;
  details?: any;
}

export interface TestRunResult {
  id: string;
  flowId: string;
  flowName: string;
  timestamp: string;
  durationMs: number;
  status: 'PASSED' | 'FAILED' | 'RUNNING' | 'CANCELLED';
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  totalCount: number;
  steps: FlowStep[];
  logs: ExecutionLog[];
  artifacts: {
    screenshots: { name: string; url: string; timestamp: string }[];
    videoUrl?: string;
    traceZipUrl?: string;
    harNetworkUrl?: string;
  };
}
