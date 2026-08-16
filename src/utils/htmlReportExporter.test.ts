import { describe, it, expect } from 'vitest';
import { generateStandaloneHtmlReport } from './htmlReportExporter';
import type { TestRunResult } from '@/src/types/execution';

describe('htmlReportExporter', () => {
  const mockResult: TestRunResult = {
    id: 'run-123',
    flowId: 'flow-abc',
    flowName: 'Checkout Flow',
    timestamp: '2026-08-16T12:00:00Z',
    durationMs: 1540,
    status: 'PASSED',
    passedCount: 3,
    failedCount: 0,
    skippedCount: 0,
    totalCount: 3,
    steps: [
      {
        id: 's1',
        command: 'navigate',
        value: 'https://example.com',
        status: 'passed',
        durationMs: 400,
      },
      {
        id: 's2',
        command: 'leftClick',
        target: '#buy-btn',
        status: 'passed',
        durationMs: 140,
      },
      {
        id: 's3',
        command: 'assertVisible',
        target: { type: 'css', value: '.success-modal' },
        status: 'passed',
        durationMs: 1000,
      },
    ],
    logs: [
      {
        id: 'l1',
        timestamp: '12:00:00',
        level: 'info',
        stepIndex: 0,
        message: 'Navigating to page',
      },
    ],
    artifacts: {
      screenshots: [],
    },
  };

  it('produces valid HTML5 with metadata and status badges', () => {
    const html = generateStandaloneHtmlReport(mockResult, 'Checkout Flow');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('Checkout Flow');
    expect(html).toContain('PASSED');
    expect(html).toContain('1.54s');
    expect(html).toContain('3 / 3');
    expect(html).toContain('100%');
  });

  it('renders step table with command, target, status and duration', () => {
    const html = generateStandaloneHtmlReport(mockResult, 'Checkout Flow');
    expect(html).toContain('navigate');
    expect(html).toContain('https://example.com');
    expect(html).toContain('leftClick');
    expect(html).toContain('#buy-btn');
    expect(html).toContain('assertVisible');
    expect(html).toContain('400ms');
  });

  it('embeds failure screenshots and error details when present', () => {
    const failedResult: TestRunResult = {
      ...mockResult,
      status: 'FAILED',
      passedCount: 2,
      failedCount: 1,
      steps: [
        ...mockResult.steps.slice(0, 2),
        {
          id: 's3',
          command: 'assertVisible',
          target: '.missing-element',
          status: 'failed',
          durationMs: 5000,
          errorMessage: 'Timeout 5000ms exceeded waiting for selector .missing-element',
          screenshotUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        },
      ],
      artifacts: {
        screenshots: [
          {
            name: 'step-3-fail.png',
            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            timestamp: '12:00:05',
          },
        ],
      },
    };

    const html = generateStandaloneHtmlReport(failedResult, 'Checkout Flow');
    expect(html).toContain('FAILED');
    expect(html).toContain('Timeout 5000ms exceeded');
    expect(html).toContain('data:image/png;base64,');
    expect(html).toContain('<img');
  });

  it('escapes unsafe HTML characters to prevent XSS injection in reports', () => {
    const xssResult: TestRunResult = {
      ...mockResult,
      flowName: '<script>alert("xss")</script>',
      steps: [
        {
          id: 's1',
          command: 'fill',
          target: '<img src=x onerror=alert(1)>',
          value: '"><svg onload=alert(2)>',
          status: 'passed',
          durationMs: 100,
        },
      ],
    };

    const html = generateStandaloneHtmlReport(xssResult, '<script>alert("xss")</script>');
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
