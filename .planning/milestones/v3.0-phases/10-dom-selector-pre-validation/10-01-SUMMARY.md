---
phase: 10-dom-selector-pre-validation
plan: 01
subsystem: ipc-probing
tags: [dom-validation, ipc, isolated-probing, webview]
requires: []
provides:
  - validate_dom_selector IPC handler in webviewManager
  - tracyApi.validateDomSelector frontend client wrapper
  - ProbeSelectorType, SelectorValidationPayload, and SelectorValidationResult types
affects:
  - electron/ipc/webviewManager.ts
  - electron/preload.ts
  - src/lib/ipc.ts
  - src/types/skills.ts
tech-stack:
  added: []
  patterns:
    - JSON-serialized parameter passing to executeJavaScript in isolated world
    - Non-throwing probe returning detailed match metadata
    - Safe browser fallback in non-Electron environment
key-files:
  created: []
  modified:
    - electron/ipc/webviewManager.ts
    - electron/preload.ts
    - electron/preload.test.ts
    - electron/ipc/security.test.ts
    - src/lib/ipc.ts
    - src/types/skills.ts
decisions:
  - Named probing selector type ProbeSelectorType to prevent conflict with existing flow SelectorType
  - Bound executeJavaScript to 2000ms timeout with max 10 matches returned per query
metrics:
  duration: 4m
  completed_date: "2026-08-19"
---

# Phase 10 Plan 01: DOM Selector Pre-Validation IPC Prober Summary

Isolated-world DOM selector probing IPC handler in `electron/ipc/webviewManager.ts`, preload channel whitelist in `electron/preload.ts`, client wrapper in `src/lib/ipc.ts`, and DOM probe contracts in `src/types/skills.ts`.

## Deliverables & Key Changes

1. **Type Definitions (`src/types/skills.ts`, `src/types/index.ts`)**:
   - Declared `ProbeSelectorType`, `SelectorValidationPayload`, `BoundingBox`, `DomElementProbeMatch`, and `SelectorValidationResult`.

2. **Preload & Whitelist (`electron/preload.ts`, `electron/preload.test.ts`)**:
   - Added `validate_dom_selector` to `ALLOWED_INVOKE_CHANNELS` whitelist (31 channels total).
   - Updated preload channel unit tests.

3. **IPC Prober Implementation (`electron/ipc/webviewManager.ts`)**:
   - Implemented `probeSelectorInWebview` executing an IIFE probe inside child `WebContentsView`.
   - Supported CSS (with shadow DOM penetration), XPath, Text search, and ARIA / role search.
   - Evaluated bounding box, visibility, clickability (`pointer-events`), and shadow DOM presence.
   - Implemented `validate_dom_selector` handler validating `projectId` and bounding execution time/payload.

4. **Client API Wrapper (`src/lib/ipc.ts`)**:
   - Added `tracyApi.validateDomSelector` with Electron detection guard and non-Electron fallback.

5. **Security Unit Tests (`electron/ipc/security.test.ts`)**:
   - Added test coverage for empty selector inputs and resilient non-throwing script execution errors.

## Verification

- `pnpm lint` passed with zero errors/warnings.
- `pnpm typecheck` passed cleanly.
- `pnpm test` passed (33 test files, 379 tests).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type name collision with existing `SelectorType` in `flow.ts`**
- **Found during:** Task 2 (typecheck)
- **Issue:** `src/types/index.ts` re-exports all types from `flow.ts` and `skills.ts`. Both defined `SelectorType`.
- **Fix:** Renamed probe type to `ProbeSelectorType` in `skills.ts`.
- **Files modified:** `src/types/skills.ts`, `src/lib/ipc.ts`, `electron/ipc/webviewManager.ts`.
- **Commit:** `781ae5e`

## Self-Check: PASSED
- `electron/ipc/webviewManager.ts` exists and tested
- `electron/preload.ts` contains `validate_dom_selector`
- `src/lib/ipc.ts` exposes `validateDomSelector`
- Commits `519c486` and `781ae5e` verified in git log
