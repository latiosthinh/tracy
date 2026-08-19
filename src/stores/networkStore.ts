import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { NetworkMockRule, CapturedRequestEntry, NetworkStoreState } from '@/src/types/network';

const MAX_REQUESTS = 1000;
const BATCH_FLUSH_INTERVAL_MS = 100;

// Internal batch buffer for high-frequency telemetry events
let pendingBatch: CapturedRequestEntry[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

function flushBatch(_getState: () => NetworkStoreState, setState: (fn: (state: NetworkStoreState) => void) => void) {
  if (pendingBatch.length === 0) return;
  const entriesToAdd = [...pendingBatch];
  pendingBatch = [];
  batchTimeout = null;

  setState((state) => {
    state.requests.push(...entriesToAdd);
    if (state.requests.length > MAX_REQUESTS) {
      state.requests = state.requests.slice(state.requests.length - MAX_REQUESTS);
    }
  });
}

export function queueIncomingRequest(
  entry: CapturedRequestEntry,
  getState: () => NetworkStoreState,
  setState: (fn: (state: NetworkStoreState) => void) => void
) {
  pendingBatch.push(entry);
  if (!batchTimeout) {
    batchTimeout = setTimeout(() => {
      flushBatch(getState, setState);
    }, BATCH_FLUSH_INTERVAL_MS);
  }
}

export function resetBatchBuffer() {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }
  pendingBatch = [];
}

export const useNetworkStore = create<NetworkStoreState>()(
  immer((set, get) => ({
    rules: [],
    requests: [],
    isInterceptionActive: true,
    filterText: '',
    selectedMethod: 'ALL',
    selectedRuleId: null,
    selectedRequestId: null,
    isHarModalOpen: false,

    addRule: (ruleInput: Omit<NetworkMockRule, 'id'>): string => {
      const id = 'rule_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      const newRule: NetworkMockRule = {
        ...ruleInput,
        id,
        enabled: ruleInput.enabled !== false,
        method: ruleInput.method || 'ALL',
        patternType: ruleInput.patternType || 'glob',
      };

      set((state) => {
        state.rules.push(newRule);
      });

      return id;
    },

    updateRule: (id: string, updates: Partial<NetworkMockRule>) => {
      set((state) => {
        const index = state.rules.findIndex((r) => r.id === id);
        if (index !== -1) {
          state.rules[index] = { ...state.rules[index], ...updates };
        }
      });
    },

    toggleRule: (id: string, enabled?: boolean) => {
      set((state) => {
        const rule = state.rules.find((r) => r.id === id);
        if (rule) {
          rule.enabled = enabled !== undefined ? enabled : !rule.enabled;
        }
      });
    },

    removeRule: (id: string) => {
      set((state) => {
        state.rules = state.rules.filter((r) => r.id !== id);
        if (state.selectedRuleId === id) {
          state.selectedRuleId = null;
        }
      });
    },

    setInterceptionActive: (active: boolean) => {
      set((state) => {
        state.isInterceptionActive = active;
      });
    },

    ingestCapturedRequests: (entries: CapturedRequestEntry[]) => {
      set((state) => {
        state.requests.push(...entries);
        if (state.requests.length > MAX_REQUESTS) {
          state.requests = state.requests.slice(state.requests.length - MAX_REQUESTS);
        }
      });
    },

    clearRequests: () => {
      resetBatchBuffer();
      set((state) => {
        state.requests = [];
        state.selectedRequestId = null;
      });
    },

    setFilterText: (filter: string) => {
      set((state) => {
        state.filterText = filter;
      });
    },

    setSelectedMethod: (method: string) => {
      set((state) => {
        state.selectedMethod = method;
      });
    },

    setSelectedRule: (id: string | null) => {
      set((state) => {
        state.selectedRuleId = id;
      });
    },

    setSelectedRequest: (id: string | null) => {
      set((state) => {
        state.selectedRequestId = id;
      });
    },

    setHarModalOpen: (open: boolean) => {
      set((state) => {
        state.isHarModalOpen = open;
      });
    },

    exportHar: async (): Promise<string | null> => {
      const requests = get().requests;
      if (requests.length === 0) return null;

      const harObj = {
        log: {
          version: '1.2',
          creator: { name: 'Tracy Network Manager', version: '4.0.0' },
          entries: requests.map((req) => ({
            startedDateTime: new Date(req.timestamp).toISOString(),
            time: req.durationMs || 0,
            request: {
              method: req.method,
              url: req.url,
              headers: Object.entries(req.requestHeaders || req.headers || {}).map(([name, value]) => ({ name, value })),
              postData: req.requestBody || req.postData ? { text: req.requestBody || req.postData } : undefined,
            },
            response: {
              status: req.status || req.response?.status || 200,
              statusText: 'OK',
              headers: Object.entries(req.responseHeaders || req.response?.headers || {}).map(([name, value]) => ({ name, value })),
              content: {
                size: req.sizeBytes || (req.responseBody ? req.responseBody.length : 0),
                mimeType: req.responseHeaders?.['content-type'] || 'application/json',
                text: req.responseBody || req.response?.body || '',
              },
            },
          })),
        },
      };

      return JSON.stringify(harObj, null, 2);
    },

    importHar: async (harJson: unknown): Promise<boolean> => {
      try {
        let parsed: any = harJson;
        if (typeof harJson === 'string') {
          parsed = JSON.parse(harJson);
        }

        if (!parsed?.log?.entries || !Array.isArray(parsed.log.entries)) {
          return false;
        }

        const newRules: NetworkMockRule[] = [];
        for (const entry of parsed.log.entries) {
          const req = entry.request;
          const res = entry.response;
          if (!req?.url) continue;

          newRules.push({
            id: 'har_rule_' + Math.random().toString(36).substring(2, 9),
            name: `HAR: ${req.method || 'GET'} ${req.url.split('?')[0]}`,
            url: req.url,
            patternType: 'exact',
            method: (req.method || 'GET').toUpperCase() as any,
            status: res?.status || 200,
            headers: (res?.headers || []).reduce((acc: Record<string, string>, h: any) => {
              acc[h.name.toLowerCase()] = h.value;
              return acc;
            }, {}),
            body: res?.content?.text || '',
            enabled: true,
          });
        }

        if (newRules.length > 0) {
          set((state) => {
            state.rules.push(...newRules);
          });
          return true;
        }

        return false;
      } catch {
        return false;
      }
    },
  }))
);
