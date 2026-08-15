# Phase 01: Per-Project Embedded Browser — Context

**Gathered:** 2026-08-15
**Status:** Ready for planning
**Source:** Issue report (user) + codebase investigation

<domain>
## Phase Boundary

Fix cross-project browser state leakage in Tracy studio. Deliver: each project owns an
isolated embedded browser control (Electron `WebContentsView`), keyed end-to-end by
project id — main process registry, IPC contract, renderer wiring, per-project path state.

Out of boundary: Playwright execution engine isolation (single-run by design), DOM mining
storage (already per-project), project URL field persistence (already per-project in store).

</domain>

<decisions>
## Implementation Decisions

### Root cause (verified)
- `electron/ipc/webviewManager.ts:3` — module singleton `let webview: WebContentsView | null`
  shared by all projects; `open_child_webview` destroys/recreates it for whichever project
  navigates last.
- `src/components/studio/RealBrowserView.tsx` — no project identity in any webview IPC call.
- `src/components/studio/StudioView.tsx:74,375` — shared `targetPath` useState and
  unkeyed single `<RealBrowserView>` instance; URL-bar state leaks across project tabs.

### Locked decisions
- **D-01 (per report):** Behavior = each project has its own embedded-browser control.
  Changing one project's browser URL/state must never change another project's.
- **D-02:** Main process replaces singleton with `Map<projectId, WebContentsView>` registry.
  All four handlers (`open_child_webview`, `resize_child_webview`,
  `set_child_webview_visible`, `close_child_webview`) take `projectId` in payload.
  Preload whitelist channel names unchanged (payload-only change).
- **D-03:** `tracyApi` wrappers (`src/lib/ipc.ts`) gain `projectId` as first parameter on
  `openChildWebview`, `resizeChildWebview`, `setChildWebviewVisible`, `closeChildWebview`;
  web-mode `isElectronEnv()` no-op guards unchanged.
- **D-04:** `RealBrowserView` receives required `projectId` prop; `StudioView` renders it
  with `key={activeProjectId}` so component state resets per project.
- **D-05:** Per-project browser path moves to `projectStore`: `browserPaths: Record<string, string>`
  + `getBrowserPath(projectId)` / `setBrowserPath(projectId, path)`. Default path `/`.
- **D-06 (security):** Every `WebContentsView` keeps `contextIsolation: true`,
  `nodeIntegration: false`, `sandbox: true`. URL scheme validation (http/https/about:blank)
  preserved. `projectId` validated as non-empty string ≤ 128 chars in handlers.
- **D-07 (memory):** Registry caps live views at 4 (LRU — evict least recently opened on
  overflow). `open` with unchanged URL skips `loadURL` (no reload flicker on tab switch).

### the agent's Discretion
- Exact eviction bookkeeping structure; test phrasing; minor RealBrowserView effect cleanup.

</decisions>

<canonical_refs>
## Canonical References

### Embedded browser stack
- `electron/ipc/webviewManager.ts` — current singleton implementation (replace)
- `electron/preload.ts` — IPC channel whitelists (channels unchanged, verify only)
- `src/lib/ipc.ts` — `tracyApi` wrapper contract (update signatures)

### Studio consumers
- `src/components/studio/RealBrowserView.tsx` — webview lifecycle effects (add projectId)
- `src/components/studio/StudioView.tsx` — mounts RealBrowserView, owns targetPath (key + store wiring)
- `src/stores/projectStore.ts` — per-project state home (add browserPaths)

</canonical_refs>

<specifics>
## Specific Ideas

- Symptom to reproduce/verify: open 2 projects, navigate project A's browser, switch to
  project B — B must show its own URL/page, not A's.

</specifics>

<deferred>
## Deferred Ideas

- Per-project Playwright execution contexts (`run_flow`, `navigate_browser` stay global —
  execution is a single active run by design)
- Batch miner `returnToUrl` project scoping

</deferred>

---

*Phase: 01-per-project-browser*
*Context gathered: 2026-08-15 via issue report*
