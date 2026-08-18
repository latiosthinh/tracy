# Architecture Patterns: AI Agent Skills & Flow Synthesis Accuracy (v3.0)

**Domain:** E2E Desktop Testing IDE (Electron, React 19, Playwright, LLM Orchestration)
**Researched:** 2026-08-19
**Confidence:** HIGH

---

## Executive Summary & Integration Blueprint

Milestone v3.0 introduces an extensible Agent Skills Framework, DOM selector verification loop against live `WebContentsView`, dynamic tool injection into AI providers, and an automated flow accuracy evaluation harness.

### Existing Architecture vs v3.0 Architecture

```
+---------------------------------------------------------------------------------------------------+
| RENDERER PROCESS (React 19, Zustand, Tailwind v4)                                                 |
|                                                                                                   |
|  +---------------------+   +---------------------+   +---------------------+   +---------------+  |
|  |   AiCopilot.tsx     |   |   SkillSelector     |   |   TraceInspector    |   |  EvalRunner   |  |
|  |  (Prompt + Context) |   |  (Skill Catalog UI) |   |  (Reasoning Stream) |   | (Bench Suite) |  |
|  +----------+----------+   +----------+----------+   +----------+----------+   +-------+-------+  |
|             |                         |                         |                      |          |
|             +-------------------------+------------+------------+                      |          |
|                                                    v                                   v          |
|                                    +-------------------------------+   +-----------------------+  |
|                                    |         agentStore.ts         |   |      evalStore.ts     |  |
|                                    | (Active Skills, Tool Registry)|   | (Benchmarks, Scores)  |  |
|                                    +---------------+---------------+   +-----------+-----------+  |
|                                                    |                               |              |
+----------------------------------------------------|-------------------------------|--------------+
                                                     | IPC Bridge (`tracyAPI`)       |
+----------------------------------------------------v-------------------------------v--------------+
| ELECTRON MAIN PROCESS (Node.js, Playwright, WebContentsView)                                      |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | `run_agent_cli_stream` / `synthesize_flow_with_skills` IPC Handler (fileSystem.ts / skills)  |  |
|  +----------------------------------------------+----------------------------------------------+  |
|                                                 |                                                 |
|             +-----------------------------------+-----------------------------------+             |
|             v                                                                       v             |
|  +---------------------------------------------+   +-------------------------------------------+  |
|  |            aiProvider.ts Factory            |   |           webviewManager.ts               |  |
|  |  - Function calling / Tool injection        |   |  - Live `WebContentsView` instance pool   |  |
|  |  - Skill prompt / schema compilation        |   |  - `executeJavaScript` selector probe     |  |
|  |  - Stream chunks + tool call events         |   |  - `query_selector_stats` IPC API         |  |
|  +----------------------+----------------------+   +---------------------+---------------------+  |
|                         |                                                ^                        |
|                         v                                                | (Pre-validation loop)  |
|  +-----------------------------------------------------------------------+---------------------+  |
|  |                      Agent Skill Runtime & Selector Verification Engine                     |  |
|  |  1. Skill Prompt Assembly: Auth, Data Tables, Forms, Shadow DOM rules                       |  |
|  |  2. LLM proposes YAML test steps with candidate CSS/XPath selectors                         |  |
|  |  3. Pre-flight verification: probe candidate selectors directly in child WebContentsView    |  |
|  |  4. Disambiguation feedback loop: if 0 or >1 matches, retry or inject unique attributes     |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 1. Component Boundaries & Responsibilities

| Component | Location | Responsibility | Communicates With |
|-----------|----------|----------------|-------------------|
| **Skill Registry** | `src/lib/skills/skillRegistry.ts` (pure TS) | Declarative skill definitions: system prompts, recipe templates, validation rules, required tools. | `src/stores/agentStore.ts`, `electron/ipc/skillEngine.ts` |
| **Agent Store** | `src/stores/agentStore.ts` | State for active skills, enabled tools, inspection traces, agent execution status. | `AiCopilot.tsx`, `SkillSelector.tsx`, `TraceInspector.tsx` |
| **Skill Execution Engine** | `electron/ipc/skillEngine.ts` | Main process skill runner: orchestrates LLM tool calling, multi-turn disambiguation, and selector validation. | `aiProvider.ts`, `webviewManager.ts`, `preload.ts` |
| **Webview DOM Prober** | `electron/ipc/webviewManager.ts` | Executes in-page JavaScript probes directly in `WebContentsView` to test selector count, visibility, and clickability. | `skillEngine.ts`, `ipcMain` handlers |
| **AI Provider Tooling** | `electron/ipc/aiProvider.ts` | Adds tool calling definitions to Gemini (`functionDeclarations`), OpenAI/Custom Gateway (`tools`), and Claude (`tools`). | `skillEngine.ts`, Cloud LLMs |
| **Accuracy Eval Harness** | `src/lib/eval/accuracyHarness.ts` | Automated testing runner for flow synthesis: feeds known DOM scenarios, validates generated YAML syntactically and against mock DOM. | `useEvalStore.ts`, Vitest suites |

---

## 2. Detailed Data Flow & Lifecycle

### Step-by-Step Flow: AI Skill Execution & Selector Verification

```
[User triggers "Generate Flow" in AiCopilot]
               │
               ▼
