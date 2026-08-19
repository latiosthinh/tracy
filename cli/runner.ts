import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { chromium, type Browser } from 'playwright-core';
import { parseDocument } from 'yaml';
import type { CliOptions, CliSuiteResult, CliTestResult, CliStepResult } from './types';
import * as deps from './runnerDeps';
import { generateUnifiedPatch, writePatchFile, type FilePatchInput } from './patchGenerator';

export interface ParsedFlow {
  title?: string;
  name?: string;
  url?: string;
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
    'assertNotVisible', 'assertTitle', 'assertUrl', 'tap'
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
  patchesCollector?: FilePatchInput[]
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

  const shouldTrace = options.ci || options.output !== undefined;
  if (shouldTrace) {
    await context.tracing.start({ screenshots: true, snapshots: true });
  }

  const page = await context.newPage();
  const safeSlug = deps.sanitizeFlowName(flowName);
  const tracePath = path.resolve(options.output || 'test-results', safeSlug, 'trace.zip');

  try {
    // If flow has a top-level url and no explicit first navigate step, navigate to it
    if (flowJson.url && (!stepsRaw[0] || !('navigate' in stepsRaw[0]))) {
      await page.goto(flowJson.url, { waitUntil: 'domcontentloaded', timeout: options.timeout });
    }

    for (let i = 0; i < stepsRaw.length; i++) {
      const raw = stepsRaw[i];
      const normalized = normalizeStep(raw);
      const commandStr = normalized.action + (normalized.selector ? ` "${normalized.selector}"` : (normalized.url ? ` "${normalized.url}"` : ''));

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
  } catch (err: any) {
    flowStatus = 'failed';
    flowError = err?.message || String(err);
  } finally {
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
    status: flowStatus,
    durationMs: Date.now() - start,
    steps: stepResults,
    error: flowError,
    healedCount,
    artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined
  };
}

/**
 * Executes a suite of YAML flows headlessly in Playwright Chromium.
 */
export async function runFlowsHeadless(options: CliOptions): Promise<CliSuiteResult> {
  const startTime = new Date().toISOString();
  const suiteStart = Date.now();

  const flowFiles = await discoverFlowFiles(options.paths);

  const results: CliTestResult[] = [];
  const patchesCollector: FilePatchInput[] = [];

  let passedTests = 0;
  let failedTests = 0;
  let healedTests = 0;

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

  const browser = await chromium.launch({
    headless: options.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const concurrency = Math.max(1, options.concurrency || 1);

    if (concurrency === 1 || flowFiles.length === 1) {
      for (const file of flowFiles) {
        const testRes = await executeSingleFlow(file, options, browser, patchesCollector);
        results.push(testRes);
        if (testRes.status === 'passed') {
          passedTests++;
        } else {
          failedTests++;
        }
        if (testRes.healedCount > 0) {
          healedTests++;
        }
      }
    } else {
      // Chunk flows by concurrency limit
      for (let i = 0; i < flowFiles.length; i += concurrency) {
        const chunk = flowFiles.slice(i, i + concurrency);
        const chunkResults = await Promise.all(
          chunk.map((file) => executeSingleFlow(file, options, browser, patchesCollector))
        );

        for (const testRes of chunkResults) {
          results.push(testRes);
          if (testRes.status === 'passed') {
            passedTests++;
          } else {
            failedTests++;
          }
          if (testRes.healedCount > 0) {
            healedTests++;
          }
        }
      }
    }
  } finally {
    try {
      await browser.close();
    } catch {
      // Ignore browser close error
    }
  }

  // Generate unified .patch file if any files were patched
  if (options.heal && patchesCollector.length > 0) {
    const patchContent = generateUnifiedPatch(patchesCollector);
    const patchOutputPath = options.patchFile || path.join(options.output || 'test-results', 'self-heal.patch');
    if (patchContent) {
      await writePatchFile(patchOutputPath, patchContent);
    }
  }

  return {
    totalTests: flowFiles.length,
    passedTests,
    failedTests,
    healedTests,
    totalDurationMs: Date.now() - suiteStart,
    results,
    startTime,
    endTime: new Date().toISOString()
  };
}
