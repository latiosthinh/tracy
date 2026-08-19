import { describe, it, expect, beforeEach } from 'vitest';
import { useMatrixStore } from './matrixStore';
import type { MatrixExecutionSummary } from '@/src/types/matrix';

describe('useMatrixStore', () => {
  beforeEach(() => {
    useMatrixStore.setState({
      selectedBrowsers: ['chromium', 'firefox', 'webkit'],
      maxConcurrency: 3,
      isMatrixRunning: false,
      activeMatrixRun: null,
      matrixHistory: [],
      selectedBrowserDetail: null,
    });
  });

  it('toggles browser selections with minimum 1 invariant', () => {
    expect(useMatrixStore.getState().selectedBrowsers).toEqual(['chromium', 'firefox', 'webkit']);

    // Toggle out webkit
    useMatrixStore.getState().toggleBrowser('webkit');
    expect(useMatrixStore.getState().selectedBrowsers).toEqual(['chromium', 'firefox']);

    // Toggle out firefox
    useMatrixStore.getState().toggleBrowser('firefox');
    expect(useMatrixStore.getState().selectedBrowsers).toEqual(['chromium']);

    // Toggle out last browser (should be ignored - at least 1 must remain)
    useMatrixStore.getState().toggleBrowser('chromium');
    expect(useMatrixStore.getState().selectedBrowsers).toEqual(['chromium']);

    // Toggle webkit back in
    useMatrixStore.getState().toggleBrowser('webkit');
    expect(useMatrixStore.getState().selectedBrowsers).toEqual(['chromium', 'webkit']);
  });

  it('sets max concurrency with bounds checking', () => {
    useMatrixStore.getState().setMaxConcurrency(5);
    expect(useMatrixStore.getState().maxConcurrency).toBe(5);

    // Below min
    useMatrixStore.getState().setMaxConcurrency(0);
    expect(useMatrixStore.getState().maxConcurrency).toBe(1);

    // Above max
    useMatrixStore.getState().setMaxConcurrency(32);
    expect(useMatrixStore.getState().maxConcurrency).toBe(16);
  });

  it('starts matrix run, updates per-browser worker progress, and completes run', () => {
    useMatrixStore.getState().startMatrixRun('flow-123', 'Checkout Flow', 5);

    const state1 = useMatrixStore.getState();
    expect(state1.isMatrixRunning).toBe(true);
    expect(state1.activeMatrixRun?.flowId).toBe('flow-123');
    expect(state1.activeMatrixRun?.browsers.chromium.status).toBe('queued');
    expect(state1.activeMatrixRun?.browsers.firefox.status).toBe('queued');
    expect(state1.activeMatrixRun?.browsers.webkit.status).toBe('queued');

    // Update chromium progress
    useMatrixStore.getState().updateWorkerProgress('chromium', {
      status: 'running',
      currentStepIndex: 2,
      currentStepName: 'Fill shipping address',
      passedCount: 2,
    });

    const state2 = useMatrixStore.getState();
    expect(state2.activeMatrixRun?.browsers.chromium.status).toBe('running');
    expect(state2.activeMatrixRun?.browsers.chromium.currentStepIndex).toBe(2);
    expect(state2.activeMatrixRun?.browsers.chromium.currentStepName).toBe('Fill shipping address');

    // Complete run
    const summary: MatrixExecutionSummary = {
      flowId: 'flow-123',
      flowName: 'Checkout Flow',
      timestamp: Date.now(),
      overallStatus: 'passed',
      durationMs: 4200,
      browsers: {
        chromium: {
          browser: 'chromium',
          status: 'passed',
          currentStepIndex: 5,
          totalSteps: 5,
          passedCount: 5,
          failedCount: 0,
          durationMs: 3800,
        },
        firefox: {
          browser: 'firefox',
          status: 'passed',
          currentStepIndex: 5,
          totalSteps: 5,
          passedCount: 5,
          failedCount: 0,
          durationMs: 4100,
        },
        webkit: {
          browser: 'webkit',
          status: 'passed',
          currentStepIndex: 5,
          totalSteps: 5,
          passedCount: 5,
          failedCount: 0,
          durationMs: 4200,
        },
      },
    };

    useMatrixStore.getState().completeMatrixRun(summary);
    const state3 = useMatrixStore.getState();
    expect(state3.isMatrixRunning).toBe(false);
    expect(state3.activeMatrixRun?.overallStatus).toBe('passed');
    expect(state3.matrixHistory).toHaveLength(1);
    expect(state3.matrixHistory[0].flowId).toBe('flow-123');
  });

  it('cancels active matrix run and records cancellation to history', () => {
    useMatrixStore.getState().startMatrixRun('flow-abort', 'Smoke Flow', 3);
    expect(useMatrixStore.getState().isMatrixRunning).toBe(true);

    useMatrixStore.getState().cancelMatrixRun();
    expect(useMatrixStore.getState().isMatrixRunning).toBe(false);
    expect(useMatrixStore.getState().activeMatrixRun?.overallStatus).toBe('failed');
    expect(useMatrixStore.getState().activeMatrixRun?.error).toContain('cancelled');
    expect(useMatrixStore.getState().matrixHistory).toHaveLength(1);
  });
});