1. Compile Context (Renderer)
   - Read active skills from `agentStore` (e.g., `form-validation`, `shadow-dom`).
   - Read DOM snapshot from `domMiner` / `domSnapshotStore`.
   - Pass prompt + skills + snapshot to `tracyApi.synthesizeFlowWithSkills({ ... })`.
               │
               ▼
2. IPC Dispatch (Main Process)
   - `skillEngine.ts` initializes LLM conversation with injected Skill system rules & tools:
     • Tool: `validate_dom_selector(selector: string)`
     • Tool: `inspect_element_attributes(elementId: string)`
               │
               ▼
3. Model Inference & Tool Call Loop
   - Provider invokes LLM (Gemini, Claude, or OpenAI).
   - If LLM emits tool call `validate_dom_selector({ selector: "#submit-btn" })`:
     a. `skillEngine` routes call to `webviewManager.queryCandidateSelector(projectId, selector)`.
     b. `WebContentsView.webContents.executeJavaScript` tests selector presence, element count, visibility (`offsetWidth > 0`).
     c. Returns result: `{ matchCount: 1, visible: true, tag: "BUTTON" }` or `{ matchCount: 3, error: "Ambiguous selector" }`.
     d. Result sent back to LLM as Tool Response.
               │
               ▼
4. Output Stream & YAML Synthesis
   - LLM finalizes accurate YAML steps.
   - Stream deltas emitted to renderer via `ai-stream-chunk` / `ai-agent-trace` events.
   - Renderer displays real-time reasoning trace in `TraceInspector` and final YAML in `AiDiffPreviewModal`.
```

---

## 3. Selector Pre-Validation Engine (`WebContentsView`)

### Implementation Pattern in `webviewManager.ts`:

```typescript
export interface SelectorValidationResult {
  selector: string;
  matched: number;
  visible: boolean;
  clickable: boolean;
  tagName?: string;
  suggestedSelector?: string;
}

