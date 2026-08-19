import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CliSuiteResult } from '../types.js';

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
          lines.push(
            `      <failure message="${escapeXml(step.error || 'Step failed')}">${escapeXml(step.error || 'Step failed')}</failure>`
          );
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
