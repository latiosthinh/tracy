# Project Research Summary

**Project:** ProQA / Tracy Desktop
**Domain:** AI Desktop E2E Testing IDE / Browser Automation Agent
**Researched:** 2026-08-19
**Confidence:** HIGH

## Executive Summary

ProQA / Tracy is a desktop E2E testing IDE built on Electron, React 19, Playwright, and multi-provider AI orchestration. Milestone v3.0 evolves test generation from static one-shot prompt synthesis into an extensible Agent Skills runtime featuring live DOM selector pre-validation and deterministic accuracy benchmarking. Modern AI browser automation platforms (Stagehand, Midscene.js, Playwright Test Agent) solve selector fragility by closing the feedback loop between LLM proposals and the live target page before committing generated code.

The recommended approach introduces a declarative, vendor-neutral Agent Skill registry in TypeScript, backed by live selector verification via child `WebContentsView` script probes and dynamic tool injection across Gemini, Claude, OpenAI, and CLI providers. This gives the AI Copilot domain-aware heuristics (auth flows, data tables, dynamic modals, shadow DOM) and enables automatic self-correction loops when proposed selectors fail against the live page.

Primary risks include recursive tool calling runaway, security vulnerabilities from raw string interpolation during webview JS execution, DOM mutation race conditions, and IPC payload bloat. These are mitigated by strict iteration limits (max 5 tool calls), parameter-safe script execution in isolated worlds, dual-mode selector classification (`VerifiedPresent` vs `DeferredDynamic`), and delta-only streaming over whitelisted Electron IPC channels.

## Key Findings

### Recommended Stack

Milestone v3.0 keeps runtime footprint minimal by leveraging existing Playwright and Electron infrastructure without adding bloated agent frameworks (LangChain / LlamaIndex rejected).

**Core technologies:**
- `zod` (`^3.24.2`) & `zod-to-json-schema` (`^3.24.3`): Declarative schema definitions for Agent Skills, tool arguments, and automatic conversion to provider tool formats.
- Native `playwright-core` (`^1.62.1`) & `WebContentsView`: Live selector count, visibility, and clickability pre-flight probes directly against active browser webviews.
- `fast-levenshtein` (`^3.0.0`) & `Vitest` (`^4.1.10`): Local-first, deterministic accuracy benchmark harness comparing synthesized YAML steps against ground-truth HTML fixtures.
- `css-tree` (`^3.2.1`, dev/eval): Fast client-side CSS and XPath selector syntax validation and linting.

### Expected Features

**Must have (table stakes):**
- Declarative Agent Skills Registry (schema, system prompts, domain tool recipes).
- Interactive Selector Pre-Validation Loop (tests synthesized selectors against live webview DOM before YAML diff preview).
- Skill Selector UI in Copilot (toggle active QA skills with a11y labels).
- Execution Trace & Thought Inspector (streams reasoning, tool calls, and selector match results).
- Domain QA Skills Pack (built-in skills for Auth/MFA, Forms, Data Tables, Modals/Shadow DOM).
- Flow Accuracy Evaluation Harness (automated accuracy scoring across model providers).

**Should have (competitive differentiators):**
- Zero-roundtrip local DOM healing and candidate selector ranking.
- Self-correcting AI flow repair loop (multi-turn auto-retry when selectors fail).
- Custom project-level skill injection (`.proqa/skills/*.yaml`).
- Model accuracy benchmarking matrix (scoring precision, token speed, cost across models).
- Shadow DOM & iframe piercing selector generation.

**Defer (v2+ / Anti-features):**
- Autonomous blind web crawlers (burns tokens, mutates backend data).
- Arbitrary Python/JS sandbox runtime in desktop client (security risk).
- Cloud-hosted SaaS evaluation platform (violates local-first architecture).

### Architecture Approach

The architecture maintains strict Electron dual-process separation. The React renderer manages skill configuration (`agentStore.ts`), trace rendering (`TraceInspector.tsx`), and benchmark views (`evalStore.ts`). Privileged operations run in Electron main process: `skillEngine.ts` compiles prompt instructions and tool schemas for `aiProvider.ts`, while `webviewManager.ts` executes isolated in-page probes against live `WebContentsView` instances over whitelisted IPC channels (`validate_dom_selector`, `synthesize_flow_with_skills`).

