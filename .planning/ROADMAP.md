# Roadmap: ProQA

## Milestone 1.0 — Project-Isolated Studio & Hardening (Completed)

### Phase 01: Per-Project Embedded Browser (Completed)
Plans:
- [x] 01-01-PLAN.md — Main-process per-project webview registry + IPC contract
- [x] 01-02-PLAN.md — Renderer wiring: RealBrowserView/StudioView project scoping
- [x] 01-03-PLAN.md — Verification: two-project isolation checkpoint in dev app

### Phase 02: Accessibility & Zero-Hardcoded-Text Refactor (Completed)
Plans:
- [x] 02-01-PLAN.md — A11y & i18n infrastructure, en.json domain hierarchy, Modal hardening
- [x] 02-02-PLAN.md — Layout & Studio text extraction
- [x] 02-03-PLAN.md — Settings, Setup, Projects & Modals text extraction
- [x] 02-04-PLAN.md — AI, Editor, Reports & Guard tests

### Phase 03: Post-Audit Hardening (Completed)
Plans:
- [x] 03-01-PLAN.md — Security wave: Windows command injection mitigation, path.sep traversal fix, navigation jail
- [x] 03-02-PLAN.md — Core correctness wave: auto-save wiring, IPC listener dedupe, modal focus trap, run tokens
- [x] 03-03-PLAN.md — CI & A11y integrity wave: strict ESLint with --max-warnings 0, rebuilt guard test, typed translations

---

## Milestone 2.0 — Atomic UI/UX Perfection & Power Studio Workflows

### Phase 04: Command Palette & Global Keyboard Shortcuts

**Goal:** Build a spotlight-style command palette (`Ctrl+K` / `Ctrl+P`) and comprehensive global keyboard shortcuts for fast flow navigation and execution without touching the mouse.

**Requirements:** PALETTE-01, PALETTE-02, PALETTE-03

Plans:
- [x] 04-01-PLAN.md — Command Palette modal (`Ctrl+K` / `Ctrl+P`), action registry, search filtering, and keyboard navigation (`Up`/`Down`/`Enter`)
- [ ] 04-02-PLAN.md — Global shortcuts manager (`Ctrl+Enter` run, `Ctrl+Shift+P` pause, `Ctrl+1..9` project tabs, `Ctrl+Tab` flow tabs, `Ctrl+S` save) and Shortcuts Cheatsheet modal

---

### Phase 05: Studio Layout Versatility & Device Viewports

**Goal:** Give users flexible workspace layouts (horizontal/vertical split toggle) and realistic device bezel mockup frames (iPhone, iPad, Desktop) with color-scheme emulation.

**Requirements:** LAYOUT-01, LAYOUT-02, LAYOUT-03

Plans:
- [ ] 05-01-PLAN.md — Horizontal vs. vertical studio layout split orientation with persistent divider state and keyboard resizing
- [ ] 05-02-PLAN.md — Realistic device bezel frames with portrait/landscape orientation flip and scale-to-fit mode
- [ ] 05-03-PLAN.md — Dark/Light color scheme emulation toggle for the embedded webview browser

---

### Phase 06: Editor Polish, YAML Diffing & Playwright TS Exporter

**Goal:** Elevate authoring productivity with side-by-side YAML diffing against baseline/last-run, multi-step selection/duplication in the visual builder, and one-click Playwright TypeScript code export.

**Requirements:** EDIT-01, EDIT-02, EDIT-03

Plans:
- [ ] 06-01-PLAN.md — Visual side-by-side YAML diff viewer comparing active flow against previous snapshot or saved baseline
- [ ] 06-02-PLAN.md — Visual step editor enhancements: multi-step selection, step duplication (`Alt+Drag` / `Ctrl+D`), and smooth drag handles
- [ ] 06-03-PLAN.md — One-click "Export as Playwright TypeScript" code generator (`.spec.ts`) with clipboard copy and file download

---

### Phase 07: AI Copilot QA Recipes & Diff Preview

**Goal:** Provide one-click QA recipe prompt presets, side-by-side visual diff preview before applying AI-generated flows, and real-time generation speed telemetry.

**Requirements:** AI-01, AI-02, AI-03

Plans:
- [ ] 07-01-PLAN.md — QA Recipe prompt preset library (form validation, responsive nav, accessibility audit, edge-case auth, checkout flows)
- [ ] 07-02-PLAN.md — Side-by-side visual diff preview modal before applying AI-generated YAML steps (Replace vs. Append vs. Discard)
- [ ] 07-03-PLAN.md — Live generation speed metrics (tokens/sec, total tokens, provider latency indicator)

---

### Phase 08: Interactive HTML Reports & Latency Flamechart

**Goal:** Enable sharing standalone single-file HTML execution reports with embedded screenshots and an interactive step execution latency flamechart.

**Requirements:** REPORT-01, REPORT-02

Plans:
- [ ] 08-01-PLAN.md — Standalone zero-dependency HTML test report exporter with embedded CSS, base64 failure screenshots, and step timeline
- [ ] 08-02-PLAN.md — Execution latency waterfall flamechart inspector highlighting step bottlenecks and slow selector warnings



