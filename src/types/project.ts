import type { FlowFile } from '@/src/types/flow';

export interface MinedPageData {
  url: string;
  path: string;
  timestamp: string;
  tree: string;
  stats: {
    totalNodes: number;
    interactiveNodes: number;
    textHolders: number;
    visibleNodes: number;
  };
}

export interface WorkspaceConfig {
  flows: string[];
  testOutputDir: string;
  browser: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
  retries: number;
  continueOnFailure: boolean;
  env: Record<string, string>;
  testIdAttribute: string;
  parallel: number;
  reportFormat: 'console' | 'html' | 'json' | 'junit';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  targetUrl: string;
  environment: 'staging' | 'production' | 'local' | 'development';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  flows: FlowFile[];
  config?: Partial<WorkspaceConfig>;
  lastRunStatus?: 'PASSED' | 'FAILED' | 'NEVER_RUN';
  lastRunTime?: string;
  passRate?: number;
  saveLocation?: string;
  domSnapshots?: Record<string, MinedPageData>;
}
