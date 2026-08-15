import { create } from 'zustand';
import { DetectedAgent, tracyApi } from '@/src/lib/ipc';

interface AgentState {
  detectedAgents: DetectedAgent[];
  isScanning: boolean;
  scanAgents: () => Promise<void>;
}

export const useAgentStore = create<AgentState>((set) => ({
  detectedAgents: [],
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
}));
