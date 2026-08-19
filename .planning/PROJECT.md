# Project: ProQA

**Code:** PROQA
**Type:** Desktop application (Electron)

## Vision

Desktop E2E browser testing IDE: record/author YAML test flows against a live embedded
browser, mine DOM for AI-assisted flow generation, run flows via embedded Playwright,
and inspect results. Dual-process Electron app (main = privileged engines, renderer =
React 19 studio UI).

## Stack

- Electron (dual-process; `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`)
- React 19 + Vite renderer, Zustand stores, Tailwind v4 (CSS-first, no config file)
- Playwright (embedded E2E engine), WebContentsView child webviews (embedded browser)
- Vitest + Testing Library (jsdom env, colocated `*.test.ts(x)`)
- pnpm; path alias `@/*` → repo root

## Current State

Shipped **Milestone v2.0** — Atomic UI/UX Perfection & Power Studio Workflows (2026-08-19).
- Total Phases: 8 (Phases 01-08 complete)
- Total Plans: 25 completed, 347 unit/integration tests passing green
- Full suite of Command Palette, Device Bezels, Side-by-side YAML Diffs, Playwright TS Exporter, AI Diff Preview, HTML Test Reports, and Latency Flamechart.

## Current Milestone: v4.0 Autonomous Multi-Flow Agent & Self-Healing CI

**Goal:** Autonomous multi-flow crawler discovering user journeys and self-healing broken Playwright test flows in CI/local runs.

**Target features:**
- Autonomous Sitemap & Journey Crawler: Graph-based route discovery, interactive elements extraction, and automated end-to-end YAML test suite generation.
- Self-Healing Test Runner & Auto-Repair: On-the-fly step failure diagnosis, live DOM re-probing, alternative selector calculation, and YAML flow auto-patching.
- Headless CI Runner & Self-Healing Action: CLI executable (`tracy run --ci --heal`) for headless environments, JUnit XML / trace artifact emission, and automated git patch / PR branch outputs.
- Journey & Coverage Visualizer UI: Interactive route graph in Studio, linking pages, discovered flows, and pass/fail/healed coverage status.

## Validated Milestones

- ✓ **v1.0 Project-Isolated Studio & Hardening** (Phases 01-03) — Shipped 2026-08-15
- ✓ **v2.0 Atomic UI/UX Perfection & Power Studio Workflows** (Phases 04-08) — Shipped 2026-08-19
- ✓ **v3.0 AI Flow Gen V2 & Dynamic Agent Skills** (Phases 09-14) — Shipped 2026-08-19

---
*Last updated: 2026-08-19 starting v4.0 milestone*

## Key Constraints

- IPC contract: any new/changed channel must exist in `electron/preload.ts` whitelists
  AND the `tracyApi` wrapper in `src/lib/ipc.ts`
- Node-only packages must be in `MAIN_PROCESS_EXTERNALS` (`vite.config.ts`)
- `electron/*.ts` is NOT typechecked by tsc; gates are eslint + `pnpm exec vite build`
- `unused-imports/no-unused-imports` is an ESLint error
- All user-facing strings must flow through `src/a11y/en.json` via `useTranslation()`
- Finish gates for every change: `pnpm lint` and `pnpm test` green

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

