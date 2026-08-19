import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  MatrixBrowserTarget,
  MatrixWorkerProgress,
  MatrixExecutionSummary,
  MatrixStoreState,
} from '@/src/types/matrix';

const DEFAULT_BROWSERS: MatrixBrowserTarget[] = ['chromium', 'firefox', 'webkit'];

function createInitialWorkerProgress(browser: MatrixBrowserTarget, totalSteps: number = 0): MatrixWorkerProgress {
  return {
    browser,
    status: 'idle',
    currentStepIndex: 0,
    totalSteps,
    passedCount: 0,
    failedCount: 0,
    durationMs: 0,
  };
}

export const useMatrixStore = create<MatrixStoreState>()(
  immer((set, get) => ({
    selectedBrowsers: DEFAULT_BROWSERS,
    maxConcurrency: 3,
    isMatrixRunning: false,
    activeMatrixRun: null,
    matrixHistory: [],
    selectedBrowserDetail: null,

    toggleBrowser: (browser: MatrixBrowserTarget) => {
      set((state) => {
        if (state.selectedBrowsers.includes(browser)) {
          // Keep at least 1 browser selected
          if (state.selectedBrowsers.length > 1) {
            state.selectedBrowsers = state.selectedBrowsers.filter((b) => b !== browser);
          }
        } else {
          state.selectedBrowsers.push(browser);
        }
      });
    },

    setBrowsers: (browsers: MatrixBrowserTarget[]) => {
      set((state) => {
        if (browsers.length > 0) {
          state.selectedBrowsers = [...browsers];
        }
      });
    },

    setMaxConcurrency: (concurrency: number) => {
      set((state) => {
        state.maxConcurrency = Math.max(1, Math.min(16, concurrency));
      });
    },

    startMatrixRun: (flowId: string, flowName?: string, totalSteps: number = 0) => {
      const selected = get().selectedBrowsers;
      const initialBrowsers = selected.reduce((acc, b) => {
        acc[b] = {
          ...createInitialWorkerProgress(b, totalSteps),
          status: 'queued',
        };
        return acc;
      }, {} as Record<MatrixBrowserTarget, MatrixWorkerProgress>);

      set((state) => {
        state.isMatrixRunning = true;
        state.activeMatrixRun = {
          flowId,
          flowName: flowName || flowId,
          timestamp: Date.now(),
          browsers: initialBrowsers,
          overallStatus: 'running',
          durationMs: 0,
        };
        state.selectedBrowserDetail = selected[0] || null;
      });
    },

    updateWorkerProgress: (browser: MatrixBrowserTarget, progress: Partial<MatrixWorkerProgress>) => {
      set((state) => {
        if (!state.activeMatrixRun) return;
        const current = state.activeMatrixRun.browsers[browser];
        if (current) {
          state.activeMatrixRun.browsers[browser] = {
            ...current,
            ...progress,
          };
        } else {
          state.activeMatrixRun.browsers[browser] = {
            ...createInitialWorkerProgress(browser),
            ...progress,
          };
        }
      });
    },

    completeMatrixRun: (summary: MatrixExecutionSummary) => {
      set((state) => {
        state.isMatrixRunning = false;
        state.activeMatrixRun = summary;
        state.matrixHistory.unshift(summary);
        // Keep max 50 historical runs in memory
        if (state.matrixHistory.length > 50) {
          state.matrixHistory = state.matrixHistory.slice(0, 50);
        }
      });
    },

    cancelMatrixRun: () => {
      set((state) => {
        state.isMatrixRunning = false;
        if (state.activeMatrixRun) {
          state.activeMatrixRun.overallStatus = 'failed';
          state.activeMatrixRun.error = 'Matrix run cancelled by user.';
          state.matrixHistory.unshift({ ...state.activeMatrixRun });
        }
      });
    },

    setSelectedBrowserDetail: (browser: MatrixBrowserTarget | null) => {
      set((state) => {
        state.selectedBrowserDetail = browser;
      });
    },

    clearHistory: () => {
      set((state) => {
        state.matrixHistory = [];
      });
    },
  }))
);
