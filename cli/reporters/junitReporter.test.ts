import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateJUnitXML, generateMatrixJUnitXML, writeJUnitReport, escapeXml } from './junitReporter.js';
import type { CliSuiteResult, CliMatrixResult } from '../types.js';

describe('escapeXml', () => {
  it('escapes special characters', () => {
    expect(escapeXml('<tag attr="val" & \'single\'>')).toBe(
      '&lt;tag attr=&quot;val&quot; &amp; &apos;single&apos;&gt;'
    );
  });

  it('handles null/undefined gracefully', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });
});

describe('generateJUnitXML', () => {
  const passingSuite: CliSuiteResult = {
    totalTests: 1,
    passedTests: 1,
    failedTests: 0,
    healedTests: 0,
    totalDurationMs: 1250,
    startTime: '2026-08-19T10:00:00.000Z',
    endTime: '2026-08-19T10:00:01.250Z',
    results: [
      {
        flowPath: 'flows/login.yaml',
        flowName: 'User Login',
        status: 'passed',
        durationMs: 1250,
        healedCount: 0,
        steps: [
          {
            index: 0,
            command: 'navigate to https://example.com',
            status: 'passed',
            durationMs: 500
          },
          {
            index: 1,
            command: 'fill username input',
            status: 'passed',
            durationMs: 750
          }
        ]
      }
    ]
  };

  it('generates valid XML structure for passing suite', () => {
    const xml = generateJUnitXML(passingSuite);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testsuites name="Tracy Headless Test Suite" tests="1" failures="0" errors="0" time="1.250">');
    expect(xml).toContain('<testsuite name="User Login" tests="2" failures="0"');
    expect(xml).toContain('<testcase classname="User Login" name="Step 1: navigate to https://example.com"');
    expect(xml).toContain('<testcase classname="User Login" name="Step 2: fill username input"');
    expect(xml).not.toContain('<failure');
  });

  it('includes <failure> node for failed step with XML escaping', () => {
    const failingSuite: CliSuiteResult = {
      totalTests: 1,
      passedTests: 0,
      failedTests: 1,
      healedTests: 0,
      totalDurationMs: 800,
      startTime: '2026-08-19T10:00:00.000Z',
      endTime: '2026-08-19T10:00:00.800Z',
      results: [
        {
          flowPath: 'flows/checkout.yaml',
          flowName: 'Checkout Flow',
          status: 'failed',
          durationMs: 800,
          healedCount: 0,
          steps: [
            {
              index: 0,
              command: 'click "Submit <Order>"',
              status: 'failed',
              durationMs: 800,
              error: 'Element <button id="submit"> not found & timed out'
            }
          ]
        }
      ]
    };

    const xml = generateJUnitXML(failingSuite);
    expect(xml).toContain('<failure message="Element &lt;button id=&quot;submit&quot;&gt; not found &amp; timed out">');
    expect(xml).toContain('Element &lt;button id=&quot;submit&quot;&gt; not found &amp; timed out</failure>');
  });

  it('includes healed properties and artifacts in <testcase>', () => {
    const healedSuite: CliSuiteResult = {
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      healedTests: 1,
      totalDurationMs: 1500,
      startTime: '2026-08-19T10:00:00.000Z',
      endTime: '2026-08-19T10:00:01.500Z',
      results: [
        {
          flowPath: 'flows/profile.yaml',
          flowName: 'Profile Update',
          status: 'passed',
          durationMs: 1500,
          healedCount: 1,
          artifacts: {
            screenshotPath: 'artifacts/step-1-healed.png',
            domSnapshotPath: 'artifacts/step-1-dom.json'
          },
          steps: [
            {
              index: 0,
              command: 'click avatar',
              status: 'passed',
              durationMs: 1500,
              healResult: {
                healedSelector: 'button[data-testid="new-avatar"]',
                confidence: 0.95
              }
            }
          ]
        }
      ]
    };

    const xml = generateJUnitXML(healedSuite);
    expect(xml).toContain('<property name="healed" value="true"/>');
    expect(xml).toContain('<property name="healedSelector" value="button[data-testid=&quot;new-avatar&quot;]"/>');
    expect(xml).toContain('<property name="confidence" value="0.95"/>');
    expect(xml).toContain('<system-out>');
    expect(xml).toContain('Screenshot: artifacts/step-1-healed.png');
    expect(xml).toContain('DOM Snapshot: artifacts/step-1-dom.json');
  });
});

describe('writeJUnitReport', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tracy-junit-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes XML content to file including parent directories', async () => {
    const reportPath = path.join(tmpDir, 'nested', 'dir', 'junit.xml');
    const sampleXml = '<testsuites></testsuites>';

    await writeJUnitReport(reportPath, sampleXml);
    const content = await fs.readFile(reportPath, 'utf-8');
    expect(content).toBe(sampleXml);
  });
});

describe('generateMatrixJUnitXML', () => {
  it('formats matrix XML partitioned by browser testsuites with skipped and failed steps', () => {
    const matrixResult: CliMatrixResult = {
      totalExecutions: 2,
      passedExecutions: 1,
      failedExecutions: 1,
      skippedExecutions: 0,
      totalDurationMs: 3500,
      browsers: ['chromium', 'firefox'],
      flowResults: new Map(),
      startTime: '2026-08-19T10:00:00.000Z',
      endTime: '2026-08-19T10:00:03.500Z',
      results: [
        {
          flowPath: 'flows/login.yaml',
          flowName: 'Login Flow',
          browser: 'chromium',
          status: 'passed',
          durationMs: 1500,
          healedCount: 0,
          steps: [
            {
              index: 0,
              command: 'navigate to /login',
              status: 'passed',
              durationMs: 700,
            },
            {
              index: 1,
              command: 'click #web-only',
              status: 'skipped',
              durationMs: 0,
              skippedReason: "Skipped: when.browser does not match 'chromium'",
            },
          ],
        },
        {
          flowPath: 'flows/login.yaml',
          flowName: 'Login Flow',
          browser: 'firefox',
          status: 'failed',
          durationMs: 2000,
          healedCount: 0,
          error: 'Timeout waiting for #firefox-btn',
          steps: [
            {
              index: 0,
              command: 'navigate to /login',
              status: 'passed',
              durationMs: 800,
            },
            {
              index: 1,
              command: 'click #firefox-btn',
              status: 'failed',
              durationMs: 1200,
              error: 'Timeout waiting for #firefox-btn',
            },
          ],
        },
      ],
    };

    const xml = generateMatrixJUnitXML(matrixResult);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testsuite name="[chromium] Login Flow"');
    expect(xml).toContain('<testsuite name="[firefox] Login Flow"');
    expect(xml).toContain('<skipped message="Skipped: when.browser does not match &apos;chromium&apos;"/>');
    expect(xml).toContain('<failure message="Timeout waiting for #firefox-btn">Timeout waiting for #firefox-btn</failure>');
  });
});
