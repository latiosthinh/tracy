# Roadmap: Tracy

## Milestone 1.0 — Project-Isolated Studio

### Phase 01: Per-Project Embedded Browser

**Goal:** Changing one project's browser URL/state never affects another project —
each project has its own embedded-browser control in the studio.

**Why:** Current app has a single shared `WebContentsView` for the embedded browser
(main-process singleton) plus project-less renderer state. Navigating in one project
visibly changes every other project's browser, which is the reported bug.

**Requirements:** WEBVIEW-01, WEBVIEW-02, WEBVIEW-03

Plans:
- [x] 01-01-PLAN.md — Main-process per-project webview registry + IPC contract (projectId on all webview channels)
- [x] 01-02-PLAN.md — Renderer wiring: RealBrowserView/StudioView project scoping + per-project browser path state
- [x] 01-03-PLAN.md — Verification: two-project isolation checkpoint in dev app

### Phase 02: Accessibility & Zero-Hardcoded-Text Refactor

**Goal:** Transform the UI to be fully accessible with standard ARIA semantics, modal focus traps, and 100% of user-facing text extracted into `src/a11y/en.json` via `useTranslation()`.

**Requirements:** A11Y-01, A11Y-02, A11Y-03, A11Y-04

Plans:
- [x] 02-01-PLAN.md — A11y & i18n infrastructure: en.json domain hierarchy, enhanced useTranslation with interpolation, jsx-a11y lint config, and shared Modal a11y hardening
- [x] 02-02-PLAN.md — Layout & Studio text extraction: Header, Tabs, StudioToolbar, RealBrowserView, StepTimeline, ElementInspector, DomMinerPanel, StudioRightSidebar
- [x] 02-03-PLAN.md — Settings, Setup, Projects & Modals text extraction: SettingsModal, UiSettingsPanel, WelcomeSetup, ProjectManager, AgentSelector, CreateFlowModal, DocsModal, BatchMinerModal, ErrorBoundary
- [x] 02-04-PLAN.md — AI, Editor, Reports & Guard tests: AiCopilot, AiPromptInput, VoiceInputButton, YamlEditor, VisualStepEditor, TestReports, CliTerminal, SplashScreen, a11yTextGuard test

### Phase 03: Post-Audit Hardening (Security, Core Correctness, CI & A11y Integrity)

**Goal:** Close all security vulnerabilities (command injection on Windows, path traversal, navigation jail), fix broken core functional features (auto-save, duplicate IPC listeners, crash on inspect, fetch timeouts, real modal focus trap), and restore strict CI lint/guard gates.

**Requirements:** SEC-01, SEC-02, SEC-03, FIX-01, FIX-02, FIX-03, FIX-04, CIX-01, CIX-02

Plans:
- [x] 03-01-PLAN.md — Security wave: Windows command injection mitigation, path.sep traversal fix + constrained project base, renderer navigation jail, URL allowlist everywhere, webview input validation, fetch timeouts & cursor polling
- [ ] 03-02-PLAN.md — Core correctness wave: auto-save wiring with uiStore & domSnapshotStore, IPC listener dedupe & cleanup, web-mode ipc guards, playwrightEngine require fix, full WAI-ARIA modal focus trap, run generation pause token
- [ ] 03-03-PLAN.md — CI & A11y integrity wave: restore strict ESLint rules at error level with --max-warnings 0, rebuild guard test covering all attributes & expressions, extract remaining ~59 strings, en.json dedupe, typed useTranslation keys


