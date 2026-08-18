# Feature Landscape: AI Agent Skills & Flow Synthesis Accuracy (v3.0)

**Domain:** Desktop E2E Testing IDE / Browser Automation AI Agent
**Researched:** 2026-08-19
**Milestone:** v3.0 — AI Flow Gen V2 & Dynamic Agent Skills

---

## Executive Feature Overview

ProQA v3.0 expands the existing dual-process Electron testing studio (Vite + React 19 + Playwright + DOM-Miner) into an autonomous, high-accuracy AI test engineering platform. 

The milestone tackles the two primary failure modes of LLM web test generation:
1. **Selector fragility and hallucination** (model outputs valid YAML targeting dead or ambiguous selectors).
2. **Generic, context-blind test logic** (model lacks domain heuristics for complex auth flows, data grids, infinite scrolls, or shadow DOM).

---

## Table Stakes

Features users expect in modern AI-powered browser automation IDEs (Playwright Test Agent, Cursor QA, Browserbase Stagehand, Midscene.js). Missing = product feels like a naive prompt wrapper.

| Feature | Why Expected | Complexity | Notes & Codebase Dependencies |
|---------|--------------|------------|-------------------------------|
| **Declarative Agent Skills Registry** | Users need specialized system instructions and reusable tool schemas per QA domain (Auth, Forms, Tables, Modals). | Medium | Pure TS schema in `src/lib/skills/` or `electron/ipc/skills/`. Integrates with `aiRegistry.ts` and `aiConfigStore.ts`. |
| **Interactive Selector Verification Loop (Pre-commit)** | Validates synthesized selectors against live DOM snapshots / child webview before applying YAML diff to editor. Eliminates hallucinated selectors. | High | Hooks into `electron/ipc/webviewManager.ts` and `src/utils/domMiner.ts` to test CSS/XPath/ARIA matches. |
| **Skill Selector UI in Copilot** | Users must select/toggle active skills and domain playbooks directly in `AiCopilot.tsx`. | Low | React component in `src/components/ai/` with translation keys in `src/a11y/en.json`. |
| **Execution Trace & Thought Inspector** | Transparent visualization of AI reasoning steps, matched DOM nodes, and tool calls during flow synthesis. | Medium | Extends streaming chunk handling in `AiCopilot.tsx` and Zustand `agentStore.ts`. |
| **Domain QA Skills Pack (Built-in)** | Out-of-the-box skills for Auth/MFA flows, Form validations, Data Tables/Grids, Dynamic Popups/Shadow DOM. | Medium | Built-in skill definitions adhering to schema with tested prompts and selector priority heuristics. |
| **Flow Accuracy Evaluation Harness** | Automated benchmark running synthesized flows against fixture HTML pages to calculate selector pass rates and flow validity. | High | Vitest suite in `src/test/accuracy/` or standalone test runner utilizing mock Playwright contexts. |

---

## Differentiators

Features that set ProQA apart from cloud-only test generators and generic coding assistants. Not expected by default, but highly valued by QA engineers.

| Feature | Value Proposition | Complexity | Notes & Implementation Vector |
|---------|-------------------|------------|-------------------------------|
| **Zero-Roundtrip Local DOM Healing / Verification** | Evaluates selector candidate rankings inside the child `WebContentsView` via IPC without executing full test runs. | High | Runs `page.evaluate()` or lightweight query checks via IPC channel `verify_selectors` in `electron/ipc/webviewManager.ts`. |
| **Self-Correcting AI Flow Repair Loop** | If selector verification fails on target DOM, agent receives automated error feedback and re-synthesizes alternative locator strategies (TestID > ARIA > Text > XPath) within the same generation stream. | High | Multi-turn feedback loop in `electron/ipc/aiProvider.ts` before returning final YAML. |
| **Custom Project-Level Skill Injection** | Teams can save custom `.proqa/skills/*.yaml` or markdown skills in their project workspace, auto-loaded into the Copilot runtime. | Medium | Interacts with `electron/ipc/fileSystem.ts` and workspace watcher. |
| **Deterministic Accuracy Benchmarking Matrix** | Built-in telemetry / scoring dashboard showing synthesis accuracy, token efficiency, and selector stability across different AI models (Gemini, Claude, GPT, DeepSeek, Local Ollama). | Medium | Builds on top of existing telemetry metrics (`tokenSpeed`, `generationDuration`) in `AiCopilot.tsx`. |
| **Shadow DOM & Iframe Piercing Locators** | Auto-detects custom web components, shadow roots, and embedded iframes, generating pierced Playwright selectors. | High | Extends `src/utils/domMiner.ts` tree extraction logic. |

