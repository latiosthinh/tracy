import { create } from 'zustand';
import { DetectedAgent, tracyApi } from '@/src/lib/ipc';

interface AgentState {
  detectedAgents: DetectedAgent[];
  selectedAgentId: string;
  isScanning: boolean;
  scanAgents: () => Promise<void>;
  setSelectedAgentId: (id: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  detectedAgents: [],
  selectedAgentId: '',
  isScanning: false,

  scanAgents: async () => {
    set({ isScanning: true });
    try {
      const agents = await tracyApi.scanAgents();
      set({ detectedAgents: agents, isScanning: false });
    } catch (err) {
      console.error('Failed to scan agent CLIs:', err);
      set({ isScanning: false });
    }
  },

  setSelectedAgentId: (id: string) => set({ selectedAgentId: id }),
}));
