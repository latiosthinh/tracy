import { parseArgs } from 'node:util';
import type { CliOptions } from './types.js';

const VALID_REPORTERS = ['junit', 'console', 'json', 'all'] as const;

export function parseCliArgs(argv: string[]): { options: CliOptions; errors: string[] } {
  const errors: string[] = [];

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        ci: { type: 'boolean', default: false },
        heal: { type: 'boolean', default: false },
        timeout: { type: 'string', short: 't' },
        reporter: { type: 'string', short: 'r', default: 'console' },
        output: { type: 'string', short: 'o', default: 'test-results' },
        'base-url': { type: 'string', short: 'b' },
        headless: { type: 'boolean', default: true },
        concurrency: { type: 'string', short: 'c', default: '1' },
        'patch-file': { type: 'string', short: 'p' },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false }
      },
      allowPositionals: true,
      strict: false
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      options: {
        ci: false,
        heal: false,
        timeout: 30000,
        reporter: 'console',
        output: 'test-results',
        headless: true,
        concurrency: 1,
        help: false,
        version: false,
        paths: []
      },
      errors
    };
  }

  const { values, positionals } = parsed;

  let timeout = 30000;
  if (values.timeout !== undefined) {
    const parsedTimeout = Number(values.timeout);
    if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
      errors.push(`Invalid timeout: "${values.timeout}". Must be a positive number.`);
    } else {
      timeout = parsedTimeout;
    }
  }

  let concurrency = 1;
  if (values.concurrency !== undefined) {
    const parsedConcurrency = Number(values.concurrency);
    if (!Number.isInteger(parsedConcurrency) || parsedConcurrency <= 0) {
      errors.push(`Invalid concurrency: "${values.concurrency}". Must be a positive integer.`);
    } else {
      concurrency = Math.min(16, parsedConcurrency);
    }
  }

  const rawReporter = values.reporter as string;
  let reporter: CliOptions['reporter'] = 'console';
  if (rawReporter) {
    if (VALID_REPORTERS.includes(rawReporter as typeof VALID_REPORTERS[number])) {
      reporter = rawReporter as CliOptions['reporter'];
    } else {
      errors.push(`Invalid reporter: "${rawReporter}". Must be one of: ${VALID_REPORTERS.join(', ')}.`);
    }
  }

  // Filter out leading subcommand (e.g., 'run') if present
  let paths = positionals;
  if (paths.length > 0 && paths[0] === 'run') {
    paths = paths.slice(1);
  }

  const options: CliOptions = {
    ci: Boolean(values.ci),
    heal: Boolean(values.heal),
    timeout,
    reporter,
    output: (values.output as string) || 'test-results',
    baseUrl: values['base-url'] as string | undefined,
    headless: values.headless !== undefined ? Boolean(values.headless) : true,
    concurrency,
    patchFile: values['patch-file'] as string | undefined,
    help: Boolean(values.help),
    version: Boolean(values.version),
    paths
  };

  return { options, errors };
}

export function printHelp(): string {
  return `
Usage: tracy run [paths...] [options]

Commands:
  run [paths...]         Execute test flow YAML files or directories

Options:
      --ci               Run in CI mode (fail-fast, machine logs) [default: false]
      --heal             Enable automated self-healing for broken selectors [default: false]
  -t, --timeout <ms>     Step / execution timeout in milliseconds [default: 30000]
  -r, --reporter <type>  Reporter format: console, junit, json, all [default: console]
  -o, --output <dir>     Directory to write reports and artifacts [default: test-results]
  -b, --base-url <url>   Override base URL for all flows
      --headless         Run browser in headless mode [default: true]
  -c, --concurrency <n>  Number of parallel flow executions (max 16) [default: 1]
  -p, --patch-file <path> File path to write unified diff patch for healed flows
  -h, --help             Show command line help
  -v, --version          Show version number
`.trim();
}
