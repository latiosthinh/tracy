import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { discoverFlowFiles, executeSingleFlow, executeMatrixFlows } from './runner';
import type { CliOptions } from './types';

vi.mock('playwright-core', () => {
  const createMockBrowser = () => {
    const mockContext = {
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(undefined),
      }),
      route: vi.fn().mockResolvedValue(undefined),
      routeFromHAR: vi.fn().mockResolvedValue(undefined),
      unrouteAll: vi.fn().mockResolvedValue(undefined),
      tracing: {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      },
      close: vi.fn().mockResolvedValue(undefined),
    };
    return {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(undefined),
    };
  };

  return {
    chromium: {
      launch: vi.fn().mockImplementation(async () => createMockBrowser()),
    },
    firefox: {
      launch: vi.fn().mockImplementation(async () => createMockBrowser()),
    },
    webkit: {
      launch: vi.fn().mockImplementation(async () => createMockBrowser()),
    },
  };
});

vi.mock('./runnerDeps', () => ({
  executeStepWithHealing: vi.fn().mockImplementation(async (_page, step, options) => {
    if (step.selector === '#broken-selector' && options?.autoHeal) {
      return {
        success: true,
        healed: true,
        durationMs: 15,
        healingDetails: {
          healed: true,
          strategy: 'heuristic',
          originalSelector: '#broken-selector',
          healedSelector: '#healed-selector',
          confidence: 0.92,
          reason: 'Heuristic match'
        }
      };
    }
    if (step.selector === '#fatal-fail') {
      return {
        success: false,
        healed: false,
        durationMs: 10,
        error: 'Element not found'
      };
    }
    return {
      success: true,
      healed: false,
      durationMs: 5
    };
  }),
  patchYamlFile: vi.fn().mockResolvedValue({
    patched: true,
    updatedYaml: 'steps:\n  - click: #healed-selector'
  }),
  saveFailureArtifacts: vi.fn().mockResolvedValue({
    screenshotPath: '/test-results/flow/failure-step-0.png',
    domSnapshotPath: '/test-results/flow/failure-step-0.html'
  }),
  saveHealArtifacts: vi.fn().mockResolvedValue({
    screenshotPath: '/test-results/flow/healed-step-0.png',
    domSnapshotPath: '/test-results/flow/healed-step-0.html'
  }),
  sanitizeFlowName: vi.fn().mockImplementation((name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
}));

describe('cli/runner', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tracy-runner-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('discoverFlowFiles', () => {
    it('finds yaml and yml files in target directory recursively', async () => {
      const subDir = path.join(tempDir, 'sub');
      await fs.mkdir(subDir, { recursive: true });

      const file1 = path.join(tempDir, 'a.yaml');
      const file2 = path.join(subDir, 'b.yml');
      const file3 = path.join(tempDir, 'ignored.txt');

      await fs.writeFile(file1, 'title: A\nsteps: []');
      await fs.writeFile(file2, 'title: B\nsteps: []');
      await fs.writeFile(file3, 'not a yaml flow');

      const discovered = await discoverFlowFiles([tempDir]);
      expect(discovered).toContain(path.resolve(file1));
      expect(discovered).toContain(path.resolve(file2));
      expect(discovered).not.toContain(path.resolve(file3));
    });

    it('returns single file when explicit file path provided', async () => {
      const file = path.join(tempDir, 'direct.yaml');
      await fs.writeFile(file, 'title: Direct\nsteps: []');

      const discovered = await discoverFlowFiles([file]);
      expect(discovered).toEqual([path.resolve(file)]);
    });
  });

  describe('executeSingleFlow', () => {
    const defaultOptions: CliOptions = {
      ci: true,
      heal: true,
      timeout: 5000,
      reporter: 'console',
      output: path.join(os.tmpdir(), 'tracy-test-output'),
      headless: true,
      concurrency: 1,
      help: false,
      version: false,
      paths: []
    };

    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined)
    };

    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      route: vi.fn().mockResolvedValue(undefined),
      routeFromHAR: vi.fn().mockResolvedValue(undefined),
      unrouteAll: vi.fn().mockResolvedValue(undefined),
      tracing: {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined)
      },
      close: vi.fn().mockResolvedValue(undefined)
    };

    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext)
    } as any;

    it('executes passing flow and records step details', async () => {
      const flowPath = path.join(tempDir, 'pass.yaml');
      await fs.writeFile(
        flowPath,
        `name: PassFlow\nurl: http://localhost:3000\nsteps:\n  - click: #btn1\n  - click: #btn2`
      );

      const result = await executeSingleFlow(flowPath, defaultOptions, mockBrowser);

      expect(result.status).toBe('passed');
      expect(result.flowName).toBe('PassFlow');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].status).toBe('passed');
      expect(result.steps[1].status).toBe('passed');
      expect(result.healedCount).toBe(0);
    });

    it('handles auto-healed steps and updates healed count', async () => {
      const flowPath = path.join(tempDir, 'heal.yaml');
      await fs.writeFile(
        flowPath,
        `name: HealFlow\nsteps:\n  - click: "#broken-selector"`
      );

      const patches: any[] = [];
      const result = await executeSingleFlow(flowPath, defaultOptions, mockBrowser, patches);

      expect(result.status).toBe('passed');
      expect(result.healedCount).toBe(1);
      expect(result.steps[0].healResult?.healedSelector).toBe('#healed-selector');
      expect(result.artifacts?.screenshotPath).toBeDefined();
      expect(patches.length).toBe(1);
    });

    it('marks unrecoverable step failure, records artifacts, and skips remaining steps', async () => {
      const flowPath = path.join(tempDir, 'fail.yaml');
      await fs.writeFile(
        flowPath,
        `name: FailFlow\nsteps:\n  - click: "#fatal-fail"\n  - click: "#should-skip"`
      );

      const result = await executeSingleFlow(flowPath, defaultOptions, mockBrowser);

      expect(result.status).toBe('failed');
      expect(result.steps[0].status).toBe('failed');
      expect(result.steps[1].status).toBe('skipped');
      expect(result.artifacts?.screenshotPath).toBeDefined();
    });

    it('attaches NetworkMockManager, applies top-level mocks/har, handles network steps and request assertion', async () => {
      const flowPath = path.join(tempDir, 'network-mock.yaml');
      await fs.writeFile(
        flowPath,
        `name: NetworkFlow\nurl: http://localhost:3000\nmocks:\n  - url: "**/api/items"\n    status: 200\n    body: { items: [1, 2] }\nhar:\n  path: "fixtures/app.har"\nsteps:\n  - mockRoute:\n      url: "**/api/user"\n      status: 200\n      body: { name: "Bob" }\n  - assertRequest:\n      url: "**/api/user"\n      count: 0\n  - unmockRoute: "**/api/user"\n  - replayHar: "fixtures/extra.har"`
      );

      const result = await executeSingleFlow(flowPath, defaultOptions, mockBrowser);
      expect(result.status).toBe('passed');
      expect(result.steps).toHaveLength(4);
      expect(result.steps[0].status).toBe('passed');
      expect(result.steps[1].status).toBe('passed');
      expect(result.steps[2].status).toBe('passed');
      expect(result.steps[3].status).toBe('passed');
    });

    it('fails flow when assertRequest fails in CLI mode', async () => {
      const flowPath = path.join(tempDir, 'failing-assert.yaml');
      await fs.writeFile(
        flowPath,
        `name: FailAssertFlow\nurl: http://localhost:3000\nsteps:\n  - assertRequest:\n      url: "**/api/never-called"\n      count: 1`
      );

      const result = await executeSingleFlow(flowPath, defaultOptions, mockBrowser);
      expect(result.status).toBe('failed');
      expect(result.steps[0].status).toBe('failed');
      expect(result.steps[0].error).toContain("Expected exactly 1 requests matching '**/api/never-called'");
    });

    it('evaluates shouldExecuteStepForBrowser and skips step on mismatched browser conditional', async () => {
      const flowPath = path.join(tempDir, 'conditional.yaml');
      await fs.writeFile(
        flowPath,
        `name: ConditionalFlow\nsteps:\n  - click: #common-btn\n  - click: #firefox-only\n    when:\n      browser: firefox\n  - click: #skip-on-chromium\n    skip_if:\n      browser: chromium`
      );

      const result = await executeSingleFlow(flowPath, defaultOptions, mockBrowser, undefined, 'chromium');
      expect(result.status).toBe('passed');
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].status).toBe('passed');
      expect(result.steps[1].status).toBe('skipped');
      expect(result.steps[1].skippedReason).toContain("when.browser does not match 'chromium'");
      expect(result.steps[2].status).toBe('skipped');
      expect(result.steps[2].skippedReason).toContain("skip_if.browser matched 'chromium'");
    });
  });

  describe('executeMatrixFlows and runFlowsHeadless with Matrix', () => {
    it('executes cartesian product of flows × browsers across worker pool', async () => {
      const flowPath1 = path.join(tempDir, 'flow1.yaml');
      const flowPath2 = path.join(tempDir, 'flow2.yaml');
      await fs.writeFile(flowPath1, `name: Flow1\nsteps:\n  - click: #btn`);
      await fs.writeFile(flowPath2, `name: Flow2\nsteps:\n  - click: #btn`);

      const matrixOptions: CliOptions = {
        ci: false,
        heal: false,
        timeout: 5000,
        reporter: 'all',
        output: path.join(tempDir, 'test-results'),
        headless: true,
        concurrency: 2,
        browsers: ['chromium', 'firefox'],
        workers: 2,
        help: false,
        version: false,
        paths: [flowPath1, flowPath2]
      };

      const matrixResult = await executeMatrixFlows([flowPath1, flowPath2], matrixOptions);

      expect(matrixResult.totalExecutions).toBe(4);
      expect(matrixResult.browsers).toEqual(['chromium', 'firefox']);
      expect(matrixResult.results).toHaveLength(4);
      expect(matrixResult.passedExecutions).toBe(4);

      // Verify matrix results map
      expect(matrixResult.flowResults.has(flowPath1)).toBe(true);
      expect(matrixResult.flowResults.has(flowPath2)).toBe(true);
    });
  });
});