---

## Anti-Features

Features to explicitly **NOT** build in milestone v3.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Autonomous Web Crawler / Blind Auto-Explorer** | Unbounded crawling burns user API keys, hits rate limits, creates noisy irrelevant tests, and risks mutating backend state. | Explicit user-guided prompt + DOM-mined single-page synthesis. User triggers flow creation on specific states. |
| **Custom Python / JavaScript Plugin Sandbox Runtime** | High security risk in Electron desktop environment; high maintenance overhead. | Declarative JSON/YAML schemas and prompt-based tool definitions. |
| **Cloud-Hosted Eval SaaS Platform** | Violates ProQA local-first, zero-telemetry desktop architecture. | Local Vitest-based fixture test harness executed on user's machine. |
| **Heuristic-only Selector Guessing (Without Live DOM)** | Pure regex / LLM hallucination without DOM tree leads to 40%+ failure rates on real apps. | Strict requirement: AI Copilot must consume `domContext` from `domMiner` whenever browser webview is open. |

---

## Feature Dependencies & Architectural Integration

```
[WebContentsView / Child Webview]
        │ (live DOM)
        ▼
[src/utils/domMiner.ts] ──(Token-compressed AST)──► [src/lib/skills/ Skill Runtime]
                                                             │
                                                             ▼
                                                    [electron/ipc/aiProvider.ts]
                                                             │
                                                             ▼ (Synthesized YAML Draft)
[Verification Loop: verify_selectors IPC] ◄──────────────────┤
        │
        ├── (Pass) ──► [AiDiffPreviewModal.tsx] ──► [YAML Editor]
        │
        └── (Fail) ──► [Auto-Correction Prompting] ──► [aiProvider.ts Re-try]
```

### Key Dependencies on Existing Codebase

1. **`src/utils/domMiner.ts`**:
   - Must expose node locator verification functions.
   - Expand `generateSuggestedSelectors()` to support role-first, fallback chains, and shadow DOM boundaries.
2. **`electron/ipc/webviewManager.ts` & `electron/preload.ts`**:
   - Add new IPC channel `verify_selectors` to test generated CSS/XPath/Playwright selectors directly on live `WebContentsView`.
3. **`src/lib/aiRegistry.ts` & `src/stores/aiConfigStore.ts`**:
   - Attach active skills configuration to the provider payload.
4. **`src/components/ai/AiCopilot.tsx`**:
   - Mount `SkillSelector` component.
   - Display live verification badges (e.g. "✓ 4/4 Selectors Verified on Page").

---

## MVP Recommendation for Milestone v3.0

### Phase 1: Declarative Skills Runtime & Base Registry
- Implement TypeScript skill definition interface (`SkillDef`: id, name, description, systemPromptAddition, domainTools, selectorRules).
- Create built-in skills: `auth-flow`, `form-validation`, `data-grid-table`, `modal-dialog-shadowdom`.
- Integrate skill picker into `AiCopilot.tsx`.

### Phase 2: DOM Verification & Auto-Repair Engine
- Add IPC handler `verify_selectors` in `electron/ipc/webviewManager.ts` / `playwrightEngine.ts`.
- Build verification runner in renderer to validate generated YAML steps against current `MinedPage` nodes before opening diff preview.
- Add 1-turn auto-correction loop in AI provider stream if selector fails match.

### Phase 3: Trace Inspector & Accuracy Benchmark Suite
- Visual Step & Selector Verification report in Copilot panel.
- Accuracy test suite (`src/test/accuracy/`) with 10+ standard web scenario fixtures (Shadow DOM, dynamic table, multi-step form, authentication) assessing accuracy score across models.

---

## Sources

- ProQA Architecture & Schemas: `docs/FLOW_SCHEMA.md`, `docs/DOM_MINER.md`, `.planning/PROJECT.md`
- Codebase inspection: `src/utils/domMiner.ts`, `src/lib/aiRegistry.ts`, `electron/ipc/webviewManager.ts`
- Industry standard patterns: Playwright Locators Best Practices, Midscene.js DOM-driven UI grounding.
