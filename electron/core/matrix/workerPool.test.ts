import { describe, it, expect, vi, afterEach } from 'vitest';
import os from 'os';
import { MatrixWorkerPool, shouldExecuteStepForBrowser } from './workerPool';
import type { MatrixTask } from './types';
import * as playwright from 'playwright-core';

vi.mock('playwright-core', () => {
  const mockContext = {
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    chromium: {
      launch: vi.fn().mockResolvedValue({ ...mockBrowser }),
    },
    firefox: {
      launch: vi.fn().mockResolvedValue({ ...mockBrowser }),
    },
    webkit: {
      launch: vi.fn().mockResolvedValue({ ...mockBrowser }),
    },
  };
});

describe('shouldExecuteStepForBrowser', () => {
  it('returns true when step has no conditionals', () => {
    const result = shouldExecuteStepForBrowser({}, 'chromium');
    expect(result.execute).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('handles when.browser match (single string & array)', () => {
    expect(shouldExecuteStepForBrowser({ when: { browser: 'chromium' } }, 'chromium').execute).toBe(true);
    expect(shouldExecuteStepForBrowser({ when: { browser: ['chromium', 'firefox'] } }, 'firefox').execute).toBe(true);
    
    const mismatch = shouldExecuteStepForBrowser({ when: { browser: 'chromium' } }, 'firefox');
    expect(mismatch.execute).toBe(false);
    expect(mismatch.reason).toContain('when.browser does not match');

    const mismatchArr = shouldExecuteStepForBrowser({ when: { browser: ['firefox', 'webkit'] } }, 'chromium');
    expect(mismatchArr.execute).toBe(false);
    expect(mismatchArr.reason).toContain('when.browser does not match');
  });

  it('handles skip_if.browser match (single string & array)', () => {
    const skipped = shouldExecuteStepForBrowser({ skip_if: { browser: 'webkit' } }, 'webkit');
    expect(skipped.execute).toBe(false);
    expect(skipped.reason).toContain('skip_if.browser matched');

    const skippedArr = shouldExecuteStepForBrowser({ skip_if: { browser: ['chromium', 'webkit'] } }, 'chromium');
    expect(skippedArr.execute).toBe(false);
    expect(skippedArr.reason).toContain('skip_if.browser matched');

    const pass = shouldExecuteStepForBrowser({ skip_if: { browser: 'webkit' } }, 'chromium');
    expect(pass.execute).toBe(true);
  });

  it('evaluates both when and skip_if correctly', () => {
    // Matches when, but matches skip_if -> should skip
    const result = shouldExecuteStepForBrowser({
      when: { browser: ['chromium', 'firefox'] },
      skip_if: { browser: 'firefox' }
    }, 'firefox');
    expect(result.execute).toBe(false);
    expect(result.reason).toContain('skip_if.browser matched');
  });
});

describe('MatrixWorkerPool', () => {
  let pool: MatrixWorkerPool;

  afterEach(async () => {
    if (pool) {
      await pool.destroy();
    }
    vi.clearAllMocks();
  });

  it('initializes with default bounded concurrency based on CPU count', () => {
    const expected = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));
    pool = new MatrixWorkerPool();
    expect(pool.getMaxWorkers()).toBe(expected);

    const customPool = new MatrixWorkerPool({ maxWorkers: 6 });
    expect(customPool.getMaxWorkers()).toBe(6);
  });

  it('launches target browser engines dynamically and passes isolated context', async () => {
    pool = new MatrixWorkerPool({ maxWorkers: 2 });
    const task: MatrixTask = {
      id: 'task-1',
      browser: 'firefox',
      flow: { name: 'sample' },
    };

    let runnerExecuted = false;
    await pool.runTask(task, async (_browser, _context, t) => {
      runnerExecuted = true;
      expect(t.browser).toBe('firefox');
      return 'done';
    });

    expect(playwright.firefox.launch).toHaveBeenCalled();
    expect(runnerExecuted).toBe(true);
  });

  it('bounds concurrency when running multiple tasks', async () => {
    pool = new MatrixWorkerPool({ maxWorkers: 2 });
    let activeWorkers = 0;
    let maxObservedActive = 0;

    const tasks: MatrixTask[] = [
      { id: '1', browser: 'chromium', flow: {} },
      { id: '2', browser: 'firefox', flow: {} },
      { id: '3', browser: 'webkit', flow: {} },
      { id: '4', browser: 'chromium', flow: {} },
    ];

    const progressReports: number[] = [];

    const results = await pool.runTasks(tasks, async () => {
      activeWorkers++;
      maxObservedActive = Math.max(maxObservedActive, activeWorkers);
      await new Promise((r) => setTimeout(r, 25));
      activeWorkers--;
      return 'ok';
    }, (completed, total) => {
      progressReports.push(completed);
    });

    expect(results).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(maxObservedActive).toBeLessThanOrEqual(2);
    expect(progressReports).toHaveLength(4);
    expect(progressReports[3]).toBe(4);
  });

  it('guarantees cleanup of browser and context instances even on error', async () => {
    pool = new MatrixWorkerPool({ maxWorkers: 1 });
    const task: MatrixTask = {
      id: 'fail-task',
      browser: 'chromium',
      flow: {},
    };

    await expect(pool.runTask(task, async () => {
      throw new Error('Test run exploded');
    })).rejects.toThrow('Test run exploded');

    expect(pool.getActiveBrowserCount()).toBe(0);
    expect(pool.getActiveContextCount()).toBe(0);
  });

  it('destroy() terminates active browsers and contexts gracefully', async () => {
    pool = new MatrixWorkerPool({ maxWorkers: 2 });
    // Destroy pool
    await pool.destroy();
    expect(pool.getActiveBrowserCount()).toBe(0);
  });
});
