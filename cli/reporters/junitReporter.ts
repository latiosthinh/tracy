import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CliSuiteResult, CliMatrixResult } from '../types.js';

export function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateJUnitXML(
  suite: CliSuiteResult,
  suiteName = 'Tracy Headless Test Suite'
): string {
  const totalSeconds = (suite.totalDurationMs / 1000).toFixed(3);
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<testsuites name="${escapeXml(suiteName)}" tests="${suite.totalTests}" failures="${suite.failedTests}" errors="0" time="${totalSeconds}">`
  );

  for (const test of suite.results) {
    const testSeconds = (test.durationMs / 1000).toFixed(3);
    const flowFailures = test.status === 'failed' ? 1 : 0;
    const testCount = test.steps.length > 0 ? test.steps.length : 1;

    lines.push(
      `  <testsuite name="${escapeXml(test.flowName)}" tests="${testCount}" failures="${flowFailures}" errors="0" time="${testSeconds}" timestamp="${escapeXml(test.artifacts?.screenshotPath ? new Date().toISOString() : suite.startTime || new Date().toISOString())}">`
    );

    if (test.steps.length === 0) {
      lines.push(
        `    <testcase classname="${escapeXml(test.flowName)}" name="Flow Execution" time="${testSeconds}">`
      );
      if (test.status === 'failed') {
        lines.push(
          `      <failure message="${escapeXml(test.error || 'Flow execution failed')}">${escapeXml(test.error || 'Flow execution failed')}</failure>`
        );
      }
      lines.push(`    </testcase>`);
    } else {
      test.steps.forEach((step, idx) => {
        const stepSeconds = (step.durationMs / 1000).toFixed(3);
        const stepName = `Step ${idx + 1}: ${step.command}`;
        lines.push(
          `    <testcase classname="${escapeXml(test.flowName)}" name="${escapeXml(stepName)}" time="${stepSeconds}">`
        );

        if (step.status === 'failed') {
          const failureDetail = step.perfResult
            ? `${step.error || 'Performance assertion failed'}\n\n${step.perfResult.summary}\n${step.perfResult.failedAssertions.map((f) => `- ${f.message}`).join('\n')}`
            : (step.error || 'Step failed');

          lines.push(
            `      <failure message="${escapeXml(step.error || 'Step failed')}">${escapeXml(failureDetail)}</failure>`
          );
        } else if (step.status === 'skipped') {
          lines.push(
            `      <skipped message="${escapeXml(step.skippedReason || 'Step skipped')}"/>`
          );
        }

        if (step.perfResult) {
          lines.push(`      <properties>`);
          lines.push(`        <property name="perfPassed" value="${step.perfResult.passed}"/>`);
          if (step.perfResult.metrics.lcp !== undefined) {
            lines.push(`        <property name="lcp" value="${step.perfResult.metrics.lcp}"/>`);
          }
          if (step.perfResult.metrics.cls !== undefined) {
            lines.push(`        <property name="cls" value="${step.perfResult.metrics.cls}"/>`);
          }
          if (step.perfResult.metrics.inp !== undefined) {
            lines.push(`        <property name="inp" value="${step.perfResult.metrics.inp}"/>`);
          }
          if (step.perfResult.metrics.fcp !== undefined) {
            lines.push(`        <property name="fcp" value="${step.perfResult.metrics.fcp}"/>`);
          }
          if (step.perfResult.metrics.ttfb !== undefined) {
            lines.push(`        <property name="ttfb" value="${step.perfResult.metrics.ttfb}"/>`);
          }
          lines.push(`      </properties>`);
        }

        if (step.healResult) {
          lines.push(`      <properties>`);
          lines.push(`        <property name="healed" value="true"/>`);
          if (step.healResult.healedSelector) {
            lines.push(
              `        <property name="healedSelector" value="${escapeXml(step.healResult.healedSelector)}"/>`
            );
          }
          if (step.healResult.confidence !== undefined) {
            lines.push(
              `        <property name="confidence" value="${escapeXml(step.healResult.confidence)}"/>`
            );
          }
          lines.push(`      </properties>`);
        }

        if (test.artifacts && (test.artifacts.screenshotPath || test.artifacts.domSnapshotPath)) {
          const sysOut: string[] = [];
          if (test.artifacts.screenshotPath) {
            sysOut.push(`Screenshot: ${test.artifacts.screenshotPath}`);
          }
          if (test.artifacts.domSnapshotPath) {
            sysOut.push(`DOM Snapshot: ${test.artifacts.domSnapshotPath}`);
          }
          lines.push(`      <system-out>${escapeXml(sysOut.join('\n'))}</system-out>`);
        }

        lines.push(`    </testcase>`);
      });
    }

    lines.push(`  </testsuite>`);
  }

  lines.push('</testsuites>');
  return lines.join('\n');
}

export function generateMatrixJUnitXML(
  matrixResult: CliMatrixResult,
  suiteName = 'Tracy Multi-Browser Matrix Suite'
): string {
  const totalSeconds = (matrixResult.totalDurationMs / 1000).toFixed(3);
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<testsuites name="${escapeXml(suiteName)}" tests="${matrixResult.totalExecutions}" failures="${matrixResult.failedExecutions}" errors="0" time="${totalSeconds}">`
  );

  for (const test of matrixResult.results) {
    const testSeconds = (test.durationMs / 1000).toFixed(3);
    const flowFailures = test.status === 'failed' ? 1 : 0;
    const testCount = test.steps.length > 0 ? test.steps.length : 1;
    const suiteDisplayName = test.browser ? `[${test.browser}] ${test.flowName}` : test.flowName;

    lines.push(
      `  <testsuite name="${escapeXml(suiteDisplayName)}" tests="${testCount}" failures="${flowFailures}" errors="0" time="${testSeconds}" timestamp="${escapeXml(matrixResult.startTime || new Date().toISOString())}">`
    );

    if (test.steps.length === 0) {
      lines.push(
        `    <testcase classname="${escapeXml(suiteDisplayName)}" name="Flow Execution" time="${testSeconds}">`
      );
      if (test.status === 'failed') {
        lines.push(
          `      <failure message="${escapeXml(test.error || 'Flow execution failed')}">${escapeXml(test.error || 'Flow execution failed')}</failure>`
        );
      }
      lines.push(`    </testcase>`);
    } else {
      test.steps.forEach((step, idx) => {
        const stepSeconds = (step.durationMs / 1000).toFixed(3);
        const stepName = `Step ${idx + 1}: ${step.command}`;
        lines.push(
          `    <testcase classname="${escapeXml(suiteDisplayName)}" name="${escapeXml(stepName)}" time="${stepSeconds}">`
        );

        if (step.status === 'failed') {
          const failureDetail = step.perfResult
            ? `${step.error || 'Performance assertion failed'}\n\n${step.perfResult.summary}\n${step.perfResult.failedAssertions.map((f) => `- ${f.message}`).join('\n')}`
            : (step.error || 'Step failed');

          lines.push(
            `      <failure message="${escapeXml(step.error || 'Step failed')}">${escapeXml(failureDetail)}</failure>`
          );
        } else if (step.status === 'skipped') {
          lines.push(
            `      <skipped message="${escapeXml(step.skippedReason || 'Step skipped')}"/>`
          );
        }

        if (step.perfResult) {
          lines.push(`      <properties>`);
          lines.push(`        <property name="perfPassed" value="${step.perfResult.passed}"/>`);
          if (step.perfResult.metrics.lcp !== undefined) {
            lines.push(`        <property name="lcp" value="${step.perfResult.metrics.lcp}"/>`);
          }
          if (step.perfResult.metrics.cls !== undefined) {
            lines.push(`        <property name="cls" value="${step.perfResult.metrics.cls}"/>`);
          }
          if (step.perfResult.metrics.inp !== undefined) {
            lines.push(`        <property name="inp" value="${step.perfResult.metrics.inp}"/>`);
          }
          if (step.perfResult.metrics.fcp !== undefined) {
            lines.push(`        <property name="fcp" value="${step.perfResult.metrics.fcp}"/>`);
          }
          if (step.perfResult.metrics.ttfb !== undefined) {
            lines.push(`        <property name="ttfb" value="${step.perfResult.metrics.ttfb}"/>`);
          }
          lines.push(`      </properties>`);
        }

        if (step.healResult) {
          lines.push(`      <properties>`);
          lines.push(`        <property name="healed" value="true"/>`);
          if (step.healResult.healedSelector) {
            lines.push(
              `        <property name="healedSelector" value="${escapeXml(step.healResult.healedSelector)}"/>`
            );
          }
          if (step.healResult.confidence !== undefined) {
            lines.push(
              `        <property name="confidence" value="${escapeXml(step.healResult.confidence)}"/>`
            );
          }
          lines.push(`      </properties>`);
        }

        if (test.artifacts && (test.artifacts.screenshotPath || test.artifacts.domSnapshotPath)) {
          const sysOut: string[] = [];
          if (test.artifacts.screenshotPath) {
            sysOut.push(`Screenshot: ${test.artifacts.screenshotPath}`);
          }
          if (test.artifacts.domSnapshotPath) {
            sysOut.push(`DOM Snapshot: ${test.artifacts.domSnapshotPath}`);
          }
          lines.push(`      <system-out>${escapeXml(sysOut.join('\n'))}</system-out>`);
        }

        lines.push(`    </testcase>`);
      });
    }

    lines.push(`  </testsuite>`);
  }

  lines.push('</testsuites>');
  return lines.join('\n');
}

export async function writeJUnitReport(outputPath: string, xmlContent: string): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, xmlContent, 'utf-8');
}
