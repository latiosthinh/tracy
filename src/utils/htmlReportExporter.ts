import type { TestRunResult } from '@/src/types/execution';
import type { FlowStep } from '@/src/types/flow';

export type FlowExecutionResult = TestRunResult;

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTarget(target: FlowStep['target']): string {
  if (!target) return '-';
  if (typeof target === 'string') return target;
  if (typeof target === 'object') {
    return target.value || JSON.stringify(target);
  }
  return String(target);
}

export function generateStandaloneHtmlReport(result: TestRunResult, flowName?: string): string {
  const title = escapeHtml(flowName || result.flowName || 'E2E Test Flow');
  const status = result.status;
  const isPassed = status === 'PASSED';
  const durationSec = (result.durationMs / 1000).toFixed(2);
  const passRate = Math.round((result.passedCount / (result.totalCount || 1)) * 100);
  const timestamp = escapeHtml(result.timestamp || new Date().toISOString());

  const stepsHtml = (result.steps || [])
    .map((step, idx) => {
      const stepPassed = step.status === 'passed';
      const stepSkipped = step.status === 'skipped';
      const statusClass = stepPassed ? 'status-pass' : stepSkipped ? 'status-skip' : 'status-fail';
      const targetStr = escapeHtml(formatTarget(step.target));
      const valueStr = step.value ? `<div class="step-value font-mono">Value: ${escapeHtml(step.value)}</div>` : '';
      const errorHtml = step.errorMessage
        ? `<div class="step-error font-mono">${escapeHtml(step.errorMessage)}</div>`
        : '';
      const screenshotHtml = step.screenshotUrl
        ? `<div class="step-screenshot">
            <details>
              <summary>View Failure Screenshot</summary>
              <img src="${escapeHtml(step.screenshotUrl)}" alt="Failure snapshot at step ${idx + 1}" />
            </details>
          </div>`
        : '';

      return `
        <tr class="step-row ${stepPassed ? 'row-pass' : 'row-fail'}">
          <td class="col-num">${idx + 1}</td>
          <td class="col-status"><span class="badge ${statusClass}">${escapeHtml(step.status)}</span></td>
          <td class="col-cmd font-bold">${escapeHtml(step.command)}</td>
          <td class="col-target font-mono">
            <div>${targetStr}</div>
            ${valueStr}
            ${errorHtml}
            ${screenshotHtml}
          </td>
          <td class="col-duration font-mono text-right">${step.durationMs != null ? `${step.durationMs}ms` : '-'}</td>
        </tr>
      `;
    })
    .join('');

  const artifactScreenshots = (result.artifacts?.screenshots || [])
    .map(
      (s, idx) => `
      <div class="artifact-card">
        <div class="artifact-title">${escapeHtml(s.name || `Screenshot ${idx + 1}`)} (${escapeHtml(s.timestamp || '')})</div>
        <img src="${escapeHtml(s.url)}" alt="${escapeHtml(s.name)}" />
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tracy Test Report - ${title}</title>
  <style>
    :root {
      --bg: #0c0a09;
      --card-bg: #1c1917;
      --border: #292524;
      --text: #f5f5f4;
      --muted: #a8a29e;
      --amber: #f59e0b;
      --amber-dark: #b45309;
      --green: #10b981;
      --green-bg: rgba(16, 185, 129, 0.15);
      --red: #f43f5e;
      --red-bg: rgba(244, 63, 94, 0.15);
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 14px;
      line-height: 1.5;
      padding: 24px;
      margin: 0;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .header {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-left {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .header-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    h1 {
      font-size: 18px;
      font-weight: 700;
      color: #fef3c7;
    }
    .meta-text {
      font-size: 12px;
      color: var(--muted);
    }
    .badge {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 9999px;
      display: inline-block;
    }
    .status-pass {
      background: var(--green-bg);
      color: var(--green);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-fail {
      background: var(--red-bg);
      color: var(--red);
      border: 1px solid rgba(244, 63, 94, 0.3);
    }
    .status-skip {
      background: rgba(168, 162, 158, 0.15);
      color: var(--muted);
      border: 1px solid var(--border);
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }
    .kpi-card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 800;
    }
    .text-green { color: var(--green); }
    .text-red { color: var(--red); }
    .text-amber { color: var(--amber); }
    .section-card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #fef3c7;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--muted);
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      background-color: rgba(0, 0, 0, 0.2);
    }
    td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      font-size: 13px;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .col-num { width: 40px; color: var(--muted); font-size: 12px; }
    .col-status { width: 90px; }
    .col-cmd { width: 140px; color: var(--amber); }
    .col-duration { width: 100px; }
    .text-right { text-align: right; }
    .font-mono { font-family: var(--font-mono); }
    .font-bold { font-weight: 700; }
    .step-value {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
    }
    .step-error {
      background-color: var(--red-bg);
      color: var(--red);
      border: 1px solid rgba(244, 63, 94, 0.3);
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 12px;
      margin-top: 8px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .step-screenshot {
      margin-top: 8px;
    }
    details summary {
      cursor: pointer;
      color: var(--amber);
      font-size: 12px;
      user-select: none;
    }
    details summary:hover {
      text-decoration: underline;
    }
    details img, .artifact-card img {
      margin-top: 8px;
      max-width: 100%;
      border-radius: 6px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
    }
    .artifacts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }
    .artifact-card {
      background-color: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
    }
    .artifact-title {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
      font-family: var(--font-mono);
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: var(--muted);
      padding: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <div class="header-title-row">
          <span class="badge ${isPassed ? 'status-pass' : 'status-fail'}">${escapeHtml(status)}</span>
          <h1>${title}</h1>
        </div>
        <div class="meta-text">Executed at: ${timestamp}</div>
      </div>
      <div>
        <span class="meta-text">Generated by <strong>Tracy E2E Studio</strong></span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Passed / Total</div>
        <div class="kpi-value text-green">${result.passedCount} / ${result.totalCount}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Failed Steps</div>
        <div class="kpi-value text-red">${result.failedCount}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pass Rate</div>
        <div class="kpi-value text-amber">${passRate}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Execution Time</div>
        <div class="kpi-value text-amber">${durationSec}s</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">Step Execution Breakdown</div>
      <table>
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-status">Status</th>
            <th class="col-cmd">Command</th>
            <th class="col-target">Target / Details</th>
            <th class="col-duration text-right">Duration</th>
          </tr>
        </thead>
        <tbody>
          ${stepsHtml}
        </tbody>
      </table>
    </div>

    ${
      artifactScreenshots
        ? `
    <div class="section-card">
      <div class="section-title">Failure Screenshots & Artifacts</div>
      <div class="artifacts-grid">
        ${artifactScreenshots}
      </div>
    </div>`
        : ''
    }

    <div class="footer">
      Generated by Tracy ProQA Automation IDE &bull; Standalone HTML Test Report
    </div>
  </div>
</body>
</html>`;
}