export async function validateSelectorInWebview(
  projectId: string,
  selector: string
): Promise<SelectorValidationResult> {
  const entry = webviews.get(projectId);
  if (!entry || !entry.view.webContents) {
    return { selector, matched: 0, visible: false, clickable: false };
  }

  // Safe isolated script execution inside child webview
  const probeScript = `
    (() => {
      try {
        const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
        if (els.length === 0) return { matched: 0, visible: false, clickable: false };
        const el = els[0];
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        const clickable = !el.disabled && visible;
        return {
          matched: els.length,
          visible,
          clickable,
          tagName: el.tagName.toLowerCase(),
          suggestedSelector: els.length > 1 && el.id ? '#' + el.id : undefined
        };
      } catch (err) {
        return { matched: 0, visible: false, clickable: false, error: String(err) };
      }
    })()
  `;

  return entry.view.webContents.executeJavaScript(probeScript, true);
}
```

---

## 4. Declarative Skills Architecture

Skills are modular, self-contained domain handlers that define:
1. **System Prompt Additions:** Domain-specific testing wisdom (e.g. auth state persistence, debounce waits, shadow root querying).
2. **Grammar / Flow Constraints:** Action patterns enforced for specific UI components (e.g. Table sorting requires `waitFor` after header `leftClick`).
3. **Dedicated Validation Rules:** Custom selector assertions before YAML acceptance.

### Skill Definition Contract (`src/lib/skills/types.ts`):

```typescript
export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'forms' | 'tables' | 'shadow-dom' | 'performance';
  iconName: string;
  systemPromptModifier: string;
  sampleRecipes: Array<{ title: string; prompt: string }>;
  selectorHints?: Array<{ pattern: RegExp; recommendation: string }>;
  enabledByDefault?: boolean;
}
```

---

## 5. Flow Accuracy Evaluation Harness

To ensure test flow generation does not regress across prompt modifications or model updates:

```
.planning/eval/
  ├── scenarios/
  │   ├── auth-login.html          # Mock DOM fixtures
  │   ├── complex-datatable.html
  │   └── nested-shadow-root.html
  └── assertions/
      ├── auth-login.eval.ts       # Golden flow step expectations
      └── datatable.eval.ts
```

### Evaluation Metric Dimensions:
- **Syntax Validity:** Conforms 100% to `docs/FLOW_SCHEMA.md` without YAML parse errors.
- **Selector Precision:** 0 hallucinated classes, 100% uniqueness score (matched = 1) against fixture DOM.
- **Action Sequence Logic:** Correct ordering (e.g., `fill` before `press` Enter, `waitFor` selector after dynamic navigation).
- **Latency & Token Efficiency:** Tokens per generated step, execution duration under budget.

---

## 6. IPC Contract Changes

### New Channels Required in `electron/preload.ts`:

```typescript
// ALLOWED_INVOKE_CHANNELS additions:
'validate_dom_selector',           // { projectId: string, selector: string } -> SelectorValidationResult
'synthesize_flow_with_skills',     // { agentId, prompt, activeSkillIds, domSnapshot, projectId } -> string
'run_accuracy_eval_scenario',      // { scenarioId: string } -> EvalScenarioResult

// ALLOWED_ON_CHANNELS additions:
'ai-agent-trace',                  // { timestamp, type: 'tool_call' | 'thought' | 'validation', data: any }
```

---

## 7. Migration & Build Order Dependencies

1. **Phase 1 (Skills Schema & IPC Grounding):** Define `AgentSkill` interfaces, register `validate_dom_selector` in `webviewManager.ts` & `preload.ts`.
2. **Phase 2 (Tool-Calling Engine & Provider Updates):** Integrate tool-use loops into `electron/ipc/aiProvider.ts` for Gemini / OpenAI / Claude.
3. **Phase 3 (Domain QA Skills Catalog):** Implement Auth, Form Validation, Data Table, and Shadow DOM skills.
4. **Phase 4 (UI Integration & Trace Inspector):** Update `AiCopilot.tsx` with Skill toggles and `TraceInspector` step visualizer.
5. **Phase 5 (Accuracy Evaluation Suite):** Create DOM test fixtures and runner in `src/lib/eval/` with Vitest integration.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| IPC & Electron Dual-Process | HIGH | Follows established `preload.ts` whitelist pattern & `webviewManager` architecture |
| DOM Selector Verification | HIGH | Uses native `executeJavaScript` on existing child `WebContentsView` instances |
| AI Tool Calling Integration | HIGH | Extends existing `aiProvider.ts` multi-provider abstractions with function calling |
| Eval Harness & Testing | HIGH | Vitest with jsdom + mock DOM fixtures integrates directly with repo test runner |
