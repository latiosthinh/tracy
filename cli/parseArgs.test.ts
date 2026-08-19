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
      patchFile: undefined,
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
  });
});
