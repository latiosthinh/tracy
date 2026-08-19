import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Browser } from 'playwright-core';
import { parseDocument } from 'yaml';
import type { CliOptions, CliSuiteResult, CliTestResult, CliStepResult, CliMatrixResult } from './types';
import * as deps from './runnerDeps';
import { generateUnifiedPatch, writePatchFile, type FilePatchInput } from './patchGenerator';
import { NetworkMockManager } from '../electron/core/network/networkMockManager';
import { MatrixWorkerPool, shouldExecuteStepForBrowser } from '../electron/core/matrix/workerPool';
import type { MatrixBrowserTarget, MatrixTask } from '../electron/core/matrix/types';
import { PerfObserverEngine, evaluatePerformanceAssertion } from '../electron/core/perf/perfObserverEngine';
import type { PerformanceAssertionResult, WebVitalsMetrics } from '../electron/core/perf/types';
import { generateMatrixJUnitXML, writeJUnitReport } from './reporters/junitReporter';
import { printMatrixSummary } from './reporters/consoleReporter';

export interface ParsedFlow {
  title?: string;
  name?: string;
  url?: string;
  browsers?: MatrixBrowserTarget[];
  matrix?: {
    browsers?: MatrixBrowserTarget[];
  };
  steps: Array<Record<string, any>>;
}

/**
 * Discovers YAML test flow files from target paths (files or directories).
 */
export async function discoverFlowFiles(targetPaths: string[]): Promise<string[]> {
  const discovered: string[] = [];
  const searchPaths = targetPaths.length > 0 ? targetPaths : ['./flows', '.'];

  for (const item of searchPaths) {
    try {
      const stat = await fs.stat(item);
      if (stat.isFile()) {
        if (item.endsWith('.yaml') || item.endsWith('.yml')) {
          discovered.push(path.resolve(item));
        }
      } else if (stat.isDirectory()) {
        const entries = await fs.readdir(item, { withFileTypes: true, recursive: true });
        for (const entry of entries) {
          if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
            // entry.parentPath is available in newer node, or resolve relative to item
            const parentDir = entry.parentPath || item;
            discovered.push(path.resolve(parentDir, entry.name));
          }
        }
      }
    } catch {
      // Path does not exist or unreadable, continue
    }
  }

  // Deduplicate discovered paths
  return Array.from(new Set(discovered));
}

/**
 * Normalizes raw YAML step into HealableStep object.
 */
function normalizeStep(rawStep: any): Record<string, any> {
  if (typeof rawStep === 'string') {
    return { action: 'click', selector: rawStep };
  }

  if (typeof rawStep !== 'object' || rawStep === null) {
    return { action: 'unknown' };
  }

  // Check known action keys as shorthand e.g. { navigate: 'http://...' }
  const actionKeys = [
    'navigate', 'click', 'leftClick', 'rightClick', 'hover',
    'doubleClick', 'fill', 'press', 'waitFor', 'assertVisible',
    'assertNotVisible', 'assertTitle', 'assertUrl', 'tap',
    'mockRoute', 'unmockRoute', 'replayHar', 'recordHar', 'assertRequest',
    'assertPerformance', 'assert_performance', 'throttle'
  ];

  for (const key of actionKeys) {
    if (key in rawStep && !('action' in rawStep)) {
      const val = rawStep[key];
      const rest = { ...rawStep };
      delete rest[key];

      if (key === 'navigate') {
        return { action: 'navigate', url: val, ...rest };
      }
      if (key === 'fill') {
        return { action: 'fill', selector: val, text: rawStep.text || rawStep.value || '', ...rest };
      }
      if (key === 'press') {
        return { action: 'press', key: val, ...rest };
      }
      if (key === 'mockRoute') {
        return { action: 'mockRoute', ...(typeof val === 'object' && val !== null ? val : { url: val }), ...rest };
      }
      if (key === 'unmockRoute') {
        return { action: 'unmockRoute', selector: typeof val === 'string' ? val : (val?.url || val?.id), ...rest };
      }
      if (key === 'replayHar') {
        return { action: 'replayHar', path: typeof val === 'string' ? val : val?.path, ...rest };
      }
      if (key === 'assertRequest') {
        return { action: 'assertRequest', ...(typeof val === 'object' && val !== null ? val : { url: val }), ...rest };
      }
      if (key === 'assertPerformance' || key === 'assert_performance') {
        return { action: 'assertPerformance', ...(typeof val === 'object' && val !== null ? val : {}), ...rest };
      }
      if (key === 'throttle') {
        return { action: 'throttle', ...(typeof val === 'object' && val !== null ? val : { preset: val }), ...rest };
      }
      return { action: key, selector: val, ...rest };
    }
  }

  return { ...rawStep };
}

