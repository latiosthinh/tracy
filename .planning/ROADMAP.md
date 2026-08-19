# Roadmap: ProQA

## Milestones

- ✅ **v1.0 Project-Isolated Studio & Hardening** — Phases 1-3 (shipped 2026-08-15)
- ✅ **v2.0 Atomic UI/UX Perfection & Power Studio Workflows** — Phases 4-8 (shipped 2026-08-16)
- ✅ **v3.0 AI Flow Gen V2 & Dynamic Agent Skills** — Phases 9-14 (shipped 2026-08-19)
- ✅ **v4.0 Autonomous Multi-Flow Agent & Self-Healing CI** — Phases 15-19 (shipped 2026-08-19)
- 📋 **v5.0 Performance Profiling, Route Mocking & Multi-Browser Matrix** — Phases 20-23 (in progress)

## Phases

<details>
<summary>✅ v1.0 Project-Isolated Studio & Hardening (Phases 1-3) — SHIPPED 2026-08-15</summary>

- [x] Phase 01: Per-Project Embedded Browser (3/3 plans) — completed 2026-08-15
- [x] Phase 02: Accessibility & Zero-Hardcoded-Text Refactor (4/4 plans) — completed 2026-08-15
- [x] Phase 03: Post-Audit Hardening (3/3 plans) — completed 2026-08-15

</details>

<details>
<summary>✅ v2.0 Atomic UI/UX Perfection & Power Studio Workflows (Phases 4-8) — SHIPPED 2026-08-16</summary>

- [x] Phase 04: Command Palette & Global Keyboard Shortcuts (2/2 plans) — completed 2026-08-16
- [x] Phase 05: Studio Layout Versatility & Device Viewports (3/3 plans) — completed 2026-08-16
- [x] Phase 06: Editor Polish, YAML Diffing & Playwright TS Exporter (3/3 plans) — completed 2026-08-16
- [x] Phase 07: AI Copilot QA Recipes & Diff Preview (3/3 plans) — completed 2026-08-16
- [x] Phase 08: Interactive HTML Reports & Latency Flamechart (2/2 plans) — completed 2026-08-16

</details>

<details>
<summary>✅ v3.0 AI Flow Gen V2 & Dynamic Agent Skills (Phases 9-14) — SHIPPED 2026-08-19</summary>

- [x] Phase 09: Declarative Agent Skills Runtime & Registry (2/2 plans) — completed 2026-08-19
- [x] Phase 10: Live DOM Selector Pre-Validation Engine (2/2 plans) — completed 2026-08-19
- [x] Phase 11: Multi-Provider Tool Calling & Self-Healing Loop (2/2 plans) — completed 2026-08-19
- [x] Phase 12: Built-in QA Domain Skills Catalog (1/1 plan) — completed 2026-08-19
- [x] Phase 13: Copilot Skill Selector & Trace Inspector UI (2/2 plans) — completed 2026-08-19
- [x] Phase 14: Flow Accuracy Benchmark & Evaluation Suite (2/2 plans) — completed 2026-08-19

</details>

<details>
<summary>✅ v4.0 Autonomous Multi-Flow Agent & Self-Healing CI (Phases 15-19) — SHIPPED 2026-08-19</summary>

- [x] Phase 15: Heuristic & AI Self-Healing Execution Core (2/2 plans) — completed 2026-08-19
- [x] Phase 16: Comment-Preserving YAML AST Auto-Patcher & Artifacts (2/2 plans) — completed 2026-08-19
- [x] Phase 17: Headless CI CLI Binary & Reporting Pipeline (2/2 plans) — completed 2026-08-19
- [x] Phase 18: Autonomous Route & Interaction Crawler (2/2 plans) — completed 2026-08-19
- [x] Phase 19: Route Topology & Coverage Visualizer Studio (2/2 plans) — completed 2026-08-19

</details>

### Milestone v5.0

- [ ] **Phase 20: Declarative Network Route Mocking & HAR Replay Engine** - Intercept URL patterns, mock status/headers/body, inject latency or network aborts, and replay HAR fixtures.
- [ ] **Phase 21: Multi-Browser Matrix Execution & Worker Pool** - Parallel execution across Chromium, Firefox, and WebKit with worker concurrency throttling and browser-conditional steps.
- [ ] **Phase 22: Core Web Vitals & Performance Assertion Engine** - Universal telemetry extraction (LCP, CLS, INP, FCP, TTFB), declarative performance assertions, and throttling presets.
- [ ] **Phase 23: Studio Network, Matrix Grid & Profiler Panels** - Studio route mocking inspector, live multi-browser matrix dashboard, Core Web Vitals scorecards, and batched Zustand state stores.

## Phase Details

