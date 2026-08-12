import { create } from 'zustand';
import { ExecutionLog, TestRunResult, FlowFile, FlowStep } from '@/src/types/autoflow';
import { tracyApi, isElectronEnv, UnlistenFn } from '@/src/lib/ipc';

interface ExecutionState {
  isExecuting: boolean;
  activeStepIndex: number;
  executionSpeed: number;
  executionLogs: ExecutionLog[];
  lastResult: TestRunResult | null;
  eventListenersSet: boolean;
  unlistenFns: UnlistenFn[];

  setExecutionSpeed: (speed: number) => void;
  startExecution: (flow: FlowFile, targetBaseUrl: string) => Promise<void>;
  pauseExecution: () => void;
  resetExecution: () => void;
  addLogEntry: (log: ExecutionLog) => void;
  updateStepStatus: (stepIndex: number, status: FlowStep['status'], durationMs?: number, errorMessage?: string) => void;
  setupEventListeners: () => Promise<void>;
  cleanupEventListeners: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isExecuting: false,
  activeStepIndex: -1,
  executionSpeed: 600,
  executionLogs: [],
  lastResult: null,
  eventListenersSet: false,
  unlistenFns: [],

  setExecutionSpeed: (speed: number) => set({ executionSpeed: speed }),

  addLogEntry: (log: ExecutionLog) => {
    set((state) => ({ executionLogs: [log, ...state.executionLogs] }));
  },

  updateStepStatus: (stepIndex, status, durationMs, errorMessage) => {
    set((state) => {
      const updatedLogs = [...state.executionLogs];
      if (status === 'passed' || status === 'failed') {
        const logEntry: ExecutionLog = {
          id: `log-${crypto.randomUUID()}-${stepIndex}`,
          timestamp: new Date().toLocaleTimeString(),
          level: status === 'failed' ? 'error' : 'assertion',
          stepIndex,
          message: status === 'passed'
            ? `✅ Step ${stepIndex + 1} PASSED (${durationMs || 0}ms)`
            : `❌ Step ${stepIndex + 1} FAILED: ${errorMessage || 'Unknown error'}`,
        };
        updatedLogs.unshift(logEntry);
      }
      return { activeStepIndex: stepIndex, executionLogs: updatedLogs };
    });
  },

  setupEventListeners: async () => {
    if (get().eventListenersSet) return;
    if (isElectronEnv()) {
      const unlisten1 = await tracyApi.onStepUpdate((payload) => {
        get().updateStepStatus(payload.stepIndex, payload.status, payload.durationMs, payload.errorMessage);
      });
      const unlisten2 = await tracyApi.onExecutionLog((payload) => {
        get().addLogEntry({
          id: payload.id,
          timestamp: payload.timestamp,
          level: payload.level,
          stepIndex: payload.stepIndex,
          message: payload.message,
        });
      });
      set({ eventListenersSet: true, unlistenFns: [unlisten1, unlisten2] });
    }
  },

  cleanupEventListeners: () => {
    const { unlistenFns } = get();
    unlistenFns.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    set({ eventListenersSet: false, unlistenFns: [] });
  },

  startExecution: async (flow: FlowFile, targetBaseUrl: string) => {
    const { executionSpeed, isExecuting } = get();
    if (isExecuting) return;

    set({
      isExecuting: true,
      activeStepIndex: 0,
      executionLogs: [],
      lastResult: null,
    });

    try {
      if (isElectronEnv()) {
        await tracyApi.runFlow(flow, targetBaseUrl, executionSpeed);
      } else {
        // Simulated execution mode for browser fallback
        const startTime = Date.now();
        let passed = 0;
        let failed = 0;

        for (let i = 0; i < flow.steps.length; i++) {
          if (!get().isExecuting) break;

          set({ activeStepIndex: i });
          const step = flow.steps[i];

          get().addLogEntry({
            id: `log-${crypto.randomUUID()}-${i}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            stepIndex: i,
            message: `Executing Step ${i + 1}: ${step.command}`,
          });

          await new Promise((resolve) => setTimeout(resolve, executionSpeed));

          const isFailTrigger = step.value === 'FailAssertionTrigger';
          if (!isFailTrigger) {
            passed++;
            get().addLogEntry({
              id: `log-${crypto.randomUUID()}-${i}-pass`,
              timestamp: new Date().toLocaleTimeString(),
              level: 'assertion',
              stepIndex: i,
              message: `✅ Step ${i + 1} PASSED (${executionSpeed}ms)`,
            });
          } else {
            failed++;
            get().addLogEntry({
              id: `log-${crypto.randomUUID()}-${i}-fail`,
              timestamp: new Date().toLocaleTimeString(),
              level: 'error',
              stepIndex: i,
              message: `❌ Step ${i + 1} FAILED: AssertionError: Element 'FailAssertionTrigger' not visible`,
            });
            break;
          }
        }

        const runResult: TestRunResult = {
          id: `run-${crypto.randomUUID()}`,
          flowId: flow.id,
          flowName: flow.name,
          timestamp: new Date().toLocaleString(),
          durationMs: Date.now() - startTime,
          status: failed === 0 ? 'PASSED' : 'FAILED',
          passedCount: passed,
          failedCount: failed,
          skippedCount: Math.max(0, flow.steps.length - (passed + failed)),
          totalCount: flow.steps.length,
          steps: flow.steps,
          logs: get().executionLogs,
          artifacts: {
            screenshots: [],
          },
        };

        set({ lastResult: runResult });
      }
    } catch (err: any) {
      console.error('Execution engine error:', err);
    } finally {
      set({ isExecuting: false, activeStepIndex: -1 });
    }
  },

  pauseExecution: () => set({ isExecuting: false }),

  resetExecution: () => {
    set({
      isExecuting: false,
      activeStepIndex: -1,
      executionLogs: [],
      lastResult: null,
    });
  },
}));
