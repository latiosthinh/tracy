import { create } from 'zustand';
import { UiSettings, DEFAULT_UI_SETTINGS, PRESET_COLOR_SCHEMES } from '@/src/types/uiSettings';
import { WorkspaceConfig, DevicePreset, ActiveTab } from '@/src/types/index';
import { DEFAULT_WORKSPACE_CONFIG } from '@/src/data/defaultFlows';
import { useUiStore } from '@/src/stores/uiStore';

interface SettingsState {
  // Navigation & Active Views (Delegated to uiStore for backward compatibility)
  currentView: 'studio' | 'projects';
  activeTab: ActiveTab;
  devicePreset: DevicePreset;
  browser: 'chromium' | 'firefox' | 'webkit';

  // Modals & Panels (Delegated to uiStore)
  isDocsOpen: boolean;
  isSettingsOpen: boolean;
  isProjectManagerModalOpen: boolean;
  isCreateFlowModalOpen: boolean;
  autoOpenCreateModal: boolean;

  // Inspector & Screenshots (Delegated to uiStore)
  inspectMode: boolean;
  recordMode: boolean;

  // Configurations
  uiSettings: UiSettings;
  workspaceConfig: WorkspaceConfig;
  defaultSaveLocation: string;

  // Actions
  setCurrentView: (view: 'studio' | 'projects') => void;
  setActiveTab: (tab: ActiveTab) => void;
  setDevicePreset: (preset: DevicePreset) => void;
  setBrowser: (browser: 'chromium' | 'firefox' | 'webkit') => void;
  setDefaultSaveLocation: (location: string) => void;

  setDocsOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setProjectManagerModalOpen: (open: boolean) => void;
  setCreateFlowModalOpen: (open: boolean) => void;
  setAutoOpenCreateModal: (open: boolean) => void;

  setInspectMode: (mode: boolean) => void;
  toggleInspectMode: () => void;
  setRecordMode: (mode: boolean) => void;
  toggleRecordMode: () => void;

  updateUiSettings: (settings: Partial<UiSettings>) => void;
  updateWorkspaceConfig: (config: Partial<WorkspaceConfig>) => void;
  applyThemeCssVars: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Mirror properties from uiStore
  get currentView() { return useUiStore.getState().currentView; },
  get activeTab() { return useUiStore.getState().activeTab; },
  get devicePreset() { return useUiStore.getState().devicePreset; },
  get browser() { return useUiStore.getState().browser; },

  get isDocsOpen() { return useUiStore.getState().isDocsOpen; },
  get isSettingsOpen() { return useUiStore.getState().isSettingsOpen; },
  get isProjectManagerModalOpen() { return useUiStore.getState().isProjectManagerModalOpen; },
  get isCreateFlowModalOpen() { return useUiStore.getState().isCreateFlowModalOpen; },
  get autoOpenCreateModal() { return useUiStore.getState().autoOpenCreateModal; },

  get inspectMode() { return useUiStore.getState().inspectMode; },
  get recordMode() { return useUiStore.getState().recordMode; },

  uiSettings: (() => {
    try {
      const saved = localStorage.getItem('tracy_ui_settings');
      if (saved) return { ...DEFAULT_UI_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load UI settings:', e);
    }
    return DEFAULT_UI_SETTINGS;
  })(),

  workspaceConfig: DEFAULT_WORKSPACE_CONFIG,
  defaultSaveLocation: (() => {
    try {
      return localStorage.getItem('tracy_default_save_location') || '';
    } catch {
      return '';
    }
  })(),

  setCurrentView: (view) => useUiStore.getState().setCurrentView(view),
  setActiveTab: (tab) => useUiStore.getState().setActiveTab(tab),
  setDevicePreset: (preset) => useUiStore.getState().setDevicePreset(preset),
  setBrowser: (browser) => useUiStore.getState().setBrowser(browser),

  setDefaultSaveLocation: (location) => {
    set({ defaultSaveLocation: location });
    try {
      localStorage.setItem('tracy_default_save_location', location);
    } catch (e) {
      console.error('Failed to save default location:', e);
    }
  },

  setDocsOpen: (open) => useUiStore.getState().setDocsOpen(open),
  setSettingsOpen: (open) => useUiStore.getState().setSettingsOpen(open),
  setProjectManagerModalOpen: (open) => useUiStore.getState().setProjectManagerModalOpen(open),
  setCreateFlowModalOpen: (open) => useUiStore.getState().setCreateFlowModalOpen(open),
  setAutoOpenCreateModal: (open) => useUiStore.getState().setAutoOpenCreateModal(open),

  setInspectMode: (mode) => useUiStore.getState().setInspectMode(mode),
  toggleInspectMode: () => useUiStore.getState().toggleInspectMode(),
  setRecordMode: (mode) => useUiStore.getState().setRecordMode(mode),
  toggleRecordMode: () => useUiStore.getState().toggleRecordMode(),

  updateUiSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.uiSettings, ...newSettings };
      try {
        localStorage.setItem('tracy_ui_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save UI settings:', e);
      }
      return { uiSettings: updated };
    });
    get().applyThemeCssVars();
  },

  updateWorkspaceConfig: (config) => {
    set((state) => ({ workspaceConfig: { ...state.workspaceConfig, ...config } }));
  },

  applyThemeCssVars: () => {
    const { uiSettings } = get();
    if (!uiSettings) return;
    const root = document.documentElement;
    const cs = uiSettings.colorScheme || PRESET_COLOR_SCHEMES[0];
    if (cs) {
      root.style.setProperty('--color-bg-primary', cs.bgPrimary || '#0c0a09');
      root.style.setProperty('--color-bg-secondary', cs.bgSecondary || '#1c1917');
      root.style.setProperty('--color-bg-card', cs.bgCard || '#292524');
      root.style.setProperty('--color-accent', cs.accent || '#f59e0b');
      root.style.setProperty('--color-accent-hover', cs.accentHover || '#d97706');
      root.style.setProperty('--color-text-primary', cs.textPrimary || '#f5f5f4');
      root.style.setProperty('--color-text-muted', cs.textMuted || '#a8a29e');
      root.style.setProperty('--color-border', cs.border || '#44403c');
    }

    if (uiSettings.theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }

    if (uiSettings.a11y?.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (uiSettings.a11y?.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  },
}));
