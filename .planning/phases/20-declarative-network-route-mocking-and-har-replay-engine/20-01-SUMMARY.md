---
phase: 20-declarative-network-route-mocking-and-har-replay-engine
plan: 01
subsystem: network-interception
tags:
  - playwright
  - network-mocking
  - har-replay
  - assertions
dependency_graph:
  requires: []
  provides:
    - NetworkMockManager
    - NetworkMockRule
    - RouteMockOptions
    - HarReplayOptions
    - AssertRequestStep
    - CapturedRequestEntry
  affects:
    - playwrightEngine
    - flowRunner
    - cliRunner
tech_stack:
  added: []
  patterns:
    - Playwright context.route / route.fulfill / route.abort / route.fallback
    - Glob-to-regex URL matching with query-string normalization
    - Ring-buffer captured request history logging (capped at 500)
    - Safe workspace fixture file resolution
key_files:
  created:
    - electron/core/network/types.ts
    - electron/core/network/networkMockManager.ts
    - electron/core/network/networkMockManager.test.ts
    - src/types/flow.test.ts
  modified:
    - src/types/flow.ts
    - docs/FLOW_SCHEMA.md
decisions:
  - Normalized glob and regex pattern matching to ignore query parameters on URL match checks
  - Capped captured request ring buffer at 500 items to avoid unbounded memory growth in long test suites
  - Guaranteed `route.fallback()` invocation on unhandled paths and error cases to prevent hung sockets
metrics:
  duration: 8m
  completed_date: "2026-08-19"
---

# Phase 20 Plan 01: Declarative Route Mocking & HAR Replay Engine Core Summary

Implemented the foundational network interception and HAR replay engine for Tracy with declarative flow schema types, Playwright routing, delay/abort simulation, HAR replay, request assertions, and zero-leakage teardown.

## What Was Done

1. **Schema & Flow Type Definitions (`src/types/flow.ts`, `docs/FLOW_SCHEMA.md`, `electron/core/network/types.ts`)**:
   - Added `'mockRoute' | 'unmockRoute' | 'recordHar' | 'replayHar' | 'assertRequest'` commands to `CommandType`.
   - Defined `NetworkMockRule`, `RouteMockOptions`, `HarReplayOptions`, `AssertRequestStep`, `HttpMethod`, and `AbortReason`.
   - Updated `FlowMetadata` to support top-level `mocks` and `har` frontmatter declarations.
   - Documented declarative mocking syntax and step commands in `docs/FLOW_SCHEMA.md`.

2. **NetworkMockManager Core Engine (`electron/core/network/networkMockManager.ts`)**:
   - Wrapped Playwright `context.route('**/*', ...)` with fallback-safe handling.
   - Built matching logic supporting exact strings, glob patterns (`**/api/**`), and regex literals (`/pattern/flags`).
   - Implemented response fulfillment (`route.fulfill`) with status codes, headers, inline text/JSON bodies, and sanitized workspace fixture files.
   - Implemented network abort simulation (`route.abort`) with standard Playwright abort reasons (`failed`, `timedout`, `connectionreset`, `accessdenied`, `blockedbyclient`).
   - Added synthetic latency simulation via `delayMs`.
   - Added HAR replay via `context.routeFromHAR()`.
   - Added request assertion engine (`assertRequest`) validating method, URL, count, query params, and JSON body matching.
   - Implemented cleanup and unrouting (`context.unrouteAll()`) to ensure no route leak between runs.

3. **Validation & Unit Tests (`electron/core/network/networkMockManager.test.ts`, `src/types/flow.test.ts`)**:
   - 10 unit tests covering context attachment, exact/glob/regex matching, fulfillment, fixtures, aborts, latency, repetition limits (`times`), HAR replay, assertions, and teardown.
   - All 64 test suites (579 tests) passing; lint and typecheck clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Glob matching with query strings on URLs**
- **Found during:** Task 2 unit tests
- **Issue:** Query parameters in request URLs caused glob patterns (e.g. `**/api/items`) to fail matching.
- **Fix:** Added `urlWithoutQuery` fallback in `matchesRule` to match against pathname as well as full URL.
- **Files modified:** `electron/core/network/networkMockManager.ts`
- **Commit:** `3daf564`

**2. [Rule 3 - Lint] Empty interface declaration**
- **Found during:** Task 2 lint check
- **Issue:** ESLint rule `@typescript-eslint/no-empty-object-type` flagged `interface RouteMockOptions extends NetworkMockRule {}`.
- **Fix:** Converted `RouteMockOptions` to type alias `export type RouteMockOptions = NetworkMockRule`.
- **Files modified:** `src/types/flow.ts`
- **Commit:** `3daf564`

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: file_access | `electron/core/network/networkMockManager.ts` | Resolves fixture files from workspace path; enforces workspace boundary check to prevent directory traversal. |

## Self-Check: PASSED

- [x] `src/types/flow.ts` exists and exports network mock types
- [x] `docs/FLOW_SCHEMA.md` exists with documented network schema
- [x] `electron/core/network/types.ts` exists
- [x] `electron/core/network/networkMockManager.ts` exists
- [x] `electron/core/network/networkMockManager.test.ts` exists and passes
- [x] Commit `6a18649` exists
- [x] Commit `3daf564` exists
