# Phase 01 Plan 01: Per-Project Webview Registry & IPC Contract Summary

Per-project WebContentsView registry in main process with LRU cap 4 and updated tracyApi signatures with projectId parameter.

## Tasks Completed

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 1 | Per-project webview registry in main process | 423b963 | `electron/ipc/webviewManager.ts` |
| 2 | tracyApi contract update + tests | dc40de6 | `src/lib/ipc.ts`, `src/lib/ipc.test.ts` |

## Key Changes

- `electron/ipc/webviewManager.ts`: Replaced module singleton `let webview` with `Map<string, WebviewEntry>`.
  - Added `isValidProjectId` input validation (non-empty string <= 128 chars).
  - Preserved security `webPreferences` (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
  - Preserved URL allowlist validation (`http://`, `https://`, `about:blank`).
  - Added LRU eviction capping live webviews at `MAX_LIVE_WEBVIEWS = 4`.
  - Handlers skip reload if target URL is identical to prevent flicker.
- `src/lib/ipc.ts`: Updated `openChildWebview`, `resizeChildWebview`, `setChildWebviewVisible`, and `closeChildWebview` signatures to accept `projectId: string` as first argument while keeping `isElectronEnv()` guards.
- `src/lib/ipc.test.ts`: Updated unit test suite to cover all 4 webview wrappers with project id parameter.

## Verification

- `pnpm test src/lib/ipc.test.ts` passed (24/24 tests green).
- `pnpm exec vite build` passed (compiles renderer + Electron main & preload bundles cleanly).
- Singleton `let webview` verified absent from `electron/ipc/webviewManager.ts`.

## Deviations from Plan

None - plan executed exactly as written. (Note: global `pnpm typecheck` error on `RealBrowserView.tsx` call sites is expected and scoped to Plan 01-02).

## Self-Check: PASSED
- `electron/ipc/webviewManager.ts`: FOUND
- `src/lib/ipc.ts`: FOUND
- `src/lib/ipc.test.ts`: FOUND
- Commit 423b963: FOUND
- Commit dc40de6: FOUND
