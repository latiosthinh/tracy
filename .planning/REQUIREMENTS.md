# Requirements: Milestone v4.0 (Autonomous Multi-Flow Agent & Self-Healing CI)

## Overview

Milestone v4.0 equips Tracy with autonomous test generation across complete web applications and self-healing test execution capabilities in local and CI environments.

## Requirements

### Self-Healing Test Runner & Auto-Repair (HEAL)

- [ ] **HEAL-01**: Playwright execution loop intercepts step locator timeouts and triggers heuristic DOM fallback ranking before failing.
- [ ] **HEAL-02**: GenAI fallback locator synthesizer is invoked if local heuristic matching confidence is below threshold (< 0.75).
- [ ] **HEAL-03**: Semantic role and action verb invariants prevent healing into contrary actions (e.g. Save -> Cancel) or mutating assertion expectations.
- [ ] **HEAL-04**: In-place YAML AST patcher updates selector values in disk files preserving all comments, indentation, and structure using `yaml` AST (`doc.setIn()`).
- [ ] **HEAL-05**: Step execution reports display heal badges with previous selector, replacement selector, heal confidence score, and diff preview.

### Headless CI Runner & Reporting (CI)

- [ ] **CI-01**: Standalone CLI entry point (`tracy run [path] [flags]`) executes YAML flows without Electron GUI dependencies.
- [ ] **CI-02**: CLI supports `--ci`, `--heal`, `--timeout`, `--reporter`, and `--output` options via native `node:util.parseArgs`.
- [ ] **CI-03**: Built-in JUnit XML reporter generates CI-compatible test results schema with step timings and failure details.
- [ ] **CI-04**: Headless runner captures failure screenshots, traces, and DOM snapshot artifacts into configurable output directory.
- [ ] **CI-05**: Self-healing in CI mode produces standard `.patch` file or auto-commits repaired YAML files with clear summary logs.

### Autonomous Sitemap & Journey Crawler (CRAWL)

- [ ] **CRAWL-01**: Graph-based BFS crawler explores internal routes starting from target URL within origin boundaries.
- [ ] **CRAWL-02**: Structural DOM skeleton hashing identifies unique SPA dynamic views and detects cyclic states.
- [ ] **CRAWL-03**: Destructive action safety filter blocks dangerous keywords (`/logout|delete|remove|destroy|signout/i`) from autonomous invocation.
- [ ] **CRAWL-04**: Interactive form explorer fills forms using contextual safe synthetic mock inputs.
- [ ] **CRAWL-05**: Auto-flow generator compiles discovered journey paths into executable, lint-compliant YAML test suites.

### Journey & Coverage Visualizer UI (VIS)

- [ ] **VIS-01**: Interactive `@xyflow/react` canvas displays discovered routes, pages, and interconnecting actions as graph nodes and edges.
- [ ] **VIS-02**: Graph nodes indicate test coverage status (covered by existing flow, partially tested, unvisited).
- [ ] **VIS-03**: Clicking a route or edge allows one-click generation or execution of linked YAML flows directly in Studio.
- [ ] **VIS-04**: Live crawl progress overlay streams newly discovered nodes, active crawler worker position, and queue count.

## Out of Scope

- **Cloud / SaaS dashboard sync**: All reports, graphs, and artifacts remain 100% local or exported to standard files.
- **Unconstrained LLM vision fuzzing**: Visual pixel-level monkey testing without selector grounding is avoided to eliminate cost and non-deterministic flakiness.
- **Modifying custom application backend data**: Synthetic inputs only target client-side forms without destructive backend mutations.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HEAL-01 | Phase 15 | Pending |
| HEAL-02 | Phase 15 | Pending |
| HEAL-03 | Phase 15 | Pending |
| HEAL-04 | Phase 16 | Pending |
| HEAL-05 | Phase 16 | Pending |
| CI-01 | Phase 17 | Pending |
| CI-02 | Phase 17 | Pending |
| CI-03 | Phase 17 | Pending |
| CI-04 | Phase 17 | Pending |
| CI-05 | Phase 17 | Pending |
| CRAWL-01 | Phase 18 | Pending |
| CRAWL-02 | Phase 18 | Pending |
| CRAWL-03 | Phase 18 | Pending |
| CRAWL-04 | Phase 18 | Pending |
| CRAWL-05 | Phase 18 | Pending |
| VIS-01 | Phase 19 | Pending |
| VIS-02 | Phase 19 | Pending |
| VIS-03 | Phase 19 | Pending |
| VIS-04 | Phase 19 | Pending |
