# Agent roster expansion (Phase 2 of the agent/BYOK refactor) — COMPLETE

> Status: Completed and verified on 2026-08-15. All 5 steps implemented, 177 tests passing, build and lint clean.

## Context

Phase 1 is done and green (lint / 158 tests / vite build): declarative agent registry (`src/lib/aiRegistry.ts`), safeStorage-encrypted BYOK config (`electron/ipc/aiConfig.ts`), real CLI detection + subprocess execution (`electron/ipc/cliRunner.ts`), unified registry-driven UI (`AgentSelector`, `aiConfigStore`). It shipped with only 2 CLIs (claude-code, gemini-cli) and 5 BYOK providers.

Phase 2 scope (COMPLETE): **+6 local CLIs** (cursor-agent, opencode, pi, qwen, codex, copilot → 8 total), **+2 BYOK providers** (byok-grok; byok-cursor with a real async Cursor API provider), expand byok-openai (GPT models). Kimi excluded (JSON-RPC/ACP protocol the stdin runner can't drive). Grok CLI deferred (needs prompt-via-file + OAuth-only auth; Grok covered via BYOK).

Because detection/UI/execution are registry-driven, **no UI or IPC-contract changes were needed** — new agents appear automatically in detection, the selector, settings, and the copilot.

## Completed Work

✅ **1. Registry (`src/lib/aiRegistry.ts`)** — 15 canonical definitions (8 local-cli + 7 cloud-api), `claude-code` configured for stdin transport (`buildArgs: ['-p', '--output-format', 'text', ...]`), `gemini-cli`/`pi`/`qwen` configured with `promptViaArgv: true`, new aliases mapped.

✅ **2. CLI Runner (`electron/ipc/cliRunner.ts`)** — Exported `resolveBinary(def)` resolving `cliBinary` and `altBinaries`. Updated `detectCliAgents` and `runCliAgent`. Implemented `promptViaArgv` branching (args vs. stdin).

✅ **3. Provider Factory (`electron/ipc/aiProvider.ts`)** — Protocol-driven `createProvider` mapping `google`, `openai`, `anthropic`, `openai-compat`, and `cursor`. Implemented `createCursorApiProvider` with async task lifecycle (`POST /v1/agents/tasks` -> `POST /v1/agents/tasks/{id}/complete` -> poll status with 5m timeout -> fetch messages) and secret redaction. Added `createCursorProviderWithStreaming`.

✅ **4. Connection Test (`electron/ipc/aiConfig.ts`)** — Added `case 'cursor'` for Cursor API credential testing (GET `/v1/agents/tasks` with Bearer auth). `byok-grok` handled via standard `openai` case.

✅ **5. Tests (`src/lib/aiRegistry.test.ts`, `electron/aiProvider.test.ts`)** — Full registry invariants, count checks (15/8/7), argv vs. stdin flags, and end-to-end mocked fetch flow for `byok-cursor`. All 177 tests passing.

## Verification Results

- `pnpm lint` — passed (0 errors)
- `pnpm test` — passed (177 tests across 12 test files)
- `pnpm exec vite build` — passed (client, electron main, and preload bundles all clean)

## Settled questions

1. cursor-agent: yes — `['--print','--output-format','text', …--model]` with prompt via stdin; no extra `-p` argv.
2. claude-code: NO argv switch — stays stdin (see revert above).

## Researched CLI invocation facts (source: official docs + open-design defs, Aug 2026)

| id | binary (alts) | one-shot args (sans prompt) | prompt | auth env |
|---|---|---|---|---|
| claude-code | `claude` | `-p --output-format text [--model X]` | stdin | ANTHROPIC_API_KEY |
| gemini-cli | `gemini` | `-p <prompt> [--model X]` | argv | GEMINI_API_KEY |
| cursor-agent | `cursor-agent` (`agent`) | `--print --output-format text [--model X]` | stdin | CURSOR_API_KEY / CURSOR_AUTH_TOKEN |
| opencode | `opencode` | `run [--model provider/model]` | stdin | provider keys (ANTHROPIC_API_KEY / OPENAI_API_KEY) |
| pi | `pi` | `-p <prompt>` | argv (stdin = RPC mode!) | provider keys |
| qwen | `qwen` | `-p <prompt> [--model X]` | argv | DASHSCOPE_API_KEY / OPENAI_API_KEY |
| codex | `codex` | `exec [--model X]` | stdin | OPENAI_API_KEY |
| copilot | `copilot` | `--allow-all-tools [--model X]` (never `-p`) | stdin | `gh auth login` session |

## Constraints (must honor)

- pnpm; `pnpm lint` (eslint + tsc) and `pnpm test` must pass; `unused-imports/no-unused-imports` is an ESLint error.
- electron/*.ts is NOT typechecked by tsc (tsconfig includes only src/**); its gates are eslint + `pnpm exec vite build`.
- Electron main imports of the registry must be relative (`../../src/lib/aiRegistry`).
- No new npm deps. No commits unless the user asks. Do not touch `DISABLE_HMR` logic or preload whitelists.

## Verification

- `pnpm lint` + `pnpm test` + `pnpm exec vite build` all green.
- Desktop E2E (`pnpm dev`): Settings → AI Agents shows **8 CLI cards** (installed ones detected with version; rest "Not Installed") and **7 BYOK cards**. Enter an `XAI_API_KEY` → Test Connection green. Generate a flow via a detected CLI (e.g. codex/opencode) and via `byok-cursor` with a Cursor API key (expect async status chunks). Restart → selection/keys persist.
- Web mode (`pnpm dev:web`): new cards render (CLIs as Not Installed), session-only keys, no crashes.

## Risks

- Windows argv limit (~32KB; cmd.exe ~8KB) for pi/qwen/gemini-cli prompts — accepted for v1; stdin-capable CLIs unaffected.
- Cursor binary naming drift (`cursor-agent` vs `agent`) — covered by `altBinaries`.
- Cursor API latency — async run+poll capped at 5 min; status chunks keep the UI honest.
- copilot requires prior `gh auth login`; pi/qwen/opencode need provider keys or their own login — failures surface as redacted stderr in the copilot error banner.
- CLI flags drift fast; detection is tolerant (version-probe failures don't block listing).
