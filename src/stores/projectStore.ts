import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Project, FlowFile, FlowCategory, FlowStep, MinedPageData } from '../types/index';
import { DEFAULT_PROJECTS } from '../data/defaultProjects';
import { useDomSnapshotStore } from './domSnapshotStore';

interface ProjectState {
  projects: Project[];
  openProjectIds: string[];
  activeProjectId: string;
  activeFlowId: string;
  defaultSaveLocation: string;

  // Derived getters
  getActiveProject: () => Project;
  getOpenProjects: () => Project[];
  getActiveFlow: () => FlowFile;

  // Actions
  setDefaultSaveLocation: (location: string) => void;
  selectProject: (projectId: string) => void;
  closeProjectTab: (projectId: string) => void;
  createProject: (newProject: Project) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: string) => void;
  updateTargetUrl: (newUrl: string) => void;
  updateProjectSaveLocation: (projectId: string, location: string) => void;

  selectFlow: (flowId: string) => void;
  closeFlowTab: (flowId: string) => void;
  createFlow: (customName?: string, category?: FlowCategory) => void;
  renameFlow: (flowId: string, newName: string) => void;
  updateFlowCategory: (flowId: string, category: FlowCategory) => void;
  updateYamlContent: (newYaml: string) => void;
  updateFlowSteps: (newSteps: FlowStep[]) => void;
  batchAddFlows: (newFlows: { name: string; yaml: string; description?: string }[]) => void;

  // Legacy DOM mining delegation
  addDomSnapshot: (projectId: string, path: string, data: MinedPageData) => void;
  getDomSnapshot: (projectId: string, path: string) => MinedPageData | undefined;
  getAllDomSnapshots: (projectId: string) => Record<string, MinedPageData>;
  clearDomSnapshots: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => ({
    projects: DEFAULT_PROJECTS,
    openProjectIds: DEFAULT_PROJECTS.map((p) => p.id),
    activeProjectId: DEFAULT_PROJECTS[0].id,
    activeFlowId: DEFAULT_PROJECTS[0].flows[0]?.id || 'checkout-flow',
    defaultSaveLocation: '',

    getActiveProject: () => {
      const { projects, activeProjectId } = get();
      return projects.find((p) => p.id === activeProjectId) || projects[0];
    },

    getOpenProjects: () => {
      const { projects, openProjectIds } = get();
      return projects.filter((p) => openProjectIds.includes(p.id));
    },

    getActiveFlow: () => {
      const activeProject = get().getActiveProject();
      const { activeFlowId } = get();
      const flows = activeProject.flows;
      return (
        flows.find((f) => f.id === activeFlowId) ||
        flows[0] || {
          id: 'empty',
          name: 'empty.yaml',
          path: 'flows/empty.yaml',
          tags: [],
          metadata: { url: activeProject.targetUrl },
          yamlContent: `# Empty Flow\nurl: ${activeProject.targetUrl}\n---\n- navigate: /`,
          steps: [],
        }
      );
    },

    setDefaultSaveLocation: (location: string) =>
      set((state) => {
        state.defaultSaveLocation = location;
      }),

    selectProject: (projectId: string) => {
      set((state) => {
        if (!state.openProjectIds.includes(projectId)) {
          state.openProjectIds.push(projectId);
        }
        state.activeProjectId = projectId;
        const targetProj = state.projects.find((p) => p.id === projectId);
        if (targetProj && targetProj.flows.length > 0) {
          state.activeFlowId = targetProj.flows[0].id;
        }
      });
    },

    closeProjectTab: (projectId: string) => {
      set((state) => {
        if (state.openProjectIds.length <= 1) return;
        state.openProjectIds = state.openProjectIds.filter((id) => id !== projectId);
        if (state.activeProjectId === projectId) {
          state.activeProjectId = state.openProjectIds[0];
        }
      });
    },

    createProject: (newProject: Project) => {
      set((state) => {
        state.projects.unshift(newProject);
        state.openProjectIds.push(newProject.id);
        state.activeProjectId = newProject.id;
        state.activeFlowId = newProject.flows[0]?.id || '';
      });
    },

    updateProject: (updatedProject: Project) => {
      set((state) => {
        const index = state.projects.findIndex((p) => p.id === updatedProject.id);
        if (index !== -1) {
          state.projects[index] = updatedProject;
        }
      });
    },

    deleteProject: (projectId: string) => {
      set((state) => {
        if (state.projects.length <= 1) return;
        state.projects = state.projects.filter((p) => p.id !== projectId);
        state.openProjectIds = state.openProjectIds.filter((id) => id !== projectId);
        if (state.activeProjectId === projectId) {
          state.activeProjectId = state.projects[0].id;
        }
      });
    },

    updateTargetUrl: (newUrl: string) => {
      set((state) => {
        const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
        if (activeProj) {
          activeProj.targetUrl = newUrl;
        }
      });
    },

    updateProjectSaveLocation: (projectId: string, location: string) => {
      set((state) => {
        const proj = state.projects.find((p) => p.id === projectId);
        if (proj) {
          proj.saveLocation = location;
        }
      });
    },

    selectFlow: (flowId: string) =>
      set((state) => {
        state.activeFlowId = flowId;
      }),

    closeFlowTab: (flowId: string) => {
      set((state) => {
        const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
        if (!activeProj || activeProj.flows.length <= 1) return;

        activeProj.flows = activeProj.flows.filter((f) => f.id !== flowId);
        if (state.activeFlowId === flowId) {
          state.activeFlowId = activeProj.flows[0].id;
        }
      });
    },

    createFlow: (customName?: string, category?: FlowCategory) => {
      set((state) => {
        const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
        if (!activeProj) return;

        const newId = `flow-${Date.now()}`;
        let newFlowName = customName ? customName.trim() : `flow-${activeProj.flows.length + 1}.yaml`;
        if (!newFlowName.endsWith('.yaml') && !newFlowName.endsWith('.yml')) {
          newFlowName = `${newFlowName}.yaml`;
        }
        const flowCat: FlowCategory = category || 'E2E';
        const newFlow: FlowFile = {
          id: newId,
          name: newFlowName,
          path: `flows/${newFlowName}`,
          category: flowCat,
          tags: ['custom', flowCat.toLowerCase()],
          metadata: { url: activeProj.targetUrl },
          yamlContent: `# Tracy Custom ${flowCat} Flow for ${activeProj.name}\nurl: ${activeProj.targetUrl}\ntags:\n  - custom\n---\n- navigate: /\n- assertVisible: "Header"\n`,
          steps: [
            { id: 'cs-1', command: 'navigate', value: '/', status: 'pending' },
            { id: 'cs-2', command: 'assertVisible', value: 'Header', status: 'pending' },
          ],
        };

        activeProj.flows.push(newFlow);
        state.activeFlowId = newId;
      });
    },

    renameFlow: (flowId: string, newName: string) => {
      let cleanName = newName.trim();
      if (!cleanName) return;
      if (!cleanName.endsWith('.yaml') && !cleanName.endsWith('.yml')) {
        cleanName = `${cleanName}.yaml`;
      }

      set((state) => {
        const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
        const flow = activeProj?.flows.find((f) => f.id === flowId);
        if (flow) {
          flow.name = cleanName;
          flow.path = `flows/${cleanName}`;
        }
      });
    },

    updateFlowCategory: (flowId: string, category: FlowCategory) => {
      set((state) => {
        const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
        const flow = activeProj?.flows.find((f) => f.id === flowId);
        if (flow) {
          flow.category = category;
        }
      });
    },

    updateYamlContent: (newYaml: string) => {
      set((state) => {
        const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
        const flow = activeProj?.flows.find((f) => f.id === state.activeFlowId);
        if (flow) {
          flow.yamlContent = newYaml;
        }
      });
    },

    updateFlowSteps: (newSteps: FlowStep[]) => {
      set((state) => {
        const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
        const flow = activeProj?.flows.find((f) => f.id === state.activeFlowId);
        if (flow) {
          flow.steps = newSteps;
        }
      });
    },

    batchAddFlows: (newFlows: { name: string; yaml: string; description?: string }[]) => {
      set((state) => {
        const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
        if (!activeProj) return;

        const createdFlows: FlowFile[] = newFlows.map((nf, idx) => {
          const fileId = `flow-ai-${Date.now()}-${idx}`;
          const fileName = nf.name.endsWith('.yaml')
            ? nf.name
            : `${nf.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
          return {
            id: fileId,
            name: fileName,
            path: `flows/${fileName}`,
            tags: ['ai-generated', activeProj.environment],
            metadata: { url: activeProj.targetUrl },
            yamlContent: nf.yaml,
            steps: [
              { id: 'step-1', command: 'navigate', value: '/', status: 'pending' },
              { id: 'step-2', command: 'assertVisible', value: 'Welcome', status: 'pending' },
            ],
          };
        });

        activeProj.flows.push(...createdFlows);
        if (createdFlows.length > 0) {
          state.activeFlowId = createdFlows[0].id;
        }
      });
    },

    addDomSnapshot: (projectId: string, path: string, data: MinedPageData) => {
      useDomSnapshotStore.getState().addDomSnapshot(projectId, path, data);
    },

    getDomSnapshot: (projectId: string, path: string) => {
      return useDomSnapshotStore.getState().getDomSnapshot(projectId, path);
    },

    getAllDomSnapshots: (projectId: string) => {
      return useDomSnapshotStore.getState().getAllDomSnapshots(projectId);
    },

    clearDomSnapshots: (projectId: string) => {
      useDomSnapshotStore.getState().clearDomSnapshots(projectId);
    },
  }))
);
