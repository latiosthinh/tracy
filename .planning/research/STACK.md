# Technology Stack: Milestone v3.0 (AI Agent Skills & Flow Synthesis Accuracy)

**Project:** ProQA / Tracy Desktop
**Milestone:** v3.0 — AI Flow Gen V2 & Dynamic Agent Skills
**Researched:** 2026-08-19
**Confidence:** HIGH

---

## Executive Stack Summary

Milestone v3.0 expands ProQA from basic natural language prompt generation into an extensible **Agent Skills Runtime** with **live DOM pre-validation** and **accuracy benchmarking**.

Key architectural principle: **Minimize runtime bloat; leverage Electron dual-process model; enforce strong schema validation across IPC and agent boundaries.**

---

## Recommended Stack Additions

### 1. Schema Validation & Tool Definitions
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `zod` | `^3.24.2` / `^3.25.0` (or `^4.4.3`) | Declarative runtime schema definition for Agent Skills, tool parameters, skill manifest, and flow validation | Zero-dependency TypeScript schema declaration. Allows runtime validation across IPC and automatic conversion to JSON Schema for AI tool calling (`@google/genai`, OpenAI function calling, Anthropic tool use). Recommended: `zod` v3.24.x/3.25.x for broad ecosystem compatibility with LLM SDKs and `zod-to-json-schema`. |
| `zod-to-json-schema` | `^3.24.3` | Convert Zod schemas to JSON Schema Draft-07 / 2020-12 | Passes strongly-typed tool definitions to OpenAI, Gemini (`@google/genai`), Anthropic, and local CLI agents without manual duplicate schema authoring. |

### 2. DOM Selector Pre-Validation & Parsing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `playwright-core` / CDP (Already installed: `^1.62.1`) | `^1.62.1` | Live selector pre-flight evaluation against active page/WebContentsView | Zero new dependencies. Main process already holds `Page` and `BrowserContext`. Evaluates `page.locator(selector).count()`, `page.locator(selector).isVisible()`, and computes disambiguation scores directly via CDP. |
| `css-tree` (Optional dev/eval) | `^3.2.1` | Static CSS/XPath selector syntax validation & linting (fast client-side check) | Validates CSS syntax validity before sending to Playwright or AI repair loop, preventing invalid selector syntax crashes. Zero heavy deps. |

### 3. Evaluation & Accuracy Benchmarking
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `fast-levenshtein` | `^3.0.0` | Step-sequence edit distance & string similarity metrics | Fast, tiny (single file) Levenshtein distance calculator for comparing generated YAML step sequences vs ground-truth baseline flows. |
| Vitest (Already installed: `^4.1.10`) | `^4.1.10` | Benchmark test runner & CI assertion suite | Existing test runner. Colocated accuracy suites (`src/eval/**/*.bench.ts` or `src/eval/**/*.test.ts`) run headless benchmarks with deterministic scoring (Locator Precision, Step Recall, Execution Pass Rate). |

---

## Supporting Architecture & Integration Points

### Main vs Renderer Process Division

```
┌─────────────────────────────────────────────────────────────┐
│ React 19 Renderer (src/)                                    │
│ - Skill Store (Zustand): active skills, skill toggles       │
│ - Visual Skill Selector & Execution Trace Inspector         │
│ - Client-side Flow YAML Schema validation (Zod)             │
│ - Benchmark Results Viewer & Accuracy Scorecards            │
└──────────────────────────────┬──────────────────────────────┘
                               │ IPC (`window.tracyAPI`)
                               │ Whitelisted Channels
┌──────────────────────────────▼──────────────────────────────┐
│ Electron Main Process (electron/)                           │
│ - Skill Registry (`SkillEngine`): registers tools & prompts │
│ - Tool Execution Sandbox: runs skill actions (DOM, FS, API) │
│ - DOM Selector Pre-Validator: `page.locator()` count/check  │
│ - Multi-Provider Agent Calling: passes tools to LLM/CLI     │
│ - Benchmark Runner: orchestrates ground-truth flow runs     │
└─────────────────────────────────────────────────────────────┘
```

### IPC Channel Whitelist Additions
Must be registered in `electron/preload.ts` (`ALLOWED_INVOKE_CHANNELS` / `ALLOWED_ON_CHANNELS`) and `src/lib/ipc.ts`:
- `list_agent_skills`: Returns available declarative QA skills.
- `execute_skill_tool`: Runs a registered skill tool in main process.
- `validate_selectors`: Takes list of candidate selectors, tests against current page via Playwright, returns match count, visibility, and uniqueness score.
- `run_accuracy_benchmark`: Executes benchmark dataset against specified agent/skill configuration and streams evaluation metrics.
- `stream_benchmark_progress`: Event channel for live benchmark pass/fail updates.

---

## What NOT to Add (Anti-Stack Decisions)

| Technology | Why Rejected | Alternative |
|------------|--------------|-------------|
| LangChain / LangGraph / LlamaIndex | Heavyweight runtime (>50MB node_modules), bloated abstractions, fragile breaking changes, incompatible with Electron bundling requirements | Lightweight native TypeScript agent loop in `electron/ipc/aiProvider.ts` + `zod` schemas. |
| JSDOM for selector validation | Inaccurate rendering engine, does not evaluate actual WebKit/Blink layout, computed styles, or shadow DOM visibility | Use embedded `playwright-core` attached via CDP to live `WebContentsView`. |
| Puppeteer / Selenium | Redundant. App already ships with Playwright-core `1.62.1` | Playwright-core. |
| External Python Benchmark frameworks (e.g. Promptfoo, DeepEval) | Introduces external Python runtime dependency for desktop end users | Native TypeScript evaluation harness executed via Vitest / Electron IPC. |

---

## Installation Commands

```bash
# Core dependencies
pnpm add zod@^3.24.2 zod-to-json-schema@^3.24.3 fast-levenshtein@^3.0.0

# Supporting dev tools
pnpm add -D css-tree@^3.2.1 @types/fast-levenshtein@^3.0.4
```

---

## Sources & Confidence Assessment

- `package.json`: Verified existing versions of Electron (43.4.0), Playwright-Core (1.62.1), @google/genai (2.17.1), React (19.2.8), Vitest (4.1.10).
- `pnpm info`: Verified published versions of Zod (3.24.x/4.4.x), zod-to-json-schema (3.25.x), fast-levenshtein (3.0.0), css-tree (3.2.1).
- `electron/ipc/aiProvider.ts` & `electron/ipc/playwrightEngine.ts`: Verified existing provider architecture and CDP connection mechanisms.
- Confidence: **HIGH**. Zero heavy bloat, direct fit for Electron desktop architecture.
