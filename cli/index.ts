import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseCliArgs, printHelp } from './parseArgs';
import { runFlowsHeadless } from './runner';
import { printSuiteSummary } from './reporters/consoleReporter';
import { generateJUnitXML, writeJUnitReport } from './reporters/junitReporter';
import type { CliSuiteResult } from './types';

/**
 * Main CLI entrypoint coordinating parsing, test runner execution, and reporters.
 */
export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { options, errors } = parseCliArgs(argv);

  if (errors.length > 0) {
    for (const err of errors) {
      process.stderr.write(`Error: ${err}\n`);
    }
    process.stderr.write(`\nRun "proqa --help" for usage instructions.\n`);
    return 1;
  }

  if (options.help) {
    process.stdout.write(printHelp() + '\n');
    return 0;
  }

  if (options.version) {
    try {
      const pkgJsonPath = path.resolve(import.meta.dirname, '../package.json');
      const pkgRaw = await fs.readFile(pkgJsonPath, 'utf-8');
      const pkg = JSON.parse(pkgRaw);
      process.stdout.write(`proqa v${pkg.version || '1.0.0'}\n`);
    } catch {
      process.stdout.write(`proqa v1.0.0\n`);
    }
    return 0;
  }

  // Failsafe watchdog timer preventing process hangs or zombie sessions (Pitfall 3.1 & Threat T-17-04)
  const watchdogMs = Math.max(60000, options.timeout * 2 + 15000);
  const watchdog = setTimeout(() => {
    process.stderr.write(`\n[watchdog] Execution timed out after ${watchdogMs}ms. Forcing process exit.\n`);
    process.exit(1);
  }, watchdogMs);
  watchdog.unref();

  let suiteResult: CliSuiteResult;
  try {
    suiteResult = await runFlowsHeadless(options);
  } catch (err: any) {
    process.stderr.write(`Fatal execution error: ${err?.message || err}\n`);
    return 1;
  } finally {
    clearTimeout(watchdog);
  }

  // 1. Console Output
  printSuiteSummary(suiteResult);

  // 2. JUnit XML Report
  if (options.reporter === 'junit' || options.reporter === 'all' || options.ci) {
    try {
      const junitXml = generateJUnitXML(suiteResult);
      const junitPath = path.join(options.output || 'test-results', 'junit.xml');
      await writeJUnitReport(junitPath, junitXml);
      process.stdout.write(`JUnit XML report written to ${junitPath}\n`);
    } catch (err: any) {
      process.stderr.write(`Failed writing JUnit report: ${err?.message || err}\n`);
    }
  }

  // 3. JSON Report
  if (options.reporter === 'json' || options.reporter === 'all') {
    try {
      const jsonPath = path.join(options.output || 'test-results', 'report.json');
      const dir = path.dirname(jsonPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(jsonPath, JSON.stringify(suiteResult, null, 2), 'utf-8');
      process.stdout.write(`JSON report written to ${jsonPath}\n`);
    } catch (err: any) {
      process.stderr.write(`Failed writing JSON report: ${err?.message || err}\n`);
    }
  }

  // 4. Healing Summary Notice
  if (options.heal && suiteResult.healedTests > 0) {
    const patchPath = options.patchFile || path.join(options.output || 'test-results', 'self-heal.patch');
    process.stdout.write(
      `\n⚡ ${suiteResult.healedTests} test(s) auto-healed! Unified patch written to: ${patchPath}\n`
    );
  }

  // Deterministic exit code: 0 if no unrecoverable failures, 1 if any flow failed (Pitfall 3.3)
  return suiteResult.failedTests === 0 ? 0 : 1;
}

export const runCli = main;
