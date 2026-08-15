# QWEN.md

Guidance for AI agents working in this repository.

## Project Overview

**Tracy** (`tracy-automation-studio`) is a desktop IDE for end-to-end browser testing. Users author test flows as YAML (or visually), run them against a live embedded Chromium via Playwright, and generate/refine steps with AI assistance.

**Stack:** Electron 43 · React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS 4 · Zustand · Playwright-core · `@google/genai` + `dom-miner`. Package manager: **pnpm**.

## Commands

| Task | Command |
| --- | --- |
| Dev (Vite + Electron) | `pnpm dev` |
| Type check | `pnpm typecheck` (= `tsc --noEmit`) |
| Lint | `pnpm lint` (= `eslint . && tsc --noEmit`) |
| Test | `pnpm test` (Vitest, single run) |
| Test (watch) | `pnpm test:watch` |
| Full build | `pnpm build` (= `tsc && vite build && electron-builder`) |
| Clean artifacts | `pnpm clean` (removes `dist`, `dist-electron`, `release`) |

Run `pnpm lint` and `pnpm test` before considering any change done. `unused-imports/no-unused-imports` is an ESLint **error** and will fail CI; `@typescript-eslint/no-explicit-any` is a warning.

## Architecture

Dual-process Electron app. See `docs/ARCHITECTURE.md`, `docs/FLOW_SCHEMA.md`, and `docs/DOM_MINER.md` for deep dives.

### Electron main process (`electron/`)

- `main.ts` — entry point, window management.
- `preload.ts` — secure IPC bridge exposing `window.tracyAPI`. Contains channel whitelists (`ALLOWED_INVOKE_CHANNELS` / `ALLOWED_ON_CHANNELS`).
- `ipc/` — backend handlers: `playwrightEngine.ts` (executes YAML flows, streams logs/screenshots), `webviewManager.ts` (embedded webview sessions, element inspection), `fileSystem.ts` (project files, YAML serialization), `aiProvider.ts` (multi-provider AI abstraction layer).

### React renderer (`src/`)

- `lib/ipc.ts` — type-safe client wrapping `window.tracyAPI`. Every method guards with `isElectronEnv()` and returns safe defaults (empty array / string / null) so the renderer also runs browser-only via plain Vite.
- `stores/` — Zustand stores: `projectStore` (projects, active flows, auto-save), `executionStore` (runner status, timeline, logs), `domSnapshotStore` (`dom-miner` syntax trees), `uiStore`, `settingsStore`, `agentStore`.
- `components/` — `studio/` (StudioView, RealBrowserView, timelines, inspector), `editor/` (YAML text editor + `VisualStepEditor`), `ai/` (AI Copilot), `reports/`.
- `a11y/` — accessibility translation dictionary; accessibility (screen readers, tab navigation, tooltips) is a first-class requirement.

### AI / DOM miner layer

Page DOM is captured and compressed via `dom-miner` (`src/utils/domMiner.ts`) into a token-optimized syntax tree, then fed with natural-language prompts to the AI layer to synthesize YAML steps conforming to `docs/FLOW_SCHEMA.md`.

## YAML Flow Schema

Test flows are YAML: comment-based title line, optional `url:` frontmatter, list of steps. Actions: `navigate`, `leftClick`, `rightClick`, `hover`, `scroll`, `tap`, `twoFingersTap`, `press`, `fill`, `waitFor`. Step attributes: `selector` (CSS/XPath), `text`, `key`, `timeout`. Full spec in `docs/FLOW_SCHEMA.md`.

## Key Conventions

- **Path alias:** `@/*` resolves to the repo root (tsconfig + Vite + Vitest). Use `@/src/...` for renderer imports.
- **IPC contract:** any new channel must be added in BOTH `electron/preload.ts` whitelists AND the `tracyApi` wrapper in `src/lib/ipc.ts`.
- **Main-process externals:** Node-only packages must be added to `MAIN_PROCESS_EXTERNALS` in `vite.config.ts` (regex list covering `playwright-core`, `chromium-bidi`, `playwright`, `js-yaml`, `@google/genai`; applied to both `rolldownOptions` and `rollupOptions`).
- **Tailwind v4:** CSS-first theming via `@tailwindcss/vite`; there is no `tailwind.config.js`.
- **HMR toggle:** `DISABLE_HMR=true` disables Vite HMR + file watching (used during agent edits to prevent flickering). Do not remove this logic from `vite.config.ts`.
- **Tests:** Vitest + Testing Library, `jsdom` environment, globals enabled, setup in `src/test/setup.ts`. Test files are colocated as `*.test.ts(x)` next to their source (patterns: `src/**/*.test.{ts,tsx}`, `electron/**/*.test.ts`).

## Security Constraints (Electron)

`BrowserWindow` runs with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. All privileged operations go through the preload IPC bridge — never enable `nodeIntegration` or disable `contextIsolation` to work around this.
