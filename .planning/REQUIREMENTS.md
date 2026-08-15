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

## A11Y — Accessibility & Zero-Hardcoded-Text Refactor

**A11Y-01: Zero hardcoded user-visible text in components**
All user-facing strings, button labels, tooltips, titles, placeholders, and error templates are extracted into `src/a11y/en.json` and consumed via `useTranslation()`. Dynamic runtime IPC errors are the documented exception.
Acceptance:
- `src/a11y/en.json` is organized into feature domains (common, header, tabs, studio, copilot, settings, projects, modals, reports, setup, docs)
- `useTranslation()` supports typed keys and `{param}` interpolation
- All 40 component files use `t('domain.key')` for static text, titles, placeholders, and aria-labels

**A11Y-02: jsx-a11y lint rule enforcement**
ESLint enforces standard React accessibility rules as errors in CI.
Acceptance:
- `eslint-plugin-jsx-a11y` configured in ESLint
- Zero `jsx-a11y` lint errors across the entire codebase

**A11Y-03: Modal and interactive accessibility hardening**
Interactive components follow WAI-ARIA authoring practices.
Acceptance:
- Shared `Modal.tsx` implements `role="dialog"`, `aria-modal="true"`, focus trapping, initial focus, and Escape-to-close
- Form inputs have associated labels (`<label htmlFor>` or `aria-label`)
- Icon-only buttons have accessible names (`aria-label` matching tooltip title)
- Execution logs and streaming statuses use `aria-live="polite"`
- Decorative logos/icons use `aria-hidden="true"`

**A11Y-04: No-hardcoded-text guard test**
An automated test scans `src/components/**/*.tsx` to ensure no raw JSX text nodes exist outside documented exceptions.
Acceptance:
- `src/a11y/a11yTextGuard.test.ts` scans all component files and passes

