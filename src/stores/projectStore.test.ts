import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import type { Project } from '@/src/types/project';
import { DEFAULT_PROJECTS } from '@/src/data/defaultProjects';
import { useDomSnapshotStore } from './domSnapshotStore';

function getStore() {
  return useProjectStore.getState();
}

function resetStore() {
  useDomSnapshotStore.setState({ snapshotsByProject: {} });
  // Replace the entire state with a fresh copy to avoid immer proxy issues
  useProjectStore.setState({
    projects: structuredClone(DEFAULT_PROJECTS),
    openProjectIds: DEFAULT_PROJECTS.map((p) => p.id),
    activeProjectId: DEFAULT_PROJECTS[0].id,
    activeFlowId: DEFAULT_PROJECTS[0].flows[0]?.id || '',
    defaultSaveLocation: '',
    browserPaths: {},
  } as any);
}

describe('projectStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('has default projects loaded', () => {
      const { projects } = getStore();
      expect(projects.length).toBeGreaterThan(0);
    });

    it('has first project active', () => {
      const { activeProjectId, projects } = getStore();
      expect(activeProjectId).toBe(projects[0].id);
    });
  });

  describe('getActiveProject', () => {
    it('returns the active project', () => {
      const { getActiveProject, activeProjectId } = getStore();
      const project = getActiveProject();
      expect(project.id).toBe(activeProjectId);
    });
  });

  describe('selectProject', () => {
    it('sets the active project and adds to open tabs', () => {
      const { projects, selectProject } = getStore();
      const targetId = projects[1].id;
      selectProject(targetId);

      const state = getStore();
      expect(state.activeProjectId).toBe(targetId);
      expect(state.openProjectIds).toContain(targetId);
    });

    it('sets activeFlowId to first flow of selected project', () => {
      const { projects, selectProject } = getStore();
      const targetId = projects[1].id;
      selectProject(targetId);

      const state = getStore();
      const targetProject = projects.find(p => p.id === targetId)!;
      expect(state.activeFlowId).toBe(targetProject.flows[0].id);
    });
  });

  describe('closeProjectTab', () => {
    it('removes project from open tabs', () => {
      const { projects, closeProjectTab } = getStore();
      const closeId = projects[1].id;
      closeProjectTab(closeId);

      const state = getStore();
      expect(state.openProjectIds).not.toContain(closeId);
    });

    it('does not close last remaining tab', () => {
      // Set up state with only 2 projects open
      useProjectStore.setState({
        projects: structuredClone([DEFAULT_PROJECTS[0], DEFAULT_PROJECTS[1]]),
        openProjectIds: [DEFAULT_PROJECTS[0].id, DEFAULT_PROJECTS[1].id],
        activeProjectId: DEFAULT_PROJECTS[1].id,
        activeFlowId: DEFAULT_PROJECTS[0].flows[0]?.id || '',
      } as any);

      // Close one tab, leaving 1
      getStore().closeProjectTab(DEFAULT_PROJECTS[1].id);
      expect(getStore().openProjectIds.length).toBe(1);

      // Try to close the last tab — should be refused
      getStore().closeProjectTab(DEFAULT_PROJECTS[0].id);
      expect(getStore().openProjectIds.length).toBe(1);
    });

    it('switches active project when closing the active tab', () => {
      const { projects, selectProject, closeProjectTab } = getStore();
      selectProject(projects[1].id);
      expect(getStore().activeProjectId).toBe(projects[1].id);

      closeProjectTab(projects[1].id);
      expect(getStore().activeProjectId).not.toBe(projects[1].id);
    });
  });

  describe('createProject', () => {
    it('adds a new project and makes it active', () => {
      const newProject: Project = {
        id: 'new-proj',
        name: 'New Project',
        targetUrl: 'https://new.example.com',
        environment: 'staging',
        tags: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        flows: [],
      };

      getStore().createProject(newProject);
      const state = getStore();
      expect(state.projects[0].id).toBe('new-proj');
      expect(state.activeProjectId).toBe('new-proj');
      expect(state.openProjectIds).toContain('new-proj');
    });
  });

  describe('deleteProject', () => {
    it('removes project from list', () => {
      const { projects, deleteProject } = getStore();
      const deleteId = projects[projects.length - 1].id;
      deleteProject(deleteId);

      const state = getStore();
      expect(state.projects.find(p => p.id === deleteId)).toBeUndefined();
    });

    it('does not delete last project', () => {
      // Set up state with only 2 projects
      useProjectStore.setState({
        projects: structuredClone([DEFAULT_PROJECTS[0], DEFAULT_PROJECTS[1]]),
        openProjectIds: [DEFAULT_PROJECTS[0].id, DEFAULT_PROJECTS[1].id],
        activeProjectId: DEFAULT_PROJECTS[0].id,
        activeFlowId: DEFAULT_PROJECTS[0].flows[0]?.id || '',
      } as any);

      getStore().deleteProject(DEFAULT_PROJECTS[1].id);
      expect(getStore().projects.length).toBe(1);

      // Try to delete the last one — should be refused
      getStore().deleteProject(DEFAULT_PROJECTS[0].id);
      expect(getStore().projects.length).toBe(1);
    });
  });

  describe('updateTargetUrl', () => {
    it('updates the target URL of the active project', () => {
      getStore().updateTargetUrl('https://new-url.example.com');
      const project = getStore().getActiveProject();
      expect(project.targetUrl).toBe('https://new-url.example.com');
    });
  });

  describe('flow operations', () => {
    it('createFlow adds a flow to the active project', () => {
      const before = getStore().getActiveProject().flows.length;
      getStore().createFlow('test-flow');
      const after = getStore().getActiveProject().flows.length;
      expect(after).toBe(before + 1);
    });

    it('createFlow appends .yaml if missing', () => {
      getStore().createFlow('my-test');
      const flow = getStore().getActiveProject().flows.at(-1)!;
      expect(flow.name).toBe('my-test.yaml');
    });

    it('renameFlow updates flow name and path', () => {
      const { activeFlowId } = getStore();
      getStore().renameFlow(activeFlowId, 'renamed');
      const flow = getStore().getActiveFlow();
      expect(flow.name).toBe('renamed.yaml');
      expect(flow.path).toBe('flows/renamed.yaml');
    });

    it('renameFlow ignores empty names', () => {
      const flowBefore = getStore().getActiveFlow();
      getStore().renameFlow(flowBefore.id, '   ');
      const flowAfter = getStore().getActiveFlow();
      expect(flowAfter.name).toBe(flowBefore.name);
    });

    it('updateFlowCategory changes the category', () => {
      const { activeFlowId } = getStore();
      getStore().updateFlowCategory(activeFlowId, 'API');
      expect(getStore().getActiveFlow().category).toBe('API');
    });

    it('updateYamlContent updates the yaml content', () => {
      getStore().updateYamlContent('# new yaml');
      expect(getStore().getActiveFlow().yamlContent).toBe('# new yaml');
    });

    it('selectFlow changes activeFlowId', () => {
      const project = getStore().getActiveProject();
      if (project.flows.length > 1) {
        getStore().selectFlow(project.flows[1].id);
        expect(getStore().activeFlowId).toBe(project.flows[1].id);
      }
    });

    it('batchAddFlows adds multiple flows', () => {
      const before = getStore().getActiveProject().flows.length;
      getStore().batchAddFlows([
        { name: 'flow-a', yaml: '- navigate: /a' },
        { name: 'flow-b', yaml: '- navigate: /b' },
      ]);
      expect(getStore().getActiveProject().flows.length).toBe(before + 2);
    });
  });

  describe('browserPaths (per-project browser path isolation)', () => {
    it('defaults to "/" for unknown projects', () => {
      expect(getStore().getBrowserPath('nope')).toBe('/');
    });

    it('stores path per project without leaking to others', () => {
      const { projects, setBrowserPath, getBrowserPath } = getStore();
      setBrowserPath(projects[0].id, '/checkout');
      expect(getBrowserPath(projects[0].id)).toBe('/checkout');
      expect(getBrowserPath(projects[1].id)).toBe('/');
    });
  });
});
