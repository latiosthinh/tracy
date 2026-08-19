---
phase: 20-declarative-network-route-mocking-and-har-replay-engine
plan: 02
subsystem: network-interception
tags:
  - playwright
  - network-mocking
  - har-replay
  - cli-runner
  - assertions
dependency_graph:
  requires:
    - "20-01"
  provides:
    - Integrated PlaywrightEngine NetworkMockManager
    - Integrated Headless CI CLI Runner NetworkMockManager
    - Step action handlers: mockRoute, unmockRoute, replayHar, assertRequest
  affects:
    - electron/ipc/playwrightEngine.ts
    - cli/runner.ts
tech_stack:
  added: []
  patterns:
    - Playwright context.route / routeFromHAR lifecycle in runner
    - Flow frontmatter mocks/har initialization
    - Guaranteed cleanup in finally blocks across Studio & CI runners
key_files:
  created:
    - electron/ipc/playwrightEngine.test.ts
  modified:
    - electron/ipc/playwrightEngine.ts
    - cli/runner.ts
    - cli/runner.test.ts
decisions:
  - Attached NetworkMockManager per flow run in both Electron Studio engine and Headless CLI runner
  - Guaranteed `await mockManager.cleanup()` in `finally` blocks for zero route leakage across consecutive flows
  - Supported shorthand action keys and structured objects for mockRoute and assertRequest steps in both runners
metrics:
  duration: 6m
  completed_date: "2026-08-19"
---

# Phase 20 Plan 02: Network Mock & Replay Runner Integration Summary

Integrated `NetworkMockManager` into the Electron execution engine (`electron/ipc/playwrightEngine.ts`) and Headless CI CLI runner (`cli/runner.ts`), supporting flow-level `mocks:`/`har:` frontmatter and step actions (`mockRoute`, `unmockRoute`, `replayHar`, `assertRequest`) with guaranteed context cleanup.

## What Was Done

1. **Electron Playwright Engine Integration (`electron/ipc/playwrightEngine.ts`)**:
   - Initialized `NetworkMockManager` per flow execution inside `run_flow`.
   - Attached mock manager to active `BrowserContext`.
   - Ingested top-level `flow.metadata.mocks` rules and `flow.metadata.har` replay options.
   - Handled inline step actions:
     - `mockRoute`: Added dynamic route mocking rule during flow run.
     - `unmockRoute`: Removed mock rule by ID or URL pattern.
     - `replayHar`: Attached HAR replay routing.
     - `assertRequest`: Verified captured network request counts/payloads, throwing descriptive error on mismatch.
   - Guaranteed `await mockManager.cleanup()` execution in `finally` block.

2. **Headless CI CLI Runner Integration (`cli/runner.ts`)**:
   - Updated `normalizeStep` to recognise `mockRoute`, `unmockRoute`, `replayHar`, `recordHar`, and `assertRequest`.
   - Attached `NetworkMockManager` to the headless `BrowserContext` in `executeSingleFlow`.
   - Applied top-level `flowJson.mocks` and `flowJson.har` before executing steps.
   - Executed network mock steps and request assertions in headless mode.
   - Guaranteed `await mockManager.cleanup()` execution in `finally` block.

3. **Testing & Verification**:
   - Added unit/integration tests in `electron/ipc/playwrightEngine.test.ts` for mock rules, network steps, assert failure, and cleanup.
   - Extended `cli/runner.test.ts` with network mock and assert test cases.
   - All 65 test suites (584 tests) passing; `pnpm lint` and `pnpm typecheck` clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Lint] Avoid Function type in test callbacks**
- **Found during:** Task 2 lint check
- **Issue:** ESLint `@typescript-eslint/no-unsafe-function-type` flagged `Record<string, Function>`.
- **Fix:** Replaced `Function` with `(...args: any[]) => any`.
- **Files modified:** `electron/ipc/playwrightEngine.test.ts`
- **Commit:** `538f350`

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: context_isolation | `electron/ipc/playwrightEngine.ts`, `cli/runner.ts` | Guaranteed `cleanup()` in `finally` block unroutes all listeners, preventing state/route leakage across flows. |

## Self-Check: PASSED

- [x] `electron/ipc/playwrightEngine.ts` updated with NetworkMockManager
- [x] `electron/ipc/playwrightEngine.test.ts` exists and passes
- [x] `cli/runner.ts` updated with NetworkMockManager
- [x] `cli/runner.test.ts` exists and passes
- [x] Commit `a7cd7e1` exists
- [x] Commit `6f203bb` exists
- [x] Commit `ada1f88` exists
- [x] Commit `d41716c` exists
- [x] Commit `538f350` exists