/**
 * Executes a single YAML test flow inside an isolated Playwright BrowserContext.
 */
export async function executeSingleFlow(
  filePath: string,
  options: CliOptions,
  browser: Browser,
  patchesCollector?: FilePatchInput[],
  browserName: MatrixBrowserTarget = 'chromium'
): Promise<CliTestResult> {
  const start = Date.now();
  const flowRaw = await fs.readFile(filePath, 'utf-8');
  let originalFileContent = flowRaw;
  const doc = parseDocument(flowRaw);
  const flowJson = (doc.toJSON() || {}) as Record<string, any>;

  const flowName = flowJson.name || flowJson.title || path.basename(filePath, path.extname(filePath));
  const stepsRaw: any[] = Array.isArray(flowJson.steps) ? flowJson.steps : [];

  const stepResults: CliStepResult[] = [];
  let flowStatus: 'passed' | 'failed' = 'passed';
  let flowError: string | undefined;
  let healedCount = 0;
  const artifacts: { screenshotPath?: string; domSnapshotPath?: string } = {};

  const context = await browser.newContext({
    baseURL: options.baseUrl || flowJson.url || undefined
  });

  const mockManager = new NetworkMockManager();
  await mockManager.attachToContext(context);

  const perfEngine = new PerfObserverEngine();
  await perfEngine.attachToContext(context as any, browserName);

  // Apply top-level mocks/har if declared in flow
  const flowMocks = flowJson.mocks || flowJson.metadata?.mocks;
  if (Array.isArray(flowMocks)) {
    for (const rule of flowMocks) {
      mockManager.addRule(rule);
    }
  }

  const flowHar = flowJson.har || flowJson.metadata?.har;
  if (flowHar?.path) {
    await mockManager.attachHarReplay(context, flowHar.path, flowHar);
  }

  const shouldTrace = options.ci || options.output !== undefined;
  if (shouldTrace) {
    await context.tracing.start({ screenshots: true, snapshots: true });
  }

  const page = await context.newPage();
  const safeSlug = deps.sanitizeFlowName(flowName);
  const tracePath = path.resolve(options.output || 'test-results', safeSlug, `trace-${browserName}.zip`);

  const perfAssertions: PerformanceAssertionResult[] = [];
  let flowMetrics: WebVitalsMetrics | undefined;

  try {
    // Apply flow-level throttling if specified in flow or CLI options
    const throttleConfig = flowJson.throttling || options.throttle;
    if (throttleConfig) {
      await perfEngine.applyThrottling(page as any, throttleConfig, browserName);
    }
    if (options.cpuThrottlingRate && browserName === 'chromium') {
      await perfEngine.applyThrottling(page as any, { cpuSlowdownRate: options.cpuThrottlingRate }, browserName);
    }

    // If flow has a top-level url and no explicit first navigate step, navigate to it
    if (flowJson.url && (!stepsRaw[0] || !('navigate' in stepsRaw[0]))) {
      await page.goto(flowJson.url, { waitUntil: 'domcontentloaded', timeout: options.timeout });
    }

    for (let i = 0; i < stepsRaw.length; i++) {
      const raw = stepsRaw[i];
      const normalized = normalizeStep(raw);
      const commandStr = normalized.action + (normalized.selector ? ` "${normalized.selector}"` : (normalized.url ? ` "${normalized.url}"` : ''));

      // Check browser conditionals
      const check = shouldExecuteStepForBrowser(raw, browserName);
      if (!check.execute) {
        stepResults.push({
          index: i,
          command: commandStr,
          status: 'skipped',
          durationMs: 0,
          skippedReason: check.reason,
        });
        continue;
      }

      // Intercept network mock / assert steps directly
      if (normalized.action === 'mockRoute') {
        const rule = {
          url: normalized.url || normalized.selector,
          method: normalized.method,
          status: normalized.status,
          headers: normalized.headers,
          body: normalized.body,
          fixture: normalized.fixture,
          delayMs: normalized.delayMs,
          abort: normalized.abort,
          times: normalized.times,
          ...normalized.args,
        };
        mockManager.addRule(rule);
        stepResults.push({
          index: i,
          command: commandStr,
          status: 'passed',
          durationMs: 1,
        });
        continue;
      }

      if (normalized.action === 'unmockRoute') {
        mockManager.removeRule(normalized.selector || normalized.url || normalized.id);
        stepResults.push({
          index: i,
          command: commandStr,
          status: 'passed',
          durationMs: 1,
        });
        continue;
      }

      if (normalized.action === 'replayHar') {
        await mockManager.attachHarReplay(context, normalized.path || normalized.url || normalized.selector, normalized);
        stepResults.push({
          index: i,
          command: commandStr,
          status: 'passed',
          durationMs: 1,
        });
        continue;
      }

      if (normalized.action === 'assertRequest') {
        const criteria = {
          url: normalized.url || normalized.selector,
          method: normalized.method,
          count: normalized.count,
          minCount: normalized.minCount,
          maxCount: normalized.maxCount,
          queryParams: normalized.queryParams,
          bodyPattern: normalized.bodyPattern,
          ...normalized.args,
        };
        const assertRes = mockManager.assertRequest(criteria);
        if (!assertRes.matched) {
          flowStatus = 'failed';
          flowError = assertRes.error || `assertRequest failed for '${criteria.url}'`;
          stepResults.push({
            index: i,
            command: commandStr,
            status: 'failed',
            durationMs: 1,
            error: flowError,
          });
          // Record remaining steps as skipped
          for (let j = i + 1; j < stepsRaw.length; j++) {
            const remNorm = normalizeStep(stepsRaw[j]);
            stepResults.push({
              index: j,
              command: remNorm.action + (remNorm.selector ? ` "${remNorm.selector}"` : ''),
              status: 'skipped',
              durationMs: 0,
            });
          }
          break;
        }
        stepResults.push({
          index: i,
          command: commandStr,
          status: 'passed',
          durationMs: 1,
        });
        continue;
      }

      if (normalized.action === 'throttle') {
        const throttleConfig = {
          preset: normalized.preset,
          latencyMs: normalized.latencyMs,
          downloadKbps: normalized.downloadKbps,
          uploadKbps: normalized.uploadKbps,
          cpuSlowdownRate: normalized.cpuSlowdownRate || normalized.cpuSlowdown,
          offline: normalized.offline,
        };
        await perfEngine.applyThrottling(page as any, throttleConfig, browserName);
        stepResults.push({
          index: i,
          command: commandStr,
          status: 'passed',
          durationMs: 1,
        });
        continue;
      }

      if (normalized.action === 'assertPerformance') {
        const metrics = await perfEngine.harvestMetrics(page as any, browserName);
        flowMetrics = metrics;
        const warnOnly = Boolean(normalized.warnOnly);
        const evalRes = evaluatePerformanceAssertion(metrics, normalized, warnOnly);
        perfAssertions.push(evalRes);

        if (!evalRes.passed && !warnOnly) {
          flowStatus = 'failed';
          flowError = evalRes.summary;
          stepResults.push({
            index: i,
            command: commandStr,
            status: 'failed',
            durationMs: 5,
            error: evalRes.summary,
            perfResult: evalRes,
          });

          // Record remaining steps as skipped
          for (let j = i + 1; j < stepsRaw.length; j++) {
            const remNorm = normalizeStep(stepsRaw[j]);
            stepResults.push({
              index: j,
              command: remNorm.action + (remNorm.selector ? ` "${remNorm.selector}"` : ''),
              status: 'skipped',
              durationMs: 0,
            });
          }
          break;
        } else {
          stepResults.push({
            index: i,
            command: commandStr,
            status: 'passed',
            durationMs: 5,
            perfResult: evalRes,
          });
          continue;
        }
      }

      const execResult = await deps.executeStepWithHealing(page, normalized as any, {
        autoHeal: options.heal,
        timeoutMs: options.timeout
      });

      if (!execResult.success) {
        flowStatus = 'failed';
        flowError = execResult.error || `Step ${i + 1} failed`;

        // Capture failure artifacts
        const failArt = await deps.saveFailureArtifacts({
          outputDir: options.output || 'test-results',
          flowName,
          stepIndex: i,
          page,
          error: flowError
        });
        if (failArt.screenshotPath) artifacts.screenshotPath = failArt.screenshotPath;
        if (failArt.domSnapshotPath) artifacts.domSnapshotPath = failArt.domSnapshotPath;

        stepResults.push({
          index: i,
          command: commandStr,
          status: 'failed',
          durationMs: execResult.durationMs,
          error: execResult.error
        });

        // Record remaining steps as skipped
        for (let j = i + 1; j < stepsRaw.length; j++) {
          const remNorm = normalizeStep(stepsRaw[j]);
          stepResults.push({
            index: j,
            command: remNorm.action + (remNorm.selector ? ` "${remNorm.selector}"` : ''),
            status: 'skipped',
            durationMs: 0
          });
        }
        break;
      }

      // Step succeeded (either clean or auto-healed)
      if (execResult.healed && execResult.healingDetails) {
        healedCount++;
        const healDetails = execResult.healingDetails;

        // Capture heal artifacts
        const healArt = await deps.saveHealArtifacts({
          outputDir: options.output || 'test-results',
          flowName,
          stepIndex: i,
          page,
          healingResult: healDetails
        });
        if (healArt.screenshotPath) artifacts.screenshotPath = healArt.screenshotPath;
        if (healArt.domSnapshotPath) artifacts.domSnapshotPath = healArt.domSnapshotPath;

        // Auto-patch on-disk YAML file
        try {
          const patchRes = await deps.patchYamlFile(filePath, i, healDetails.healedSelector, {
            confidence: healDetails.confidence,
            healedAt: new Date().toISOString()
          });
          if (patchRes.patched) {
            if (patchesCollector) {
              patchesCollector.push({
                filePath,
                originalYaml: originalFileContent,
                updatedYaml: patchRes.updatedYaml
              });
            }
            originalFileContent = patchRes.updatedYaml;
          }
        } catch {
          // File patching error shouldn't crash execution run
        }

        stepResults.push({
          index: i,
          command: commandStr,
          status: 'passed',
          durationMs: execResult.durationMs,
          healResult: {
            healedSelector: healDetails.healedSelector,
            confidence: healDetails.confidence,
            explanation: healDetails.reason,
            strategy: healDetails.strategy
          }
        });
      } else {
        stepResults.push({
          index: i,
          command: commandStr,
          status: 'passed',
          durationMs: execResult.durationMs
        });
      }
    }

    // Always harvest final telemetry at the end of flow
    if (!flowMetrics) {
      flowMetrics = await perfEngine.harvestMetrics(page as any, browserName);
    }

    // Evaluate flow-level performance budget if declared
    const flowBudget = flowJson.performanceBudget || flowJson.metadata?.performanceBudget;
    if (flowBudget && typeof flowBudget === 'object') {
      const budgetEval = evaluatePerformanceAssertion(flowMetrics, flowBudget, false);
      perfAssertions.push(budgetEval);
      if (!budgetEval.passed && flowStatus === 'passed') {
        flowStatus = 'failed';
        flowError = budgetEval.summary;
      }
    }
  } catch (err: any) {
    flowStatus = 'failed';
    flowError = err?.message || String(err);
  } finally {
    try {
      await perfEngine.clearThrottling(page as any, browserName);
    } catch {
      // Ignore throttling reset error
    }

    try {
      await mockManager.cleanup();
    } catch {
      // Ignore mock cleanup error
    }

    if (shouldTrace && (flowStatus === 'failed' || healedCount > 0)) {
      try {
        await fs.mkdir(path.dirname(tracePath), { recursive: true });
        await context.tracing.stop({ path: tracePath });
      } catch {
        // Trace capture failed
      }
    } else if (shouldTrace) {
      try {
        await context.tracing.stop();
      } catch {
        // Ignore
      }
    }

    try {
      await context.close();
    } catch {
      // Ignore cleanup error
    }
  }

  return {
    flowPath: filePath,
    flowName,
    browser: browserName,
    status: flowStatus,
    durationMs: Date.now() - start,
    steps: stepResults,
    error: flowError,
    healedCount,
    metrics: flowMetrics,
    perfAssertions: perfAssertions.length > 0 ? perfAssertions : undefined,
    artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined
  };
}

