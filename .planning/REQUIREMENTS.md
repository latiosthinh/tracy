# Requirements: Milestone v5.0 (Performance, Mocking & Multi-Browser Grid)

## Overview

Milestone v5.0 equips Tracy with declarative network and API request mocking, a multi-browser parallel execution matrix (Chromium, Firefox, WebKit), in-flight Core Web Vitals telemetry, and dedicated Studio diagnostic panels.

## Requirements

### Network & API Mocking Engine (MOCK)

- [x] **MOCK-01**: Flow YAML schema supports declarative `mockRoute` steps with URL patterns (glob/regex), status codes, synthetic JSON bodies, headers, and simulated delay.
- [x] **MOCK-02**: Flow YAML schema supports network fault injection (e.g. `action: abortRoute`, `action: delayRoute`, `error: "ConnectionReset"`).
- [x] **MOCK-03**: Playwright execution engine supports HAR recording and deterministic offline HAR replay via `routeFromHAR`.
- [x] **MOCK-04**: Flow steps can assert network request counts, payload contents, and query parameters via `assertRequest` action.
- [x] **MOCK-05**: Mock rules automatically scope to active test context and cleanly unregister without memory/handler leaks.

### Multi-Browser Matrix & Parallel Grid (GRID)

- [ ] **GRID-01**: Playwright execution engine supports launching flows against `chromium`, `firefox`, and `webkit` browser types.
- [ ] **GRID-02**: CLI (`tracy run`) and Studio support `--browsers chromium,firefox,webkit` matrix execution flag with worker concurrency throttling.
- [ ] **GRID-03**: Steps support browser-specific conditional execution (e.g. `when: { browser: "webkit" }`).
- [ ] **GRID-04**: Headless and Studio test runners output unified matrix reports displaying pass/fail/duration status per browser engine.
- [ ] **GRID-05**: Headless runner aggregates multi-browser results into consolidated JUnit XML matrix suites and artifact directories.

### Performance & Core Web Vitals Engine (PERF)

- [ ] **PERF-01**: Execution engine injects lightweight `web-vitals` observer to capture LCP, CLS, INP, FCP, and TTFB metrics.
- [ ] **PERF-02**: Chromium runs support CDP-based CPU throttling (e.g. 4x slowdown) and Network throttling presets (Fast 3G, Slow 3G, Offline).
- [ ] **PERF-03**: YAML flow schema supports `assertPerformance` step to validate metric thresholds (e.g. `lcp: <= 2500ms`, `cls: <= 0.1`).
- [ ] **PERF-04**: Test execution reports and artifacts include detailed performance telemetry graphs and metric breakdown tables.

### Studio Network & Matrix UI (UI)

- [ ] **UI-01**: Studio UI provides a dedicated Network Inspector tab showing live HTTP requests, status codes, timings, and active mock overrides.
- [ ] **UI-02**: Studio UI provides a Matrix Runner panel allowing one-click execution across selected browser engines with parallel progress cards.
- [ ] **UI-03**: Test Report and Studio views display interactive Core Web Vitals scorecards with color-coded good/needs-improvement/poor indicators.
- [ ] **UI-04**: All user-facing strings, tooltips, and accessibility labels mapped to `src/a11y/en.json`.

## Out of Scope

- **Cloud browser farm streaming**: Browser engines execute locally or on CI runners via Playwright binaries; external SaaS browser clouds are out of scope.
- **Full Chrome DevTools protocol emulation in Firefox/WebKit**: CDP network/CPU throttling is strictly gated to Chromium; Firefox and WebKit use W3C PerformanceObserver without CDP emulation.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOCK-01 | Phase 20 | Complete |
| MOCK-02 | Phase 20 | Complete |
| MOCK-03 | Phase 20 | Complete |
| MOCK-04 | Phase 20 | Complete |
| MOCK-05 | Phase 20 | Complete |
| GRID-01 | Phase 21 | Pending |
| GRID-02 | Phase 21 | Pending |
| GRID-03 | Phase 21 | Pending |
| GRID-04 | Phase 21 | Pending |
| GRID-05 | Phase 21 | Pending |
| PERF-01 | Phase 22 | Pending |
| PERF-02 | Phase 22 | Pending |
| PERF-03 | Phase 22 | Pending |
| PERF-04 | Phase 22 | Pending |
| UI-01 | Phase 23 | Pending |
| UI-02 | Phase 23 | Pending |
| UI-03 | Phase 23 | Pending |
| UI-04 | Phase 23 | Pending |
