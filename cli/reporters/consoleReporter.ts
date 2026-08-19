import type { CliSuiteResult } from '../types.js';

// ANSI escape codes for basic formatting
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

export function formatConsoleReport(suite: CliSuiteResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${BOLD}======================= Tracy Test Run Summary =======================${RESET}`);
  lines.push(`${GRAY}Start: ${suite.startTime} | End: ${suite.endTime}${RESET}`);
  lines.push('');

  for (const test of suite.results) {
    const statusBadge =
      test.status === 'passed' ? `${GREEN}✓ Passed${RESET}` : `${RED}✗ Failed${RESET}`;
    const healBadge = test.healedCount > 0 ? ` ${YELLOW}[⚡ Healed: ${test.healedCount}]${RESET}` : '';
    lines.push(
      `${BOLD}Flow:${RESET} ${CYAN}${test.flowName}${RESET} (${test.flowPath}) - ${statusBadge}${healBadge} ${GRAY}(${test.durationMs}ms)${RESET}`
    );

    for (const step of test.steps) {
      let stepBadge = `${GREEN}✓${RESET}`;
      if (step.status === 'failed') {
        stepBadge = `${RED}✗${RESET}`;
      } else if (step.status === 'skipped') {
        stepBadge = `${GRAY}○${RESET}`;
      }

      let healDetail = '';
      if (step.healResult) {
        healDetail = ` ${YELLOW}[⚡ Auto-Healed -> "${step.healResult.healedSelector}" (confidence: ${step.healResult.confidence})]${RESET}`;
      }

      lines.push(
        `  ${stepBadge} Step ${step.index + 1}: ${step.command} ${GRAY}(${step.durationMs}ms)${RESET}${healDetail}`
      );

      if (step.error) {
        lines.push(`    ${RED}Error: ${step.error}${RESET}`);
      }
    }

    if (test.artifacts) {
      if (test.artifacts.screenshotPath) {
        lines.push(`    ${GRAY}Screenshot: ${test.artifacts.screenshotPath}${RESET}`);
      }
      if (test.artifacts.domSnapshotPath) {
        lines.push(`    ${GRAY}DOM Snapshot: ${test.artifacts.domSnapshotPath}${RESET}`);
      }
    }
    lines.push('');
  }

  lines.push(`${BOLD}----------------------------------------------------------------------${RESET}`);
  const passStr = `${GREEN}${suite.passedTests} passed${RESET}`;
  const failStr =
    suite.failedTests > 0 ? `${RED}${suite.failedTests} failed${RESET}` : `0 failed`;
  const healStr =
    suite.healedTests > 0
      ? `${YELLOW}${suite.healedTests} healed${RESET}`
      : `0 healed`;

  lines.push(
    `Total Flows: ${suite.totalTests} | ${passStr} | ${failStr} | ${healStr} | Duration: ${(suite.totalDurationMs / 1000).toFixed(2)}s`
  );
  lines.push(`${BOLD}======================================================================${RESET}`);
  lines.push('');

  return lines.join('\n');
}

export function printSuiteSummary(
  suite: CliSuiteResult,
  stream: NodeJS.WriteStream = process.stdout
): void {
  const report = formatConsoleReport(suite);
  stream.write(report + '\n');
}