**Major components:**
1. **Skill Registry & Runtime** (`src/lib/skills/`, `electron/ipc/skillEngine.ts`): Vendor-neutral skill definitions and tool execution sandbox.
2. **Webview DOM Prober** (`electron/ipc/webviewManager.ts`): Parameter-safe script execution measuring selector count and visibility in child webviews.
3. **Multi-Provider Tool Calling Engine** (`electron/ipc/aiProvider.ts`): Formats tools for Gemini, OpenAI, Claude, and local CLI agents with loop guards.
4. **Trace Inspector & Skill UI** (`src/components/ai/`): Visual stream of agent reasoning, tool invocations, and live verification status.
5. **Accuracy Evaluation Harness** (`src/lib/eval/`, `src/test/accuracy/`): Vitest-based suite testing synthetic flow generation against static HTML fixtures.

### Critical Pitfalls

1. **Dynamic Tool Calling Recursion Runaway** — LLMs entering infinite retry loops when selectors fail. Prevented by hard iteration caps (max 5), argument call hashing, and token budget ceilings.
2. **RCE / XSS via Webview `executeJavaScript`** — Malicious selectors or payloads executing arbitrary code in webviews. Prevented by parameterizing evaluation scripts and running in isolated execution worlds.
3. **DOM Drift & Multi-Step Mutation False Negatives** — Testing Step 2 selectors against $T_0$ DOM before Step 1 has executed. Prevented by distinguishing `VerifiedPresent` from `DeferredDynamic` selectors.
4. **IPC Payload Saturation & UI Freezes** — Large DOM trees and trace histories blocking the V8 serialization thread. Prevented by sending compressed DOM snapshots and delta-only trace events (<200KB).
5. **Vendor Schema Fragmentation** — Skill definitions breaking across different LLM formats. Prevented by canonical `TracySkillDef` with format adapters for Gemini, OpenAI, and Claude.

## Implications for Roadmap

Suggested phase structure for Milestone v3.0:

### Phase 1: Declarative Skills Core & IPC Grounding
**Rationale:** Foundational data contracts must exist before AI providers can consume skills or UI can display them.
**Delivers:** `TracySkillDef` interfaces, Zod schemas, skill registry (`src/lib/skills/`), IPC channel registrations in `preload.ts` and `ipc.ts`.
**Addresses:** Declarative Agent Skills Registry, Built-in Domain Skills schema.
**Avoids:** Vendor schema fragmentation, IPC contract drift.

### Phase 2: Live DOM Selector Pre-Validation Engine
**Rationale:** Live webview DOM probing is required before the AI generation loop can verify selectors.
**Delivers:** `validate_dom_selector` IPC handler in `webviewManager.ts` using isolated-world JS execution, selector syntax checks via `css-tree`, support for shadow DOM piercing.
**Addresses:** Interactive Selector Verification Loop, Zero-Roundtrip DOM Healing.
**Avoids:** Webview script injection vulnerabilities, shadow DOM blindness.

### Phase 3: Multi-Provider Tool Calling & Self-Correcting Flow Synthesis
**Rationale:** Connects skills and selector validation into the AI provider pipeline.
**Delivers:** Multi-turn tool calling in `aiProvider.ts` (Gemini, Claude, OpenAI), automatic selector disambiguation feedback loop, streaming trace chunk events.
**Addresses:** Self-Correcting AI Flow Repair Loop, Execution Trace streaming.
**Avoids:** Infinite tool recursion runaway, token budget blowup.

### Phase 4: Built-in QA Skills Catalog & Project Skill Loading
**Rationale:** Populate the skill runtime with battle-tested domain prompts and recipes.
**Delivers:** Built-in skills (Auth/MFA, Form Validation, Data Tables, Modals/Shadow DOM) and workspace skill loader (`.proqa/skills/*.yaml`).
**Addresses:** Domain QA Skills Pack, Custom Project-Level Skill Injection.
**Avoids:** Generic context-blind test generation.

