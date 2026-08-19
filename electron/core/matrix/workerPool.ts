import os from 'os';
import * as playwright from 'playwright-core';
import type { Browser, BrowserContext } from 'playwright-core';
import type { StepWhenCondition, SupportedBrowser } from '@/src/types/flow';
import type { MatrixBrowserTarget, MatrixTask, WorkerPoolOptions } from './types';

export function shouldExecuteStepForBrowser(
  step: { when?: StepWhenCondition; skip_if?: StepWhenCondition },
  currentBrowser: MatrixBrowserTarget
): { execute: boolean; reason?: string } {
  if (step.when?.browser) {
    const allowed = Array.isArray(step.when.browser) ? step.when.browser : [step.when.browser];
    if (!allowed.includes(currentBrowser as SupportedBrowser)) {
      return {
        execute: false,
        reason: `Skipped: when.browser does not match '${currentBrowser}' (requires ${allowed.join(', ')})`,
      };
    }
  }

  if (step.skip_if?.browser) {
    const skipped = Array.isArray(step.skip_if.browser) ? step.skip_if.browser : [step.skip_if.browser];
    if (skipped.includes(currentBrowser as SupportedBrowser)) {
      return {
        execute: false,
        reason: `Skipped: skip_if.browser matched '${currentBrowser}'`,
      };
    }
  }

  return { execute: true };
}

class AsyncSemaphore {
  private queue: Array<() => void> = [];
  private currentRunning = 0;

  constructor(private readonly maxConcurrency: number) {}

  async acquire(): Promise<void> {
    if (this.currentRunning < this.maxConcurrency) {
      this.currentRunning++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.currentRunning++;
        resolve();
      });
    });
  }

  release(): void {
    this.currentRunning = Math.max(0, this.currentRunning - 1);
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

export class MatrixWorkerPool {
  private readonly maxWorkers: number;
  private readonly options: WorkerPoolOptions;
  private readonly semaphore: AsyncSemaphore;
  private readonly activeBrowsers = new Set<Browser>();
  private readonly activeContexts = new Set<BrowserContext>();
  private isDestroyed = false;
  private readonly processCleanupListener?: () => void;

  constructor(options?: WorkerPoolOptions) {
    this.options = options || {};
    const cpuCount = os.cpus()?.length || 2;
    this.maxWorkers = this.options.maxWorkers ?? Math.max(1, Math.min(4, Math.floor(cpuCount / 2)));
    this.semaphore = new AsyncSemaphore(this.maxWorkers);

    if (typeof process !== 'undefined' && typeof process.once === 'function') {
      this.processCleanupListener = () => {
        this.destroy().catch(() => {});
      };
      process.once('exit', this.processCleanupListener);
      process.once('SIGINT', this.processCleanupListener);
    }
  }

  getMaxWorkers(): number {
    return this.maxWorkers;
  }

  getActiveBrowserCount(): number {
    return this.activeBrowsers.size;
  }

  getActiveContextCount(): number {
    return this.activeContexts.size;
  }

  async runTask<TResult>(
    task: MatrixTask,
    runner: (browser: Browser, context: BrowserContext, task: MatrixTask) => Promise<TResult>
  ): Promise<TResult> {
    if (this.isDestroyed) {
      throw new Error('MatrixWorkerPool has been destroyed');
    }

    await this.semaphore.acquire();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      const engineType = task.browser;
      const engine = playwright[engineType];
      if (!engine) {
        throw new Error(`Unsupported browser engine: ${engineType}`);
      }

      const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
      browser = await engine.launch({
        headless: this.options.headless ?? true,
        args: launchArgs,
      });
      this.activeBrowsers.add(browser);

      context = await browser.newContext({
        viewport: this.options.viewport ?? { width: 1280, height: 720 },
        deviceScaleFactor: this.options.deviceScaleFactor ?? 1,
        locale: this.options.locale ?? 'en-US',
        timezoneId: this.options.timezoneId ?? 'UTC',
      });
      this.activeContexts.add(context);

      return await runner(browser, context, task);
    } finally {
      if (context) {
        this.activeContexts.delete(context);
        try {
          await context.close();
        } catch {
          // Ignore close errors on crashed context
        }
      }
      if (browser) {
        this.activeBrowsers.delete(browser);
        try {
          await browser.close();
        } catch {
          // Ignore close errors on crashed browser
        }
      }
      this.semaphore.release();
    }
  }

  async runTasks<TResult>(
    tasks: MatrixTask[],
    runner: (browser: Browser, context: BrowserContext, task: MatrixTask) => Promise<TResult>,
    onProgress?: (completed: number, total: number, result: TResult) => void
  ): Promise<TResult[]> {
    let completedCount = 0;
    const totalCount = tasks.length;

    const executions = tasks.map(async (task) => {
      const result = await this.runTask(task, runner);
      completedCount++;
      if (onProgress) {
        onProgress(completedCount, totalCount, result);
      }
      return result;
    });

    return Promise.all(executions);
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    const contextPromises = Array.from(this.activeContexts).map((ctx) =>
      ctx.close().catch(() => {})
    );
    const browserPromises = Array.from(this.activeBrowsers).map((br) =>
      br.close().catch(() => {})
    );

    this.activeContexts.clear();
    this.activeBrowsers.clear();

    await Promise.all([...contextPromises, ...browserPromises]);
  }
}
