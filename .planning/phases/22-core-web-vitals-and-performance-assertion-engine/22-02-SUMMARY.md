---
phase: 22-core-web-vitals-and-performance-assertion-engine
plan: 02
subsystem: performance-profiling
tags: [core-web-vitals, performance-assertions, throttling, cli-runner, reporters, playwright]
dependency_graph:
  requires:
    - 22-01 (PerfObserverEngine, ThrottlingManager, metric evaluators)
  provides:
    - End-to-end performance assertion execution in CLI runner and Studio Playwright engine
    - Core Web Vitals terminal scorecards and JUnit performance telemetry report properties
    - CLI throttling flags (--throttle, --cpu-slowdown)
  affects:
    - cli/runner.ts
    - cli/parseArgs.ts
    - cli/reporters/consoleReporter.ts
    - cli/reporters/junitReporter.ts
    - electron/ipc/playwrightEngine.ts
tech-stack:
  added: []
  patterns:
    - Declarative performance assertions and budget evaluation
    - Synthetic network/CPU throttling attached to Playwright page sessions
    - Terminal ASCII performance scorecards with Google Web Vitals ratings
key-files:
  created: []
  modified:
    - cli/types.ts
    - cli/parseArgs.ts
    - cli/parseArgs.test.ts
    - cli/reporters/consoleReporter.ts
    - cli/reporters/junitReporter.ts
    - cli/reporters/junitReporter.test.ts
    - cli/runner.ts
    - cli/runner.test.ts
    - electron/ipc/playwrightEngine.ts
    - electron/ipc/playwrightEngine.test.ts
decisions:
  - Added --throttle and --cpu-slowdown arguments to CLI parser with validation against supported network presets.
  - Automatically evaluate assertPerformance and throttle steps in both headless CI runner and Studio engine with cross-browser fallback.
  - Formatted Core Web Vitals telemetry in console reports with color-coded ratings (GOOD/NEEDS IMPROVEMENT/POOR) and properties in JUnit XML.
metrics:
  duration: 4m
  completed_date: "2026-08-19"
---

# Phase 22 Plan 02: Performance Profiling Execution, Reporting, and Engine Wiring Summary

Integrated Core Web Vitals telemetry extraction, declarative performance assertions (`assertPerformance`), and network/CPU throttling (`throttle`) across the CLI runner, arguments parser, reporters, and Electron Playwright engine.

## Key Changes

1. **CLI Types & Argument Parsing (`cli/types.ts`, `cli/parseArgs.ts`)**:
   - Added `--throttle` / `-T` (`slow3g`, `fast3g`, `offline`, `none`) and `--cpu-slowdown` CLI flags.
   - Updated `CliTestResult` and `CliStepResult` with `metrics?: WebVitalsMetrics` and `perfResult?: PerformanceAssertionResult`.

2. **Reporters (`cli/reporters/consoleReporter.ts`, `cli/reporters/junitReporter.ts`)**:
   - Implemented `formatPerfScorecard` to render terminal ASCII Core Web Vitals scorecard tables.
   - Added Core Web Vitals telemetry properties and failure message diffs into JUnit XML test report output.

3. **Headless Runner (`cli/runner.ts`)**:
   - Wired `PerfObserverEngine` to browser contexts.
   - Handled `assertPerformance` and `throttle` steps dynamically.
   - Evaluated flow-level `performanceBudget` and included final metrics in test result objects.

4. **Studio Engine (`electron/ipc/playwrightEngine.ts`)**:
   - Attached `PerfObserverEngine` to active execution contexts.
   - Handled `assertPerformance` and `throttle` commands during flow execution.
   - Ensured clean teardown of network/CPU throttling in `finally` blocks.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

None.

## Self-Check: PASSED

- `cli/types.ts` exists and compiles
- `cli/parseArgs.ts` exists and tests pass
- `cli/reporters/consoleReporter.ts` exists and exports `formatPerfScorecard`
- `cli/runner.ts` and `electron/ipc/playwrightEngine.ts` execute performance steps
- All 624 tests pass, lint passes, typecheck passes.