### Phase 5: Copilot UI Integration & Execution Trace Inspector
**Rationale:** Expose skills, traces, and verification badges to QA engineers in the studio interface.
**Delivers:** `SkillSelector` component, `TraceInspector` collapsible reasoning log, real-time selector validation badges in diff preview modal, accessible localized strings (`en.json`).
**Addresses:** Skill Selector UI in Copilot, Execution Trace & Thought Inspector.
**Avoids:** Secret leakage in trace logs, UI thread freezing from unthrottled streaming.

### Phase 6: Flow Accuracy Evaluation Harness & Benchmarking Suite
**Rationale:** Verify synthesis accuracy against real-world test fixtures and establish regression benchmarks across models.
**Delivers:** Fixture HTML scenarios (auth, tables, shadow DOM), accuracy test runner using Vitest and `fast-levenshtein`, benchmark scorecard reporting syntax validity and locator precision.
**Addresses:** Flow Accuracy Evaluation Harness, Deterministic Accuracy Benchmarking Matrix.
**Avoids:** Flaky benchmark assertions, unmeasured model regression.

### Phase Ordering Rationale

1. **Contracts first (Phase 1):** Type-safe schemas and IPC channels prevent breaking changes across processes.
2. **Local execution before AI integration (Phase 2 -> Phase 3):** Webview selector validation must be reliable and secure before hooking into multi-turn LLM agent loops.
3. **Domain content before UI (Phase 4 -> Phase 5):** Built-in skills supply the concrete options rendered by the Copilot skill picker and trace inspector.
4. **Harness last (Phase 6):** Complete end-to-end synthesis pipeline is needed to run meaningful automated accuracy benchmarks against golden test fixtures.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (DOM Verification Engine):** Needs focused inspection of Electron `WebContentsView.webContents.executeJavaScriptInIsolatedWorld` and cross-origin iframe boundaries.
- **Phase 3 (Multi-Provider Tool Calling):** Needs schema mapping verification between `@google/genai` function declarations and OpenAI/Claude tool use specs.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Skills Schema & IPC):** Standard TypeScript/Zod schemas and existing Tracy IPC whitelist pattern.
- **Phase 4 (Built-in Skills Catalog):** Standard prompt engineering and YAML recipe authoring.
- **Phase 5 (Copilot UI):** Standard React 19 + Tailwind v4 + Zustand component integration.
- **Phase 6 (Eval Harness):** Standard Vitest suite with local HTML fixtures.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Minimal new deps (`zod`, `fast-levenshtein`, `css-tree`), zero bloat, native Playwright/Electron. |
| Features | HIGH | Table stakes, differentiators, and anti-features clearly scoped to desktop IDE needs. |
| Architecture | HIGH | Dual-process IPC boundaries, isolated world DOM probing, and provider tool calling mapped out. |
| Pitfalls | HIGH | Specific mitigations identified for recursion, security, DOM drift, IPC load, and flaky evals. |

**Overall confidence:** HIGH

### Gaps to Address

- **Cross-origin iframe selector probing:** Probing elements inside third-party iframes may require delegating to Playwright CDP session rather than direct `webContents.executeJavaScript`. Validate during Phase 2 plan.
- **Local CLI Agent tool format:** Non-cloud models (Ollama / local CLI runners) might require structured markdown prompt tool calling instead of native JSON function declarations. Handle via fallback adapter in Phase 3.

## Sources

### Primary (HIGH confidence)
- ProQA Codebase: `electron/ipc/aiProvider.ts`, `electron/ipc/webviewManager.ts`, `electron/preload.ts`, `src/utils/domMiner.ts`, `docs/FLOW_SCHEMA.md`
- Electron Security Best Practices: Isolated Worlds, Context Isolation, Safe IPC Serialization
- Playwright Documentation: Selector engines, Shadow DOM piercing, Locators Best Practices
- Package Registries: Verified published versions of `zod`, `zod-to-json-schema`, `fast-levenshtein`, `css-tree`

### Secondary (MEDIUM confidence)
- Midscene.js & Browserbase Stagehand: Patterns for multimodal and DOM-grounded UI automation agents
- Google GenAI SDK & OpenAI API Tool Calling specifications

---
*Research completed: 2026-08-19*
*Ready for roadmap: yes*
