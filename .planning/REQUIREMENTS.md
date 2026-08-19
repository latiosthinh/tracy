# Requirements: Milestone v5.0 (Performance Profiling, Route Mocking & Multi-Browser Matrix)

## Overview

Milestone v5.0 expands Tracy's test orchestration and verification capabilities with declarative network route mocking & HAR replay, multi-browser parallel matrix execution (Chromium, Firefox, WebKit), synthetic Core Web Vitals telemetry with performance budget assertions, and dedicated Studio diagnostic panels.

## Requirements

### Declarative Network Route Mocking & HAR Replay (MOCK)

- [ ] **MOCK-01**: Declarative YAML route mocking supporting exact, glob, and regex URL patterns with HTTP method filtering (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).
- [ ] **MOCK-02**: Mock response fulfillment with custom HTTP status codes, headers, and inline JSON/text bodies or external fixture file paths.
- [ ] **MOCK-03**: Network fault injection and synthetic latency supporting configurable delay (`delayMs`) and route abort errors (`failed`, `timedout`, `connectionrefused`, `accessdenied`).
- [ ] **MOCK-04**: Declarative HAR recording and replay via `routeFromHAR` with fallback handling and dynamic parameter matching.
- [ ] **MOCK-05**: Clean mock lifecycle isolation at `BrowserContext` level preventing route handler leakage across test flows and steps.

### Multi-Browser Matrix Execution & Worker Pool (GRID)

- [ ] **GRID-01**: Cross-browser execution support across Chromium, Firefox, and WebKit Playwright engine binaries in CLI and Studio.
- [ ] **GRID-02**: Isolated parallel worker pool managing concurrent browser instances with configurable worker count (`--workers=N`) and CPU concurrency throttling.
- [ ] **GRID-03**: Browser-conditional step execution supporting declarative filters (`when: { browser: "webkit" }` or `skip_if: { browser: "firefox" }`).
- [ ] **GRID-04**: Aggregated multi-browser test reporter producing unified matrix terminal output, JUnit XML matrix testsuites, and JSON summary logs.
- [ ] **GRID-05**: Robust engine error handling and lifecycle cleanup preventing worker crashes, zombie browser processes, and port exhaustion.

### Core Web Vitals & Performance Assertion Engine (PERF)

- [ ] **PERF-01**: Universal Core Web Vitals telemetry collector injected via `page.addInitScript()` capturing LCP, CLS, INP, FCP, and TTFB across all supported browsers.
- [ ] **PERF-02**: Declarative YAML performance assertion step (`assert_performance`) evaluating latency, layout stability, and interaction metrics against configurable thresholds.
- [ ] **PERF-03**: Graceful cross-browser metric fallback degrading to W3C Navigation and Resource Timing API when advanced CDP metrics are unavailable (WebKit/Firefox).
- [ ] **PERF-04**: Synthetic network and CPU throttling condition presets (`slow3g`, `fast3g`, `offline`, CPU slowdown rate) for deterministic load benchmarking.

### Studio Network, Matrix Grid & Profiler Panels (UI)

- [ ] **UI-01**: Studio Network Mocking inspector and rule editor for configuring, toggling, and inspecting route interception rules in real-time.
- [ ] **UI-02**: Interactive Multi-Browser Matrix execution panel displaying live parallel worker status, per-browser step progress, and pass/fail badges.
- [ ] **UI-03**: Real-time Core Web Vitals scorecard and performance gauge dashboard displaying visual threshold indicators (good/needs improvement/poor).
- [ ] **UI-04**: Batched IPC state synchronization in React 19 Zustand stores preventing UI thread stutter and frame drops during high-frequency telemetry events.

## Out of Scope

- **External MITM Proxy Daemons**: No Charles/mitmproxy setups; all interception uses native Playwright route handlers and CDP sessions.
- **Out-of-Process Mock Servers**: No Express/MSW daemon processes; route mocking is managed entirely in-process per BrowserContext.
- **Cloud Grid Management / Infrastructure**: No Kubernetes or remote grid provisioning; execution targets local driver binaries with optional CDP endpoint connection.
- **Full Synthetic 30s Lighthouse Audits**: Lightweight real-time PerformanceObserver extraction is used instead of heavy, flaky multi-second Lighthouse audits.
- **Cross-Engine Visual Screenshot Pixel Diffing**: Deferred to subsequent visual regression milestone.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOCK-01 | Phase 20 | Pending |
| MOCK-02 | Phase 20 | Pending |
| MOCK-03 | Phase 20 | Pending |
| MOCK-04 | Phase 20 | Pending |
| MOCK-05 | Phase 20 | Pending |
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