### Phase 20: Declarative Network Route Mocking & HAR Replay Engine
**Goal**: Test flows can deterministically intercept network requests, provide mocked responses or fixtures, simulate latency/aborts, and replay HAR archives without test leakage
**Depends on**: Phase 19
**Requirements**: MOCK-01, MOCK-02, MOCK-03, MOCK-04, MOCK-05
**Success Criteria** (what must be TRUE):
  1. User can define declarative route interception rules in YAML matching exact, glob, or regex URLs with specific HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`)
  2. Test runner delivers custom HTTP status codes, headers, and inline or fixture-based response payloads to the browser without contacting real external backends
  3. Test runner simulates network faults (aborts with `failed`, `timedout`, `connectionrefused`, `accessdenied`) and synthetic delays (`delayMs`) to test error handling and loading states
  4. Test runner records and replays traffic via HAR archives using `routeFromHAR` with fallback handling
  5. Route handlers and mocks attach at `BrowserContext` level and clean up completely on flow completion with zero mock leakage between test runs
**Plans**: 2 plans
Plans:
- [ ] 20-01-PLAN.md — Define declarative route mocking & HAR schema types, build NetworkMockManager core engine with Playwright context interception, delay/abort simulation, HAR replay, and teardown
- [ ] 20-02-PLAN.md — Integrate NetworkMockManager into Electron Playwright engine and Headless CI runner with step actions, assertRequest validation, and context lifecycle cleanup

- [ ] 21-01-PLAN.md — Multi-Browser Matrix Schema & Worker Pool Core (completed)
- [ ] 21-02-PLAN.md — Matrix Orchestrator & CLI / Studio Integration
**Plans**: 2 plans
Plans:
- [ ] 21-01-PLAN.md — Define multi-browser matrix types, step conditionals, and build MatrixWorkerPool with concurrency limits and process cleanup guards
- [ ] 21-02-PLAN.md — Integrate matrix execution into CLI parser, headless runner loop, matrix JUnit XML & console reporters, and Electron Playwright engine

### Phase 22: Core Web Vitals & Performance Assertion Engine
**Goal**: Automated test flows extract synthetic Core Web Vitals and enforce performance regression budgets with cross-browser degradation support
**Depends on**: Phase 21
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Synthetic Core Web Vitals (LCP, CLS, INP, FCP, TTFB) are collected automatically during flow execution via an injected script observer
  2. YAML test flows can assert performance thresholds using `assert_performance` (e.g. `lcp: "< 2500ms"`, `cls: "< 0.1"`) failing or warning when budgets are exceeded
  3. Test runs on WebKit and Firefox gracefully degrade to standard W3C Navigation/Resource Timing metrics without throwing CDP compatibility errors
  4. Test flows can apply synthetic network and CPU throttling presets (`slow3g`, `fast3g`, `offline`, CPU rate) to benchmark user performance under degraded conditions
**Plans**: TBD

### Phase 23: Studio Network, Matrix Grid & Profiler Panels
**Goal**: Studio users can visually inspect network mock rules, monitor live multi-browser matrix runs, and view real-time Core Web Vitals scorecards
**Depends on**: Phase 22
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Studio provides an interactive Network Mocking inspector and rule editor to toggle and test route interception rules in real-time
  2. Multi-Browser Matrix panel displays real-time execution progress, active worker allocation, and per-browser pass/fail matrices in Studio UI
  3. Core Web Vitals scorecard renders real-time performance gauges with standard green/amber/red threshold ratings for monitored journeys
  4. React 19 Zustand stores batch incoming high-frequency telemetry events from Electron IPC preserving smooth 60fps UI responsiveness
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|---|---|---|---|---|
| 01. Per-Project Browser | v1.0 | 3/3 | Complete | 2026-08-15 |
| 02. A11y & i18n Extraction | v1.0 | 4/4 | Complete | 2026-08-15 |
| 03. Hardening | v1.0 | 3/3 | Complete | 2026-08-15 |
| 04. Command Palette | v2.0 | 2/2 | Complete | 2026-08-16 |
| 05. Studio Layout & Bezels | v2.0 | 3/3 | Complete | 2026-08-16 |
| 06. YAML Diff & TS Exporter | v2.0 | 3/3 | Complete | 2026-08-16 |
| 07. AI Recipes & Diff Preview | v2.0 | 3/3 | Complete | 2026-08-16 |
| 08. HTML Reports & Flamechart | v2.0 | 2/2 | Complete | 2026-08-16 |
| 09. Skills Runtime & Registry | v3.0 | 2/2 | Complete | 2026-08-19 |
| 10. DOM Selector Pre-Validation | v3.0 | 2/2 | Complete | 2026-08-19 |
| 11. Tool Calling & Self-Healing | v3.0 | 2/2 | Complete | 2026-08-19 |
| 12. QA Domain Skills Catalog | v3.0 | 1/1 | Complete | 2026-08-19 |
| 13. Copilot Skill & Trace UI | v3.0 | 2/2 | Complete | 2026-08-19 |
| 14. Flow Accuracy Benchmarks | v3.0 | 2/2 | Complete | 2026-08-19 |
| 15. Heuristic & AI Self-Healing Core | v4.0 | 2/2 | Complete | 2026-08-19 |
| 16. Comment-Preserving YAML Patcher | v4.0 | 2/2 | Complete | 2026-08-19 |
| 17. Headless CI CLI Binary | v4.0 | 2/2 | Complete | 2026-08-19 |
| 18. Autonomous Route & Interaction Crawler | v4.0 | 2/2 | Complete | 2026-08-19 |
| 19. Route Topology & Coverage Visualizer | v4.0 | 2/2 | Complete | 2026-08-19 |
| 20. Declarative Network Route Mocking & HAR Engine | v5.0 | 0/0 | Not started | - |
| 21. Multi-Browser Matrix Execution & Worker Pool | v5.0 | 0/0 | Not started | - |
| 22. Core Web Vitals & Performance Assertion Engine | v5.0 | 0/0 | Not started | - |
| 23. Studio Network, Matrix Grid & Profiler Panels | v5.0 | 0/0 | Not started | - |
