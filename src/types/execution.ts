import type { FlowStep } from '@/src/types/flow';

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
  status: 'PASSED' | 'FAILED' | 'RUNNING' | 'CANCELLED' | 'PAUSED';
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  healedCount?: number;
  totalCount: number;
  steps: FlowStep[];
  logs: ExecutionLog[];
  artifacts: {
    screenshots: { name: string; url: string; timestamp: string }[];
    videoUrl?: string;
    traceZipUrl?: string;
    harNetworkUrl?: string;
    healArtifacts?: { stepIndex: number; screenshotPath?: string; domSnapshotPath?: string }[];
  };
}
