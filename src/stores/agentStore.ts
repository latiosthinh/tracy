import { create } from 'zustand';
import { DetectedAgent, tracyApi } from '../lib/tauri';

interface AgentState {
  detectedAgents: DetectedAgent[];
  selectedAgentId: string;
  isScanning: boolean;
  scanAgents: () => Promise<void>;
  setSelectedAgentId: (id: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  detectedAgents: [],
  selectedAgentId: 'gemini-3.6-flash',
  isScanning: false,

  scanAgents: async () => {
    set({ isScanning: true });
    try {
      const agents = await tracyApi.scanAgents();
      set({ detectedAgents: agents, isScanning: false });
      // Default to first installed agent if current is not installed
      const current = agents.find((a) => a.id === useAgentStore.getState().selectedAgentId);
      if (!current || (!current.installed && current.category === 'local-cli')) {
        const firstInstalled = agents.find((a) => a.installed) || agents[0];
        if (firstInstalled) {
          set({ selectedAgentId: firstInstalled.id });
        }
      }
    } catch (err) {
      console.error('Failed to scan agent CLIs:', err);
      set({ isScanning: false });
    }
  },

  setSelectedAgentId: (id: string) => set({ selectedAgentId: id }),
}));
