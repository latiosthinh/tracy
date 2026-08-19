import * as path from 'node:path';
import type { CliSuiteResult, CliMatrixResult, CliTestResult } from '../types.js';

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

export function formatMatrixConsoleReport(matrixResult: CliMatrixResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${BOLD}=================== Tracy Multi-Browser Matrix Summary ===================${RESET}`);
  lines.push(`${GRAY}Start: ${matrixResult.startTime} | End: ${matrixResult.endTime}${RESET}`);
  lines.push(`${GRAY}Target Browsers: ${matrixResult.browsers.join(', ')}${RESET}`);
  lines.push('');

  // Collect all unique flow paths / names
  const flowMap = new Map<string, { name: string; results: Record<string, CliTestResult> }>();
  for (const res of matrixResult.results) {
    const key = res.flowPath || res.flowName;
    if (!flowMap.has(key)) {
      flowMap.set(key, { name: res.flowName || path.basename(key), results: {} });
    }
    if (res.browser) {
      flowMap.get(key)!.results[res.browser] = res;
    }
  }

  const browsers = matrixResult.browsers;
  const flowColWidth = 32;
  const browserColWidth = 12;

  // Header border
  const headerTop = `┌${'─'.repeat(flowColWidth)}┬${browsers.map(() => '─'.repeat(browserColWidth)).join('┬')}┐`;
  lines.push(headerTop);

  // Header titles
  const flowHeader = 'Flow'.padEnd(flowColWidth - 2);
  const browserHeaders = browsers
    .map((b) => {
      const cap = b.charAt(0).toUpperCase() + b.slice(1);
      return cap.padEnd(browserColWidth - 2);
    })
    .join(' │ ');
  lines.push(`│ ${flowHeader} │ ${browserHeaders} │`);

  // Divider
  const headerMid = `├${'─'.repeat(flowColWidth)}┼${browsers.map(() => '─'.repeat(browserColWidth)).join('┼')}┤`;
  lines.push(headerMid);

  // Flow rows
  for (const [key, flowData] of flowMap.entries()) {
    const displayName = flowData.name.length > flowColWidth - 2
      ? flowData.name.substring(0, flowColWidth - 5) + '...'
      : flowData.name;
    const flowCell = displayName.padEnd(flowColWidth - 2);

    const cells: string[] = [];
    for (const b of browsers) {
      const r = flowData.results[b];
      let badge = `${GRAY} -  ${RESET}`;
      if (r) {
        if (r.status === 'passed') {
          badge = `${GREEN}PASS${RESET}`;
        } else if (r.status === 'failed') {
          badge = `${RED}FAIL${RESET}`;
        } else {
          badge = `${GRAY}SKIP${RESET}`;
        }
      }
      // calculate pad length accounting for ANSI codes
      const rawText = r ? (r.status === 'passed' ? 'PASS' : r.status === 'failed' ? 'FAIL' : 'SKIP') : '-';
      const padRight = Math.max(0, browserColWidth - 2 - rawText.length);
      cells.push(`${badge}${' '.repeat(padRight)}`);
    }

    lines.push(`│ ${flowCell} │ ${cells.join(' │ ')} │`);
  }

  // Footer border
  const footerBot = `└${'─'.repeat(flowColWidth)}┴${browsers.map(() => '─'.repeat(browserColWidth)).join('┴')}┘`;
  lines.push(footerBot);
  lines.push('');

  const passStr = `${GREEN}${matrixResult.passedExecutions} passed${RESET}`;
  const failStr =
    matrixResult.failedExecutions > 0 ? `${RED}${matrixResult.failedExecutions} failed${RESET}` : `0 failed`;
  const skipStr =
    matrixResult.skippedExecutions > 0 ? `${YELLOW}${matrixResult.skippedExecutions} skipped${RESET}` : `0 skipped`;

  lines.push(
    `Total Executions: ${matrixResult.totalExecutions} | ${passStr} | ${failStr} | ${skipStr} | Duration: ${(matrixResult.totalDurationMs / 1000).toFixed(2)}s`
  );
  lines.push(`${BOLD}==========================================================================${RESET}`);
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

export function printMatrixSummary(
  matrixResult: CliMatrixResult,
  stream: NodeJS.WriteStream = process.stdout
): void {
  const report = formatMatrixConsoleReport(matrixResult);
  stream.write(report + '\n');
}