/**
 * Executes a matrix of flows across specified browser engines with worker concurrency.
 */
export async function executeMatrixFlows(
  flowPaths: string[],
  options: CliOptions
): Promise<CliMatrixResult> {
  const startTime = new Date().toISOString();
  const matrixStart = Date.now();

  const targetBrowsers = options.browsers && options.browsers.length > 0
    ? options.browsers
    : (['chromium'] as MatrixBrowserTarget[]);

  const patchesCollector: FilePatchInput[] = [];
  const pool = new MatrixWorkerPool({
    maxWorkers: options.workers || options.concurrency,
    headless: options.headless,
  });

  const tasks: MatrixTask<{ filePath: string; options: CliOptions }>[] = [];
  for (const filePath of flowPaths) {
    let flowBrowsers = targetBrowsers;
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const doc = parseDocument(content);
      const flowJson = (doc.toJSON() || {}) as ParsedFlow;
      if (flowJson.matrix?.browsers && Array.isArray(flowJson.matrix.browsers)) {
        flowBrowsers = flowJson.matrix.browsers;
      } else if (flowJson.browsers && Array.isArray(flowJson.browsers)) {
        flowBrowsers = flowJson.browsers;
      }
    } catch {
      // Use fallback browsers
    }

    for (const b of flowBrowsers) {
      tasks.push({
        id: `${path.basename(filePath)}_${b}`,
        flow: { filePath, options },
        flowPath: filePath,
        browser: b,
      });
    }
  }

  const results: CliTestResult[] = [];
  const flowResults = new Map<string, Record<string, CliTestResult>>();

  try {
    const taskResults = await pool.runTasks(tasks, async (browser, _context, task) => {
      return executeSingleFlow(
        task.flow.filePath,
        task.flow.options,
        browser,
        patchesCollector,
        task.browser
      );
    });

    for (const res of taskResults) {
      results.push(res);
      const fp = res.flowPath;
      if (!flowResults.has(fp)) {
        flowResults.set(fp, {});
      }
      if (res.browser) {
        flowResults.get(fp)![res.browser] = res;
      }
    }
  } finally {
    await pool.destroy();
  }

  // Generate unified .patch file if any files were patched
  if (options.heal && patchesCollector.length > 0) {
    const patchContent = generateUnifiedPatch(patchesCollector);
    const patchOutputPath = options.patchFile || path.join(options.output || 'test-results', 'self-heal.patch');
    if (patchContent) {
      await writePatchFile(patchOutputPath, patchContent);
    }
  }

  const passedExecutions = results.filter((r) => r.status === 'passed').length;
  const failedExecutions = results.filter((r) => r.status === 'failed').length;
  const skippedExecutions = results.filter((r) => (r as any).status === 'skipped').length;

  return {
    totalExecutions: results.length,
    passedExecutions,
    failedExecutions,
    skippedExecutions,
    totalDurationMs: Date.now() - matrixStart,
    browsers: targetBrowsers,
    flowResults,
    results,
    startTime,
    endTime: new Date().toISOString(),
  };
}

