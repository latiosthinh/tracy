import { useEffect } from 'react';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';
import { useUiStore } from '@/src/stores/uiStore';
import { tracyApi } from '@/src/lib/ipc';
import { useDomSnapshotStore } from '@/src/stores/domSnapshotStore';

export function useGlobalShortcuts() {
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);
  const setShortcutsModalOpen = useUiStore((s) => s.setShortcutsModalOpen);

  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const pauseExecution = useExecutionStore((s) => s.pauseExecution);

  const projects = useProjectStore((s) => s.projects);
  const openProjectIds = useProjectStore((s) => s.openProjectIds);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeFlowId = useProjectStore((s) => s.activeFlowId);
  const selectProject = useProjectStore((s) => s.selectProject);
  const selectFlow = useProjectStore((s) => s.selectFlow);
  const defaultSaveLocation = useUiStore((s) => s.defaultSaveLocation);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isModifier = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target && target.isContentEditable);

      // 1. ? key -> Open Shortcuts Cheatsheet (when not in input)
      if (e.key === '?' && !isModifier && !isInput) {
        e.preventDefault();
        setShortcutsModalOpen(true);
        return;
      }

      // 2. Ctrl+K / Ctrl+P / Cmd+K / Cmd+P -> Toggle Command Palette
      if (isModifier && (e.key === 'k' || e.key === 'K' || e.key === 'p' || e.key === 'P') && !e.shiftKey) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // 3. Ctrl+Shift+P / Cmd+Shift+P -> Pause Execution
      if (isModifier && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        pauseExecution();
        return;
      }

      // 4. Ctrl+Enter / Cmd+Enter -> Start Execution
      if (isModifier && e.key === 'Enter') {
        e.preventDefault();
        if (!isExecuting) {
          const currentProj = projects.find((p) => p.id === activeProjectId) || projects[0];
          if (currentProj) {
            const currentFlow = currentProj.flows.find((f) => f.id === activeFlowId) || currentProj.flows[0];
            if (currentFlow) {
              startExecution(currentFlow, currentProj.targetUrl || '');
            }
          }
        }
        return;
      }

      // 5. Ctrl+1..9 -> Switch Project Tab
      if (isModifier && !e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0 && index < openProjectIds.length) {
          e.preventDefault();
          selectProject(openProjectIds[index]);
          return;
        }
      }

      // 6. Ctrl+Tab / Ctrl+Shift+Tab -> Cycle active flow tab
      if (isModifier && e.key === 'Tab') {
        e.preventDefault();
        const currentProj = projects.find((p) => p.id === activeProjectId) || projects[0];
        if (currentProj && currentProj.flows.length > 1) {
          const flows = currentProj.flows;
          const currentIndex = flows.findIndex((f) => f.id === activeFlowId);
          if (currentIndex !== -1) {
            const nextIndex = e.shiftKey
              ? (currentIndex - 1 + flows.length) % flows.length
              : (currentIndex + 1) % flows.length;
            selectFlow(flows[nextIndex].id);
          }
        }
        return;
      }

      // 7. Ctrl+S -> Save Active Flow & Project
      if (isModifier && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        const currentProj = projects.find((p) => p.id === activeProjectId);
        if (currentProj) {
          const saveLocation = currentProj.saveLocation || defaultSaveLocation;
          if (saveLocation) {
            try {
              const projectData = JSON.stringify(currentProj, null, 2);
              await tracyApi.saveProjectToDisk(currentProj.id, saveLocation, projectData);
              const currentFlow = currentProj.flows.find((f) => f.id === activeFlowId);
              if (currentFlow) {
                await tracyApi.saveFlowToDisk(
                  currentProj.id,
                  saveLocation,
                  currentFlow.name,
                  currentFlow.yamlContent
                );
              }
              const liveSnapshots = useDomSnapshotStore.getState().getAllDomSnapshots(currentProj.id);
              const allSnapshots = {
                ...(currentProj.domSnapshots || {}),
                ...liveSnapshots,
              };
              for (const [path, snapshot] of Object.entries(allSnapshots)) {
                await tracyApi.saveDomSnapshot(
                  currentProj.id,
                  saveLocation,
                  path,
                  JSON.stringify(snapshot, null, 2)
                );
              }
            } catch (err) {
              console.error('Manual save failed:', err);
            }
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isExecuting,
    startExecution,
    pauseExecution,
    projects,
    openProjectIds,
    activeProjectId,
    activeFlowId,
    selectProject,
    selectFlow,
    toggleCommandPalette,
    setShortcutsModalOpen,
    defaultSaveLocation,
  ]);
}
