import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { main } from './index';

vi.mock('./runner', () => ({
  runFlowsHeadless: vi.fn().mockImplementation(async (options) => {
    if (options.paths?.includes('fail.yaml')) {
      return {
        totalTests: 1,
        passedTests: 0,
        failedTests: 1,
        healedTests: 0,
        totalDurationMs: 100,
        results: [
          {
            flowPath: 'fail.yaml',
            flowName: 'Fail',
            status: 'failed',
            durationMs: 100,
            steps: [],
            healedCount: 0,
            error: 'Failed'
          }
        ],
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      };
    }

    return {
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      healedTests: options.heal ? 1 : 0,
      totalDurationMs: 80,
      results: [
        {
          flowPath: 'pass.yaml',
          flowName: 'Pass',
          status: 'passed',
          durationMs: 80,
          steps: [],
          healedCount: options.heal ? 1 : 0
        }
      ],
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString()
    };
  })
}));

describe('cli/index entrypoint', () => {
  let stdoutSpy: any;
  let stderrSpy: any;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('prints help and returns code 0 when --help is passed', async () => {
    const code = await main(['--help']);
    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it('prints version and returns code 0 when --version is passed', async () => {
    const code = await main(['--version']);
    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it('returns code 0 when flows pass or heal', async () => {
    const code = await main(['run', 'pass.yaml', '--heal']);
    expect(code).toBe(0);
  });

  it('returns code 1 when flows fail', async () => {
    const code = await main(['run', 'fail.yaml']);
    expect(code).toBe(1);
  });
});
