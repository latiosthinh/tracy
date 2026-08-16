# Phase 08 Context: Interactive HTML Reports & Latency Flamechart

## Overview
Comprehensive test report sharing and execution performance profiling: standalone single-file HTML report exporter with embedded screenshots and an interactive step execution latency waterfall flamechart.

## Decisions
- Standalone HTML Exporter (`src/utils/htmlReportExporter.ts`): generates a single self-contained `.html` file with embedded modern styling (vintage ProQA theme), SVG icons, collapsible step cards, execution summary badges, and embedded base64 screenshots. Users can click "Download HTML Report" or "Copy HTML" in `TestReports.tsx`.
- Latency Flamechart (`src/components/reports/LatencyFlamechart.tsx`): horizontal timeline bar chart showing each step's duration (in milliseconds), percentage of total run time, with amber/red warning badges for steps exceeding threshold (> 800ms / 1500ms).
- All labels and tooltips extracted to `src/a11y/en.json` under `reports.htmlExport` and `reports.flamechart`.
