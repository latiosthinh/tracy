import { describe, it, expect } from 'vitest';
import { parseCliArgs, printHelp } from './parseArgs.js';

describe('parseCliArgs', () => {
  it('returns default options when no arguments provided', () => {
    const { options, errors } = parseCliArgs([]);
    expect(errors).toHaveLength(0);
    expect(options).toEqual({
      ci: false,
      heal: false,
      timeout: 30000,
      reporter: 'console',
      output: 'test-results',
      baseUrl: undefined,
      headless: true,
      concurrency: 1,
      browsers: ['chromium'],
      workers: undefined,
      patchFile: undefined,
      throttle: undefined,
      cpuThrottlingRate: undefined,
      help: false,
      version: false,
      paths: []
    });
  });

  it('parses flags correctly: --ci, --heal, -o, -t', () => {
    const { options, errors } = parseCliArgs([
      '--ci',
      '--heal',
      '-o',
      'custom-results',
      '-t',
      '45000',
      '--base-url',
      'https://example.com'
    ]);
    expect(errors).toHaveLength(0);
    expect(options.ci).toBe(true);
    expect(options.heal).toBe(true);
    expect(options.output).toBe('custom-results');
    expect(options.timeout).toBe(45000);
    expect(options.baseUrl).toBe('https://example.com');
  });

  it('strips "run" subcommand from positional paths', () => {
    const { options, errors } = parseCliArgs(['run', 'flows/login.yaml', 'flows/checkout.yaml']);
    expect(errors).toHaveLength(0);
    expect(options.paths).toEqual(['flows/login.yaml', 'flows/checkout.yaml']);
  });

  it('preserves positional paths without "run"', () => {
    const { options, errors } = parseCliArgs(['flows/login.yaml', 'flows/checkout.yaml']);
    expect(errors).toHaveLength(0);
    expect(options.paths).toEqual(['flows/login.yaml', 'flows/checkout.yaml']);
  });

  it('caps concurrency at 16', () => {
    const { options, errors } = parseCliArgs(['-c', '32']);
    expect(errors).toHaveLength(0);
    expect(options.concurrency).toBe(16);
  });

  it('reports errors for invalid numeric options', () => {
    const { errors } = parseCliArgs(['-t', 'invalid', '-c', '-5']);
    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errors.some((e) => e.includes('timeout'))).toBe(true);
    expect(errors.some((e) => e.includes('concurrency'))).toBe(true);
  });

  it('reports errors for invalid reporter', () => {
    const { errors } = parseCliArgs(['-r', 'unknown-reporter']);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('Invalid reporter');
  });

  it('parses reporter options: junit, json, all', () => {
    const { options: o1 } = parseCliArgs(['-r', 'junit']);
    expect(o1.reporter).toBe('junit');

    const { options: o2 } = parseCliArgs(['--reporter', 'all']);
    expect(o2.reporter).toBe('all');
  });

  it('printHelp returns non-empty usage string', () => {
    const help = printHelp();
    expect(help).toContain('Usage: tracy run');
    expect(help).toContain('--heal');
    expect(help).toContain('--ci');
    expect(help).toContain('--browsers');
    expect(help).toContain('--workers');
    expect(help).toContain('--throttle');
    expect(help).toContain('--cpu-slowdown');
  });

  it('parses --throttle and -T flag with validation', () => {
    const { options: o1, errors: e1 } = parseCliArgs(['--throttle', 'slow3g']);
    expect(e1).toHaveLength(0);
    expect(o1.throttle).toBe('slow3g');

    const { options: o2, errors: e2 } = parseCliArgs(['-T', 'fast3g']);
    expect(e2).toHaveLength(0);
    expect(o2.throttle).toBe('fast3g');

    const { errors: e3 } = parseCliArgs(['--throttle', 'invalid-speed']);
    expect(e3.length).toBeGreaterThan(0);
    expect(e3[0]).toContain('Invalid throttle preset');
  });

  it('parses --cpu-slowdown flag with validation', () => {
    const { options: o1, errors: e1 } = parseCliArgs(['--cpu-slowdown', '4']);
    expect(e1).toHaveLength(0);
    expect(o1.cpuThrottlingRate).toBe(4);

    const { errors: e2 } = parseCliArgs(['--cpu-slowdown', '-1']);
    expect(e2.length).toBeGreaterThan(0);
    expect(e2[0]).toContain('Invalid cpu-slowdown rate');
  });

  it('parses --browsers comma-separated list and -B flag', () => {
    const { options: o1, errors: e1 } = parseCliArgs(['--browsers', 'chromium,firefox,webkit']);
    expect(e1).toHaveLength(0);
    expect(o1.browsers).toEqual(['chromium', 'firefox', 'webkit']);

    const { options: o2, errors: e2 } = parseCliArgs(['-B', 'firefox']);
    expect(e2).toHaveLength(0);
    expect(o2.browsers).toEqual(['firefox']);
  });

  it('validates supported browsers and reports error on invalid target', () => {
    const { options, errors } = parseCliArgs(['--browsers', 'chromium,safari,opera']);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Invalid browser');
  });

  it('parses --workers and -w flags', () => {
    const { options: o1, errors: e1 } = parseCliArgs(['--workers', '4']);
    expect(e1).toHaveLength(0);
    expect(o1.workers).toBe(4);

    const { options: o2, errors: e2 } = parseCliArgs(['-w', '8']);
    expect(e2).toHaveLength(0);
    expect(o2.workers).toBe(8);
  });

  it('reports error on invalid workers count', () => {
    const { errors } = parseCliArgs(['--workers', '0']);
    expect(errors.some((e) => e.includes('workers'))).toBe(true);
  });
});
