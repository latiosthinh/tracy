import { create } from 'zustand';
import type { ActiveTab, DevicePreset } from '../types/ui';

interface UiState {
  currentView: 'studio' | 'projects';
  activeTab: ActiveTab;
  devicePreset: DevicePreset;
  browser: 'chromium' | 'firefox' | 'webkit';

  // Modals
  isDocsOpen: boolean;
  isSettingsOpen: boolean;
  isProjectManagerModalOpen: boolean;
  isCreateFlowModalOpen: boolean;
  autoOpenCreateModal: boolean;

  // Inspector & Mode Flags
  inspectMode: boolean;
  recordMode: boolean;

  // Actions
  setCurrentView: (view: 'studio' | 'projects') => void;
  setActiveTab: (tab: ActiveTab) => void;
  setDevicePreset: (preset: DevicePreset) => void;
  setBrowser: (browser: 'chromium' | 'firefox' | 'webkit') => void;

  setDocsOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setProjectManagerModalOpen: (open: boolean) => void;
  setCreateFlowModalOpen: (open: boolean) => void;
  setAutoOpenCreateModal: (open: boolean) => void;

  setInspectMode: (mode: boolean) => void;
  toggleInspectMode: () => void;
  setRecordMode: (mode: boolean) => void;
  toggleRecordMode: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentView: 'studio',
  activeTab: 'ai',
  devicePreset: 'Laptop 1280',
  browser: 'chromium',

  isDocsOpen: false,
  isSettingsOpen: false,
  isProjectManagerModalOpen: false,
  isCreateFlowModalOpen: false,
  autoOpenCreateModal: false,

  inspectMode: false,
  recordMode: false,

  setCurrentView: (view) => set({ currentView: view }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDevicePreset: (preset) => set({ devicePreset: preset }),
  setBrowser: (browser) => set({ browser }),

  setDocsOpen: (open) => set({ isDocsOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setProjectManagerModalOpen: (open) => set({ isProjectManagerModalOpen: open }),
  setCreateFlowModalOpen: (open) => set({ isCreateFlowModalOpen: open }),
  setAutoOpenCreateModal: (open) => set({ autoOpenCreateModal: open }),

  setInspectMode: (mode) => set({ inspectMode: mode }),
  toggleInspectMode: () => set((state) => ({ inspectMode: !state.inspectMode })),
  setRecordMode: (mode) => set({ recordMode: mode }),
  toggleRecordMode: () => set((state) => ({ recordMode: !state.recordMode })),
}));
