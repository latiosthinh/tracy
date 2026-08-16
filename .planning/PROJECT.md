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

## Current Milestone: v2.0 — Atomic UI/UX Perfection & Power Studio Workflows

**Goal:** Transform ProQA into an ultra-fast, keyboard-driven, versatile E2E automation studio with command palettes, responsive device framing, visual diffing, AI recipe presets, and interactive HTML report exports.

**Target features:**
- Command Palette (`Ctrl+K` / `Ctrl+P`) and global keyboard shortcut maps
- Studio split orientation toggles (horizontal/vertical) & realistic device bezel frames
- YAML side-by-side diffing, step duplication, and one-click Playwright TypeScript export
- AI Copilot QA Recipe prompt library & diff preview before applying generated steps
- Self-contained interactive single-file HTML reports & execution latency flamechart

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

