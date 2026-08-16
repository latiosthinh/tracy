import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUiStore } from './uiStore';

function getStore() {
  return useUiStore.getState();
}

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      currentView: 'studio',
      activeTab: 'ai',
      devicePreset: 'Desktop 1440',
      browser: 'chromium',
      isDocsOpen: false,
      isSettingsOpen: false,
      isProjectManagerModalOpen: false,
      isCreateFlowModalOpen: false,
      inspectMode: false,
      recordMode: false,
    });
  });

  describe('navigation', () => {
    it('setCurrentView changes the view', () => {
      getStore().setCurrentView('projects');
      expect(getStore().currentView).toBe('projects');
    });

    it('setActiveTab changes the tab', () => {
      getStore().setActiveTab('editor');
      expect(getStore().activeTab).toBe('editor');
    });

    it('setDevicePreset changes the device', () => {
      getStore().setDevicePreset('Mobile iPhone 14');
      expect(getStore().devicePreset).toBe('Mobile iPhone 14');
    });

    it('setBrowser changes the browser engine', () => {
      getStore().setBrowser('firefox');
      expect(getStore().browser).toBe('firefox');
    });
  });

  describe('modals', () => {
    it('toggles docs modal', () => {
      getStore().setDocsOpen(true);
      expect(getStore().isDocsOpen).toBe(true);
      getStore().setDocsOpen(false);
      expect(getStore().isDocsOpen).toBe(false);
    });

    it('toggles settings modal', () => {
      getStore().setSettingsOpen(true);
      expect(getStore().isSettingsOpen).toBe(true);
    });

    it('toggles project manager modal', () => {
      getStore().setProjectManagerModalOpen(true);
      expect(getStore().isProjectManagerModalOpen).toBe(true);
    });

    it('toggles create flow modal', () => {
      getStore().setCreateFlowModalOpen(true);
      expect(getStore().isCreateFlowModalOpen).toBe(true);
    });
  });

  describe('inspector modes', () => {
    it('setInspectMode sets the mode directly', () => {
      getStore().setInspectMode(true);
      expect(getStore().inspectMode).toBe(true);
    });

    it('toggleInspectMode flips the mode', () => {
      expect(getStore().inspectMode).toBe(false);
      getStore().toggleInspectMode();
      expect(getStore().inspectMode).toBe(true);
      getStore().toggleInspectMode();
      expect(getStore().inspectMode).toBe(false);
    });

    it('toggleRecordMode flips the mode', () => {
      expect(getStore().recordMode).toBe(false);
      getStore().toggleRecordMode();
      expect(getStore().recordMode).toBe(true);
    });
  });

  describe('settings persistence', () => {
    it('updateUiSettings merges and persists to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      getStore().updateUiSettings({ language: 'vi' });

      expect(getStore().uiSettings.language).toBe('vi');
      expect(setItemSpy).toHaveBeenCalledWith(
        'tracy_ui_settings',
        expect.stringContaining('"vi"')
      );
      setItemSpy.mockRestore();
    });

    it('setDefaultSaveLocation persists to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      getStore().setDefaultSaveLocation('/home/user/projects');

      expect(getStore().defaultSaveLocation).toBe('/home/user/projects');
      expect(setItemSpy).toHaveBeenCalledWith(
        'tracy_default_save_location',
        '/home/user/projects'
      );
      setItemSpy.mockRestore();
    });
  });

  describe('split layout', () => {
    it('setSplitOrientation sets and persists orientation', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      getStore().setSplitOrientation('horizontal');
      expect(getStore().splitOrientation).toBe('horizontal');
      expect(setItemSpy).toHaveBeenCalledWith('tracy_split_orientation', 'horizontal');
      setItemSpy.mockRestore();
    });

    it('toggleSplitOrientation toggles between vertical and horizontal', () => {
      getStore().setSplitOrientation('vertical');
      getStore().toggleSplitOrientation();
      expect(getStore().splitOrientation).toBe('horizontal');
      getStore().toggleSplitOrientation();
      expect(getStore().splitOrientation).toBe('vertical');
    });

    it('setSidePanelWidth and setSidePanelHeight persist dimensions', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      getStore().setSidePanelWidth(600);
      expect(getStore().sidePanelWidth).toBe(600);
      expect(setItemSpy).toHaveBeenCalledWith('tracy_side_panel_width', '600');

      getStore().setSidePanelHeight(400);
      expect(getStore().sidePanelHeight).toBe(400);
      expect(setItemSpy).toHaveBeenCalledWith('tracy_side_panel_height', '400');
      setItemSpy.mockRestore();
    });
  });
});
