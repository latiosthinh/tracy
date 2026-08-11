import { useProjectStore } from '../stores/projectStore';
import type { FlowCategory, FlowStep } from '../types/flow';

export function useFlowActions() {
  const selectFlow = useProjectStore((s) => s.selectFlow);
  const closeFlowTab = useProjectStore((s) => s.closeFlowTab);
  const createFlow = useProjectStore((s) => s.createFlow);
  const renameFlow = useProjectStore((s) => s.renameFlow);
  const updateFlowCategory = useProjectStore((s) => s.updateFlowCategory);
  const updateYamlContent = useProjectStore((s) => s.updateYamlContent);
  const updateFlowSteps = useProjectStore((s) => s.updateFlowSteps);
  const batchAddFlows = useProjectStore((s) => s.batchAddFlows);

  return {
    selectFlow,
    closeFlowTab,
    createFlow,
    renameFlow,
    updateFlowCategory,
    updateYamlContent,
    updateFlowSteps,
    batchAddFlows,
  };
}
