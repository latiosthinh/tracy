# Requirements: Tracy

## WEBVIEW — Embedded Browser Sessions

**WEBVIEW-01: Per-project embedded browser sessions**
Each project owns an isolated embedded browser session (Electron `WebContentsView`) in the
main process, keyed by project id. The shared-singleton webview must not remain.
Acceptance:
- Main process keeps a registry of webviews keyed by project id (no module-level single view)
- Opening a webview for project A never changes project B's webview URL or content
- Session lifecycle: webviews are created per project, hidden/shown per project, and a
  bounded cap prevents unbounded view growth (memory)

**WEBVIEW-02: Project identity flows through the browser control stack**
The renderer passes project identity with every embedded-browser IPC call.
Acceptance:
- `tracyApi.openChildWebview / resizeChildWebview / setChildWebviewVisible / closeChildWebview`
  all take and forward a project id
- `RealBrowserView` receives the active project id from `StudioView` and uses it for all
  webview IPC calls
- Switching the active project in the studio shows that project's own browser view
- Per-project browser path state (no shared `targetPath` leaking across projects)

**WEBVIEW-03: Security posture and quality gates preserved**
Acceptance:
- `WebContentsView` instances keep `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Existing URL scheme validation (`http/https/about:blank` only) preserved on open
- Preload whitelist channel names unchanged (payload-only change); wrapper in `src/lib/ipc.ts`
  updated per IPC contract convention
- `pnpm lint` and `pnpm test` green; electron main bundle builds (`pnpm exec vite build`)
