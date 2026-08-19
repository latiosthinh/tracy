# Phase 22 Plan 01: Core Performance Telemetry, Assertion Evaluator & Throttling Core Summary

**Subsystem:** Performance Profiling & Assertion Engine
**Tags:** `web-vitals`, `cdp`, `performance-budget`, `throttling`, `playwright`

## Key Accomplishments

1. **Declarative Flow Performance Types & Schema Contracts (`src/types/flow.ts`, `docs/FLOW_SCHEMA.md`):**
   - Added `assertPerformance` and `throttle` to `CommandType`.
   - Defined `PerformanceMetricKey`, `PerformanceAssertionThreshold`, `PerformanceBudget`, `ThrottlingPreset`, `ThrottlingConfig`, and `AssertPerformanceStep`.
   - Extended `FlowMetadata` with `throttling` and `performanceBudget` options.
   - Documented schema usage with YAML examples in `docs/FLOW_SCHEMA.md`.

2. **In-Browser Telemetry Observer (`electron/core/perf/injectedObserver.ts`):**
   - Self-contained IIFE injected via `page.addInitScript()`.
   - Listens to `largest-contentful-paint`, `layout-shift`, `paint`, `event`, and `first-input` performance observer entries.
   - Automatically computes TTFB, DOMContentLoaded, and LoadTime with W3C Navigation & Resource Timing fallbacks when observer entries are unsupported (WebKit & Firefox).

3. **CDP Throttling Manager (`electron/core/perf/throttlingManager.ts`):**
   - Implemented synthetic presets: `slow3g`, `fast3g`, `offline`, and `none`.
   - Supported custom latency, bandwidth (kbps), and CPU slowdown rates (`Emulation.setCPUThrottlingRate`).
   - Strict `browserEngine === 'chromium'` guard preventing CDP crashes on WebKit and Firefox.

4. **PerfObserverEngine & Threshold Evaluator (`electron/core/perf/perfObserverEngine.ts`):**
   - Implemented `parseThresholdExpression` supporting operators (`<`, `<=`, `>`, `>=`, `==`) and unit parsing (`ms`, `s`, decimals).
   - Implemented `classifyMetricRating` mapping to Google Core Web Vitals targets (`good`, `needs-improvement`, `poor`).
   - Implemented `evaluatePerformanceAssertion` validating harvested metrics against budgets with actionable diff summaries.
   - Built `PerfObserverEngine` orchestrating context script injection, visibility flush, CDP JSHeap metric query, and metric harvesting.

5. **Test Suite (`electron/core/perf/perfObserverEngine.test.ts`):**
   - 17 unit tests verifying parsing, rating classification, assertion evaluation, CDP throttling guards, and metric harvesting.

## Deviations from Plan

None - plan executed exactly as written.

## Key Files Created / Modified

- `src/types/flow.ts`
- `docs/FLOW_SCHEMA.md`
- `electron/core/perf/types.ts`
- `electron/core/perf/injectedObserver.ts`
- `electron/core/perf/throttlingManager.ts`
- `electron/core/perf/perfObserverEngine.ts`
- `electron/core/perf/perfObserverEngine.test.ts`

## Self-Check: PASSED

- All files exist on disk.
- Commit `cf30a5d` created and verified.
- `pnpm typecheck` passed with zero errors.
- `pnpm test` (67 test files, 618 tests) passed.
