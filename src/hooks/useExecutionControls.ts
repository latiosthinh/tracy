import { useExecutionStore } from '../stores/executionStore';
import type { FlowFile } from '../types/flow';

export function useExecutionControls() {
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const activeStepIndex = useExecutionStore((s) => s.activeStepIndex);
  const executionLogs = useExecutionStore((s) => s.executionLogs);
  const lastResult = useExecutionStore((s) => s.lastResult);
  const executionSpeed = useExecutionStore((s) => s.executionSpeed);

  const startExecution = useExecutionStore((s) => s.startExecution);
  const pauseExecution = useExecutionStore((s) => s.pauseExecution);
  const resetExecution = useExecutionStore((s) => s.resetExecution);
  const setExecutionSpeed = useExecutionStore((s) => s.setExecutionSpeed);

  const runFlow = (flow: FlowFile, targetUrl: string) => {
    return startExecution(flow, targetUrl);
  };

  return {
    isExecuting,
    activeStepIndex,
    executionLogs,
    lastResult,
    executionSpeed,
    runFlow,
    startExecution,
    pauseExecution,
    resetExecution,
    setExecutionSpeed,
  };
}
