---
phase: 08-interactive-reports-and-flamechart
plan: 02
subsystem: reports
tags: [reports, flamechart, waterfall, latency, a11y]
requires: ["08-01"]
provides: ["REPORT-02"]
affects: [src/components/reports/LatencyFlamechart.tsx, src/components/reports/TestReports.tsx, src/a11y/en.json]
tech-stack:
  added: []
  patterns: [waterfall timeline visualization, latency bottleneck badges, view mode toggling]
key-files:
  created:
    - src/components/reports/LatencyFlamechart.tsx
    - src/components/reports/LatencyFlamechart.test.tsx
    - src/components/reports/TestReports.test.tsx
  modified:
    - src/components/reports/TestReports.tsx
    - src/a11y/en.json
decisions:
  - Highlight latency bottlenecks with thresholds: >800ms warning and >1500ms critical alert chips.
  - Compute cumulative start time offsets and relative width percentages for crisp waterfall rendering.
metrics:
  duration: 4m
  completed_date: "2026-08-16"
---

# Phase 08 Plan 02: Latency Flamechart & Step Waterfall Summary

Waterfall latency flamechart component with step duration breakdowns, bottleneck warnings, and view mode toggle inside TestReports.

## Accomplishments

- **LatencyFlamechart Component (`src/components/reports/LatencyFlamechart.tsx`)**:
  - Computes cumulative start time offsets and proportional bar widths based on total flow duration.
  - Displays KPI summary tiles: Total Duration, Bottlenecks (>800ms), Average Latency, and Slowest Step.
  - Renders visual timeline ruler markers (0ms, 25%, 50%, 75%, 100%).
  - Highlights steps exceeding latency thresholds with warning chips: `>800ms` (Slow) and `>1.5s` (Critical bottleneck).
- **TestReports Integration (`src/components/reports/TestReports.tsx`)**:
  - Added segmented view mode toggle (`Step List` vs `Latency Flamechart`) in the breakdown section.
  - Seamless toggle preserving active tab state and accessibility translations.
- **Accessibility & Localization (`src/a11y/en.json`)**:
  - Added all flamechart labels, tooltips, warnings, and metric strings under `reports.flamechart.*`.
- **Test Coverage**:
  - Unit tests for `LatencyFlamechart.test.tsx` and `TestReports.test.tsx` verifying metrics, bottleneck detection, toggle transitions, and empty states.

## Verification

- `pnpm lint` passed with 0 warnings/errors.
- `pnpm test` passed 29 test suites and 346 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