/**
 * Executes a suite of YAML flows headlessly in Playwright (single browser or matrix).
 */
export async function runFlowsHeadless(options: CliOptions): Promise<CliSuiteResult> {
  const startTime = new Date().toISOString();
  const suiteStart = Date.now();

  const flowFiles = await discoverFlowFiles(options.paths);

  if (flowFiles.length === 0) {
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      healedTests: 0,
      totalDurationMs: Date.now() - suiteStart,
      results: [],
      startTime,
      endTime: new Date().toISOString()
    };
  }

  const matrixResult = await executeMatrixFlows(flowFiles, options);

  // Write reports based on options.reporter
  const outputDir = options.output || 'test-results';
  if (options.reporter === 'junit' || options.reporter === 'all') {
    const xml = generateMatrixJUnitXML(matrixResult);
    await writeJUnitReport(path.join(outputDir, 'junit.xml'), xml);
  }

  if (options.reporter === 'json' || options.reporter === 'all') {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(
      path.join(outputDir, 'matrix-report.json'),
      JSON.stringify(
        {
          totalExecutions: matrixResult.totalExecutions,
          passedExecutions: matrixResult.passedExecutions,
          failedExecutions: matrixResult.failedExecutions,
          skippedExecutions: matrixResult.skippedExecutions,
          totalDurationMs: matrixResult.totalDurationMs,
          browsers: matrixResult.browsers,
          results: matrixResult.results,
          startTime: matrixResult.startTime,
          endTime: matrixResult.endTime,
        },
        null,
        2
      ),
      'utf-8'
    );
  }

  if (options.reporter === 'console' || options.reporter === 'all') {
    printMatrixSummary(matrixResult);
  }

  const healedTests = matrixResult.results.reduce((acc, r) => acc + (r.healedCount > 0 ? 1 : 0), 0);

  return {
    totalTests: matrixResult.totalExecutions,
    passedTests: matrixResult.passedExecutions,
    failedTests: matrixResult.failedExecutions,
    healedTests,
    totalDurationMs: matrixResult.totalDurationMs,
    results: matrixResult.results,
    startTime: matrixResult.startTime,
    endTime: matrixResult.endTime,
  };
}
