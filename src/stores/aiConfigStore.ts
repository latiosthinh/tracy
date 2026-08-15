// AI config Zustand store — selected agent, per-agent model/key/endpoint; IPC-persisted.
// Replaces selectedAgentId / setSelectedAgentId from agentStore.

import { create } from 'zustand';
import { tracyApi } from '@/src/lib/ipc';
import { isValidModelId } from '@/src/lib/aiRegistry';

interface AiConfigState {
  loaded: boolean;
  selectedAgentId: string;
  agentModels: Record<string, string>;
  agentCredentials: Record<string, { apiKey?: string; customEndpoint?: string }>;

  loadFromDisk: () => Promise<void>;
  selectAgent: (id: string) => void;
  setModel: (agentId: string, model: string) => void;
  setCredential: (
    agentId: string,
    creds: { apiKey?: string; customEndpoint?: string },
  ) => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const s = useAiConfigStore.getState();
    tracyApi.saveAiConfig({
      selectedAgentId: s.selectedAgentId,
      agentModels: s.agentModels,
      agentCredentials: s.agentCredentials,
    }).catch(console.error);
    persistTimer = null;
  }, 300);
}

export const useAiConfigStore = create<AiConfigState>((set, get) => ({
  loaded: false,
  selectedAgentId: '',
  agentModels: {},
  agentCredentials: {},

  loadFromDisk: async () => {
    if (get().loaded) return;
    try {
      const cfg = await tracyApi.loadAiConfig();
      if (cfg) {
        set({
          selectedAgentId: cfg.selectedAgentId || '',
          agentModels: cfg.agentModels || {},
          agentCredentials: cfg.agentCredentials || {},
          loaded: true,
        });
      } else {
        // Browser mode: no disk config available → mark as loaded
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  selectAgent: (id: string) => {
    set({ selectedAgentId: id });
    schedulePersist();
  },

  setModel: (agentId: string, model: string) => {
    if (!isValidModelId(model)) return;
    set((state) => ({
      agentModels: { ...state.agentModels, [agentId]: model },
    }));
    schedulePersist();
  },

  setCredential: (agentId: string, creds: { apiKey?: string; customEndpoint?: string }) => {
    set((state) => {
      const existing = state.agentCredentials[agentId] || {};
      const merged: typeof existing = {};
      if (creds.apiKey !== undefined) merged.apiKey = creds.apiKey;
      if (creds.customEndpoint !== undefined) merged.customEndpoint = creds.customEndpoint;
      return {
        agentCredentials: { ...state.agentCredentials, [agentId]: { ...existing, ...merged } },
      };
    });
    schedulePersist();
  },
}));
