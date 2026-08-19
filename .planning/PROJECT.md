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

Shipped **Milestone v5.0** — Performance, Mocking & Multi-Browser Grid (2026-08-19).
- Total Phases: 23 (Phases 01-23 complete)
- Total Plans: 54 completed, 666 unit/integration tests passing green
- Full suite of Declarative Route Mocking & HAR Replay, Multi-Browser Matrix Grid (`chromium`, `firefox`, `webkit`), Core Web Vitals Profiler, and Studio Network / Matrix Panels.

## Next Milestone Goals

- **Milestone v6.0: Visual Regression Testing & AI Flakiness Analyzer**
- Visual diffing with pixel & layout shift regression scoring
- Historical test run telemetry and automated AI flakiness diagnosis

## Validated Milestones

- ✓ **v1.0 Project-Isolated Studio & Hardening** (Phases 01-03) — Shipped 2026-08-15
- ✓ **v2.0 Atomic UI/UX Perfection & Power Studio Workflows** (Phases 04-08) — Shipped 2026-08-15
- ✓ **v3.0 AI Flow Gen V2 & Dynamic Agent Skills** (Phases 09-14) — Shipped 2026-08-19
- ✓ **v4.0 Autonomous Multi-Flow Agent & Self-Healing CI** (Phases 15-19) — Shipped 2026-08-19
- ✓ **v5.0 Performance, Mocking & Multi-Browser Grid** (Phases 20-23) — Shipped 2026-08-19

---
*Last updated: 2026-08-19 starting v5.0 milestone*

## Key Constraints

- IPC contract: any new/changed channel must exist in `electron/preload.ts` whitelists
  AND the `tracyApi` wrapper in `src/lib/ipc.ts`
- Node-only packages must be in `MAIN_PROCESS_EXTERNALS` (`vite.config.ts`)
- `electron/*.ts` is NOT typechecked by tsc; gates are eslint + `pnpm exec vite build`
- `unused-imports/no-unused-imports` is an ESLint error
- All user-facing strings must flow through `src/a11y/en.json` via `useTranslation()`
- Finish gates for every change: `pnpm lint` and `pnpm test` green
