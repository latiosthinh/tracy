import { create } from 'zustand';
import type { ActiveTab, DevicePreset } from '@/src/types/ui';
import type { UiSettings } from '@/src/types/uiSettings';
import { DEFAULT_UI_SETTINGS, PRESET_COLOR_SCHEMES } from '@/src/types/uiSettings';
import type { WorkspaceConfig } from '@/src/types/project';
import { DEFAULT_WORKSPACE_CONFIG } from '@/src/data/defaultFlows';

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
  isCommandPaletteOpen: boolean;
  isShortcutsModalOpen: boolean;

  // Inspector & Mode Flags
  inspectMode: boolean;
  recordMode: boolean;

  // Split Layout
  splitOrientation: 'vertical' | 'horizontal';
  sidePanelWidth: number;
  sidePanelHeight: number;

  // Device Frame & Orientation
  deviceOrientation: 'portrait' | 'landscape';
  showDeviceBezel: boolean;

  // Page Color Scheme Emulation
  pageThemeEmulation: 'system' | 'dark' | 'light';

  // Settings (consolidated from settingsStore)
  uiSettings: UiSettings;
  workspaceConfig: WorkspaceConfig;
  defaultSaveLocation: string;

  // Navigation Actions
  setCurrentView: (view: 'studio' | 'projects') => void;
  setActiveTab: (tab: ActiveTab) => void;
  setDevicePreset: (preset: DevicePreset) => void;
  setBrowser: (browser: 'chromium' | 'firefox' | 'webkit') => void;

  // Split Layout Actions
  setSplitOrientation: (orientation: 'vertical' | 'horizontal') => void;
  toggleSplitOrientation: () => void;
  setSidePanelWidth: (width: number) => void;
  setSidePanelHeight: (height: number) => void;

  // Device Frame & Orientation Actions
  setDeviceOrientation: (orientation: 'portrait' | 'landscape') => void;
  toggleDeviceOrientation: () => void;
  setShowDeviceBezel: (show: boolean) => void;
  toggleDeviceBezel: () => void;

  // Page Color Scheme Emulation Actions
  setPageThemeEmulation: (theme: 'system' | 'dark' | 'light') => void;

  // Modal Actions
  setDocsOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setProjectManagerModalOpen: (open: boolean) => void;
  setCreateFlowModalOpen: (open: boolean) => void;
  setAutoOpenCreateModal: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setShortcutsModalOpen: (open: boolean) => void;
  toggleShortcutsModal: () => void;

  // Inspector Actions
  setInspectMode: (mode: boolean) => void;
  toggleInspectMode: () => void;
  setRecordMode: (mode: boolean) => void;
  toggleRecordMode: () => void;

  // Settings Actions
  setDefaultSaveLocation: (location: string) => void;
  updateUiSettings: (settings: Partial<UiSettings>) => void;
  updateWorkspaceConfig: (config: Partial<WorkspaceConfig>) => void;
  applyThemeCssVars: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  currentView: 'studio',
  activeTab: 'ai',
  devicePreset: 'Desktop 1440',
  browser: 'chromium',

  isDocsOpen: false,
  isSettingsOpen: false,
  isProjectManagerModalOpen: false,
  isCreateFlowModalOpen: false,
  autoOpenCreateModal: false,
  isCommandPaletteOpen: false,
  isShortcutsModalOpen: false,

  inspectMode: false,
  recordMode: false,

  // Split Layout state with localStorage persistence
  splitOrientation: (() => {
    try {
      const saved = localStorage.getItem('tracy_split_orientation');
      if (saved === 'horizontal' || saved === 'vertical') return saved;
    } catch (e) {
      console.error('Failed to load split orientation:', e);
    }
    return 'vertical';
  })(),
  sidePanelWidth: (() => {
    try {
      const saved = localStorage.getItem('tracy_side_panel_width');
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 280) return parsed;
      }
    } catch {}
    return 520;
  })(),
  sidePanelHeight: (() => {
    try {
      const saved = localStorage.getItem('tracy_side_panel_height');
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 180) return parsed;
      }
    } catch {}
    return 360;
  })(),

  // Device Frame & Orientation state with localStorage persistence
  deviceOrientation: (() => {
    try {
      const saved = localStorage.getItem('tracy_device_orientation');
      if (saved === 'portrait' || saved === 'landscape') return saved;
    } catch (e) {
      console.error('Failed to load device orientation:', e);
    }
    return 'portrait';
  })(),
  showDeviceBezel: (() => {
    try {
      const saved = localStorage.getItem('tracy_show_device_bezel');
      if (saved !== null) return saved === 'true';
    } catch (e) {
      console.error('Failed to load show device bezel:', e);
    }
    return false;
  })(),

  // Page Color Scheme Emulation state with localStorage persistence
  pageThemeEmulation: (() => {
    try {
      const saved = localStorage.getItem('tracy_page_theme_emulation');
      if (saved === 'system' || saved === 'dark' || saved === 'light') return saved;
    } catch (e) {
      console.error('Failed to load page theme emulation:', e);
    }
    return 'system';
  })(),

  // Settings state with localStorage persistence
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

  // Navigation
  setCurrentView: (view) => set({ currentView: view }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDevicePreset: (preset) => set({ devicePreset: preset }),
  setBrowser: (browser) => set({ browser }),

  // Split Layout
  setSplitOrientation: (orientation) => {
    set({ splitOrientation: orientation });
    try {
      localStorage.setItem('tracy_split_orientation', orientation);
    } catch (e) {
      console.error('Failed to save split orientation:', e);
    }
  },
  toggleSplitOrientation: () => {
    const next = get().splitOrientation === 'vertical' ? 'horizontal' : 'vertical';
    get().setSplitOrientation(next);
  },
  setSidePanelWidth: (width) => {
    set({ sidePanelWidth: width });
    try {
      localStorage.setItem('tracy_side_panel_width', String(width));
    } catch {}
  },
  setSidePanelHeight: (height) => {
    set({ sidePanelHeight: height });
    try {
      localStorage.setItem('tracy_side_panel_height', String(height));
    } catch {}
  },

  // Device Frame & Orientation
  setDeviceOrientation: (orientation) => {
    set({ deviceOrientation: orientation });
    try {
      localStorage.setItem('tracy_device_orientation', orientation);
    } catch (e) {
      console.error('Failed to save device orientation:', e);
    }
  },
  toggleDeviceOrientation: () => {
    const next = get().deviceOrientation === 'portrait' ? 'landscape' : 'portrait';
    get().setDeviceOrientation(next);
  },
  setShowDeviceBezel: (show) => {
    set({ showDeviceBezel: show });
    try {
      localStorage.setItem('tracy_show_device_bezel', String(show));
    } catch (e) {
      console.error('Failed to save show device bezel:', e);
    }
  },
  toggleDeviceBezel: () => {
    get().setShowDeviceBezel(!get().showDeviceBezel);
  },

  // Page Color Scheme Emulation
  setPageThemeEmulation: (theme) => {
    set({ pageThemeEmulation: theme });
    try {
      localStorage.setItem('tracy_page_theme_emulation', theme);
    } catch (e) {
      console.error('Failed to save page theme emulation:', e);
    }
  },

  // Modals
  setDocsOpen: (open) => set({ isDocsOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setProjectManagerModalOpen: (open) => set({ isProjectManagerModalOpen: open }),
  setCreateFlowModalOpen: (open) => set({ isCreateFlowModalOpen: open }),
  setAutoOpenCreateModal: (open) => set({ autoOpenCreateModal: open }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  setShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),
  toggleShortcutsModal: () => set((state) => ({ isShortcutsModalOpen: !state.isShortcutsModalOpen })),

  // Inspector
  setInspectMode: (mode) => set({ inspectMode: mode }),
  toggleInspectMode: () => set((state) => ({ inspectMode: !state.inspectMode })),
  setRecordMode: (mode) => set({ recordMode: mode }),
  toggleRecordMode: () => set((state) => ({ recordMode: !state.recordMode })),

  // Settings
  setDefaultSaveLocation: (location) => {
    set({ defaultSaveLocation: location });
    try {
      localStorage.setItem('tracy_default_save_location', location);
    } catch (e) {
      console.error('Failed to save default location:', e);
    }
  },

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
