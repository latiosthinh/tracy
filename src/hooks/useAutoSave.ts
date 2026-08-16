import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/src/stores/projectStore';
import { useUiStore } from '@/src/stores/uiStore';
import { useDomSnapshotStore } from '@/src/stores/domSnapshotStore';
import { tracyApi } from '@/src/lib/ipc';

export function useAutoSave(intervalSeconds: number = 30) {
  const lastSaveRef = useRef<number>(0);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const defaultSaveLocation = useUiStore((s) => s.defaultSaveLocation);

  useEffect(() => {
    if (!defaultSaveLocation) return;

    const saveInterval = setInterval(async () => {
      const now = Date.now();
      if (now - lastSaveRef.current < intervalSeconds * 1000) return;

      const activeProject = projects.find((p) => p.id === activeProjectId);
      if (!activeProject) return;

      const saveLocation = activeProject.saveLocation || defaultSaveLocation;
      if (!saveLocation) return;

      try {
        const projectData = JSON.stringify(activeProject, null, 2);
        await tracyApi.saveProjectToDisk(activeProject.id, saveLocation, projectData);

        for (const flow of activeProject.flows) {
          await tracyApi.saveFlowToDisk(
            activeProject.id,
            saveLocation,
            flow.name,
            flow.yamlContent
          );
        }

        const liveSnapshots = useDomSnapshotStore.getState().getAllDomSnapshots(activeProject.id);
        const allSnapshots = {
          ...(activeProject.domSnapshots || {}),
          ...liveSnapshots,
        };

        for (const [path, snapshot] of Object.entries(allSnapshots)) {
          await tracyApi.saveDomSnapshot(
            activeProject.id,
            saveLocation,
            path,
            JSON.stringify(snapshot, null, 2)
          );
        }

        lastSaveRef.current = now;
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, intervalSeconds * 1000);

    return () => clearInterval(saveInterval);
  }, [projects, activeProjectId, defaultSaveLocation, intervalSeconds]);
}
