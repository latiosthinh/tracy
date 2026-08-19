import type { HttpMethod, AbortReason } from '@/src/types/flow';

export type PatternType = 'exact' | 'glob' | 'regex';

export interface NetworkMockRule {
  id?: string;
  name?: string;
  url: string; // glob, regex pattern string, or exact URL
  patternType?: PatternType;
  method?: HttpMethod;
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  contentType?: string;
  fixture?: string;
  delayMs?: number;
  abort?: boolean | AbortReason;
  abortReason?: string;
  times?: number;
  enabled?: boolean;
}

export interface CapturedRequestEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  mocked?: boolean;
  matchedRuleId?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  sizeBytes?: number;
  resourceType?: string;
  headers?: Record<string, string>;
  postData?: string;
  response?: {
    status: number;
    headers: Record<string, string>;
    body?: string;
    fromMock: boolean;
    durationMs: number;
  };
}

export interface NetworkStoreState {
  rules: NetworkMockRule[];
  requests: CapturedRequestEntry[];
  isInterceptionActive: boolean;
  filterText: string;
  selectedMethod: string;
  selectedRuleId: string | null;
  selectedRequestId: string | null;
  isHarModalOpen: boolean;

  // Actions
  addRule: (rule: Omit<NetworkMockRule, 'id'>) => string;
  updateRule: (id: string, updates: Partial<NetworkMockRule>) => void;
  toggleRule: (id: string, enabled?: boolean) => void;
  removeRule: (id: string) => void;
  setInterceptionActive: (active: boolean) => void;
  ingestCapturedRequests: (entries: CapturedRequestEntry[]) => void;
  clearRequests: () => void;
  setFilterText: (filter: string) => void;
  setSelectedMethod: (method: string) => void;
  setSelectedRule: (id: string | null) => void;
  setSelectedRequest: (id: string | null) => void;
  setHarModalOpen: (open: boolean) => void;
  exportHar: () => Promise<string | null>;
  importHar: (harJson: unknown) => Promise<boolean>;
}
