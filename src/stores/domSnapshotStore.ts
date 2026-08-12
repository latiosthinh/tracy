import { create } from 'zustand';
import type { MinedPageData } from '@/src/types/project';

interface DomSnapshotState {
  snapshotsByProject: Record<string, Record<string, MinedPageData>>;

  addDomSnapshot: (projectId: string, path: string, data: MinedPageData) => void;
  getDomSnapshot: (projectId: string, path: string) => MinedPageData | undefined;
  getAllDomSnapshots: (projectId: string) => Record<string, MinedPageData>;
  clearDomSnapshots: (projectId: string) => void;
}

export const useDomSnapshotStore = create<DomSnapshotState>((set, get) => ({
  snapshotsByProject: {},

  addDomSnapshot: (projectId, path, data) => {
    set((state) => {
      const currentProjSnapshots = state.snapshotsByProject[projectId] || {};
      return {
        snapshotsByProject: {
          ...state.snapshotsByProject,
          [projectId]: { ...currentProjSnapshots, [path]: data },
        },
      };
    });
  },

  getDomSnapshot: (projectId, path) => {
    return get().snapshotsByProject[projectId]?.[path];
  },

  getAllDomSnapshots: (projectId) => {
    return get().snapshotsByProject[projectId] || {};
  },

  clearDomSnapshots: (projectId) => {
    set((state) => {
      const next = { ...state.snapshotsByProject };
      delete next[projectId];
      return { snapshotsByProject: next };
    });
  },
}));
