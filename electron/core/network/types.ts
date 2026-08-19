import type { HttpMethod, AbortReason } from '@/src/types/flow';

export type { HttpMethod, AbortReason };

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

export interface CapturedRequestEntry {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  resourceType: string;
  timestamp: number;
  matchedRuleId?: string;
  response?: {
    status: number;
    headers: Record<string, string>;
    body?: string;
    fromMock: boolean;
    durationMs: number;
  };
}

export interface NetworkManagerOptions {
  workspaceRoot?: string;
  maxCapturedRequests?: number;
}

export interface HarRecordOptions {
  path: string;
  urlFilter?: string | RegExp;
}

export interface HarReplayOptions {
  path: string;
  notFound?: 'fallback' | 'abort';
  url?: string;
}

export interface AssertRequestCriteria {
  url: string;
  method?: HttpMethod;
  count?: number;
  minCount?: number;
  maxCount?: number;
  queryParams?: Record<string, string>;
  bodyPattern?: string | Record<string, any>;
}

export interface AssertRequestResult {
  matched: boolean;
  count: number;
  error?: string;
}
