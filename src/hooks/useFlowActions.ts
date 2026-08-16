import { useProjectStore } from '@/src/stores/projectStore';

export function useFlowActions() {
  const selectFlow = useProjectStore((s) => s.selectFlow);
  const closeFlowTab = useProjectStore((s) => s.closeFlowTab);
  const createFlow = useProjectStore((s) => s.createFlow);
  const renameFlow = useProjectStore((s) => s.renameFlow);
  const updateFlowCategory = useProjectStore((s) => s.updateFlowCategory);
  const updateYamlContent = useProjectStore((s) => s.updateYamlContent);
  const updateFlowSteps = useProjectStore((s) => s.updateFlowSteps);
  const duplicateStep = useProjectStore((s) => s.duplicateStep);
  const bulkDeleteSteps = useProjectStore((s) => s.bulkDeleteSteps);
  const batchAddFlows = useProjectStore((s) => s.batchAddFlows);

  return {
    selectFlow,
    closeFlowTab,
    createFlow,
    renameFlow,
    updateFlowCategory,
    updateYamlContent,
    updateFlowSteps,
    duplicateStep,
    bulkDeleteSteps,
    batchAddFlows,
  };
}
