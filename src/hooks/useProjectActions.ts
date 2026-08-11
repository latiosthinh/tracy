import { useProjectStore } from '../stores/projectStore';
import { useUiStore } from '../stores/uiStore';
import type { Project } from '../types/project';

export function useProjectActions() {
  const selectProjectStore = useProjectStore((s) => s.selectProject);
  const closeProjectTab = useProjectStore((s) => s.closeProjectTab);
  const createProject = useProjectStore((s) => s.createProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const updateTargetUrl = useProjectStore((s) => s.updateTargetUrl);
  const setCurrentView = useUiStore((s) => s.setCurrentView);

  const selectProject = (id: string) => {
    selectProjectStore(id);
    setCurrentView('studio');
  };

  return {
    selectProject,
    closeProjectTab,
    createProject,
    updateProject,
    deleteProject,
    updateTargetUrl,
  };
}
