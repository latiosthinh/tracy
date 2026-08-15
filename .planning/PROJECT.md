# Project: Tracy

**Code:** TRACY
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

## Key Constraints

- IPC contract: any new/changed channel must exist in `electron/preload.ts` whitelists
  AND the `tracyApi` wrapper in `src/lib/ipc.ts`
- Node-only packages must be in `MAIN_PROCESS_EXTERNALS` (`vite.config.ts`)
- `electron/*.ts` is NOT typechecked by tsc; gates are eslint + `pnpm exec vite build`
- `unused-imports/no-unused-imports` is an ESLint error
- Finish gates for every change: `pnpm lint` and `pnpm test` green
