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
- [ ] 01-02-PLAN.md — Renderer wiring: RealBrowserView/StudioView project scoping + per-project browser path state
- [ ] 01-03-PLAN.md — Verification: two-project isolation checkpoint in dev app
