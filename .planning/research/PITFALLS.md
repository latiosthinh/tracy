# Domain Pitfalls: AI Agent Skills, DOM Verification & Flow Evaluation

**Domain:** Desktop E2E Testing IDE with AI Agent Skills & Live DOM Verification
**Researched:** 2026-08-19
**Overall Confidence:** HIGH

---

## Executive Pitfall Summary

Adding multi-turn AI Agent Skills, dynamic tool calling, live webview DOM verification loops, and accuracy benchmark harnesses into a dual-process Electron desktop app introduces distinct failure modes across IPC boundaries, LLM reliability, security isolation, and UI responsiveness.

```
       [Renderer (UI/Zustand)]
                 ↕  (IPC Bridge - strict schema & serialization)
       [Main Process (Node/Electron)]
          ↙             ↓               ↘
 [AI Provider/Tools] [Live Webview]  [Playwright Runner]
  (LLM hallucination, (DOM drift,     (Zombie runners,
   token blowup,       iframe trap,    race conditions)
   tool recursion)     XSS injection)
```

---

## Critical Pitfalls

Mistakes causing major architectural rewrites, memory leaks, security breaches, or system deadlocks.

### Pitfall 1: Dynamic Tool Injection & Recursive Multi-Step LLM Runaway
- **What goes wrong:** Adding agent skills with dynamic tool calling (e.g. `query_dom`, `verify_selector`, `generate_step`, `run_assertion`) creates infinite loops or exponential token blowup when LLMs get stuck in cyclical tool retries.
- **Why it happens:** LLM receives failed selector verification, alters query slightly, fails again, repeats without convergence criteria or max tool recursion limit.
- **Consequences:** API rate limit exhaustion, huge billing spikes, IPC queue blocking, frozen IDE UI.
- **Prevention:**
  1. Enforce strict `max_tool_iterations` (default: 5, hard max: 10) in agent orchestration loop.
  2. Implement loop detection: track visited `(tool_name, hash(args))` tuples. If same tool + arguments called twice consecutively, abort loop with deterministic fallback error.
  3. Enforce token budget ceiling per flow synthesis session (e.g., max 16k cumulative tokens).
- **Detection:** Watchdog timer + iteration counter in `electron/ipc/aiProvider.ts`.

### Pitfall 2: Remote Code Execution (RCE) / XSS via Webview `executeJavaScript` DOM Verification
- **What goes wrong:** DOM selector verification inspects live webview DOM by interpolating generated selectors directly into raw string scripts evaluated in `WebContentsView.webContents.executeJavaScript(...)`.
- **Why it happens:** Untrusted web pages visited in webviews or AI-generated selector strings containing quotes/backticks/script payloads break out of JS string literals during evaluation.
- **Consequences:** Arbitrary JS execution within the context of the target webview, credential theft, session hijacking, or renderer IPC privilege escalation.
- **Prevention:**
  1. Never string-interpolate user or AI inputs into `executeJavaScript` without parameterization.
  2. Pass queries as structured arguments through `executeJavaScript` using self-contained pure functions with JSON-serializable payloads:
     ```typescript
     // SAFE: Argument passed via array, evaluated safely in isolated world
     await webContents.executeJavaScriptInIsolatedWorld(
       WORLD_ID,
       [{ code: 'function(sel) { return document.querySelectorAll(sel).length; }' }],
       true
     );
     ```
  3. Pre-validate selector strings with `css-tree` or Playwright selector parser before sending to DOM inspection engine.
- **Detection:** Security test suite asserting injection payloads (e.g., `button[type="')] ; alert(1); //"]`) fail safely.

### Pitfall 3: DOM Drift & Mutation Race Conditions during Step-by-Step Verification
- **What goes wrong:** AI agent generates a multi-step sequence (e.g. Step 1: Open Dropdown, Step 2: Click Option). Agent tests selector for Step 2 against live DOM snapshot before Step 1 has actually been executed or rendered in live webview.
- **Why it happens:** Live DOM snapshot is static at time $T_0$. Subsequent steps depend on transient DOM states created by previous steps that have not run yet.
- **Consequences:** False negative selector validation errors. The verification loop rejects valid test flows because elements only exist conditionally after preceding actions.
- **Prevention:**
  1. Decouple **Static Page Verification** (single-page selector presence against current snapshot) from **Simulated / Dry-Run Verification** (Playwright headless dry-run in sandbox).
  2. Classify selectors into:
     - `VerifiedPresent` (matched currently visible node in mined DOM tree).
     - `DeferredDynamic` (matches conditional patterns like modal/dropdown/toast, verified via schema heuristics or dry-run execution).
  3. Never mandate 100% immediate live DOM presence for deferred dynamic child steps.
- **Detection:** Flag steps in UI with validation badges: `[Verified in DOM]` vs `[Dynamic Pending Execution]`.

### Pitfall 4: IPC Payload Saturation & UI Main-Thread Blocking
- **What goes wrong:** Sending full unmined DOM trees or large multi-step execution traces over Electron IPC freezes the UI renderer (60fps drop, typing lag).
- **Why it happens:** `v8::ValueSerializer` overhead when passing massive JSON objects (>5MB) over `ipcRenderer.invoke` / `ipcMain.handle`.
- **Consequences:** UI hitching, unresponsive visual editor, memory spikes in Electron main and renderer processes.
- **Prevention:**
  1. Continue leveraging `domMiner.ts` token-efficient compression. Strip redundant DOM attributes, inline styles, SVGs, and hidden subtrees before sending over IPC.
  2. Send delta traces (only newly generated steps or selector verification outcomes), not the entire agent history array on each stream chunk.
  3. Keep IPC payload under 200KB per interaction.
- **Detection:** Add payload size warnings in development logging (`if (payload.length > 250_000) console.warn(...)`).

---

## Moderate Pitfalls

Mistakes leading to test flakiness, poor developer experience, or maintenance burden.

### Pitfall 5: Shadow DOM & iFrame Blindness in Live Selector Verification
- **What goes wrong:** Standard `document.querySelector` fails when verifying selectors inside Shadow Roots (Web Components) or embedded `<iframe>` elements.
- **Why it happens:** Shadow DOM subtrees and cross-origin iframes encapsulate their internal DOM trees from standard query APIs.
- **Consequences:** Valid Playwright flows (which handle pierced selectors like `pierce/` or nested frames) are marked as broken by internal verification logic.
- **Prevention:**
  1. Ensure DOM miner and selector verification engine traverse `attachShadow({ mode: 'open' })` subtrees recursively.
  2. For iframes, check `HTMLIFrameElement.contentDocument` (for same-origin) or delegate frame verification to Playwright engine context.
  3. Mark cross-origin iframe selectors as `IframeEncapsulated` rather than `SelectorNotFound`.

### Pitfall 6: Skill Registry State Contamination & Cross-Provider Drift
- **What goes wrong:** Different LLM providers (Gemini, Claude, OpenAI, Ollama, CLI agents) handle system instructions, tool schemas, and output formats differently. Skills defined with OpenAI JSON Schema tool specs fail on Gemini or CLI runners.
- **Why it happens:** Direct coupling between skill definition and a single vendor's SDK schema format.
- **Consequences:** Skills work on GPT-4o but crash or hallucinate on Claude Sonnet, Gemini Flash, or local Ollama models.
- **Prevention:**
  1. Define Agent Skills in a vendor-neutral canonical schema (`TracySkillDef` with name, description, parameters, instructions, and handler).
  2. Build schema adapters in `aiProvider.ts`:
     - Gemini: `FunctionDeclaration` / `Tool` config
     - OpenAI / OpenAI-compat: `tools: [{ type: 'function', function: ... }]`
     - Claude: `tools: [{ name, description, input_schema }]`
     - CLI / Text-only: Markdown prompt tool description format
  3. Unit test skill schema converters across all supported providers.

### Pitfall 7: Over-Constrained YAML Schema Breaking Flow Synthesis
- **What goes wrong:** Rigid step verification rejects valid flows that use composite actions or newer YAML properties.
- **Why it happens:** Schema validation in renderer and main process drifts from `docs/FLOW_SCHEMA.md` or AI prompt instructions.
- **Consequences:** AI generates high-quality flows that fail validation on import or cannot be rendered in `VisualStepEditor.tsx`.
- **Prevention:**
  1. Single source of truth: Export Zod/TypeScript schema for Flow YAML and share between parser, AI validator, and visual editor.
  2. Implement soft-fail normalization (e.g., auto-convert legacy `click: "#btn"` to `leftClick: true, selector: "#btn"`).

---

## Minor Pitfalls

Usability issues, edge cases, and cosmetic annoyances.

### Pitfall 8: Flaky Accuracy Benchmarks in Evaluation Harness
- **What goes wrong:** Flow synthesis accuracy benchmarks fluctuate between test runs, giving misleading regression signals.
- **Why it happens:** Non-zero temperature in LLM providers, network latency, live remote websites changing their DOM during evaluation.
- **Consequences:** CI/CD test harness failures that don't represent code regressions.
- **Prevention:**
  1. Fix `temperature: 0` for all automated evaluation benchmark runs.
  2. Use static mock DOM snapshots / fixture HTML pages served on `localhost` (e.g. `test/fixtures/login-form.html`), never live external websites.
  3. Test evaluation assertions against deterministic AST criteria (e.g., valid syntax, contains target action, selector targets expected testId/role), not exact string matching.

### Pitfall 9: Secrets Leaking in Agent Execution Reasoning Logs
- **What goes wrong:** Agent execution traces displaying tool inputs/outputs expose user passwords, session tokens, or API keys in the Studio UI trace inspector.
- **Why it happens:** Form fill steps contain real credentials during flow generation.
- **Consequences:** Credentials saved in plaintext project test files or execution logs.
- **Prevention:**
  1. Run all trace logs through `redactSecrets()` before streaming or storing in `executionStore.ts`.
  2. Automatically mask values for steps with `type="password"` or matching credential keys (`password`, `token`, `secret`, `apiKey`).

---

## Phase-Specific Warnings for Milestone v3.0

| Phase Topic | Likely Pitfall | Concrete Mitigation |
|---|---|---|
| **Phase 09: Agent Skills Architecture & Canonical Registry** | Vendor schema fragmentation across Gemini, Anthropic, OpenAI, CLI | Build vendor-neutral skill schema with bidirectional adapters in `aiProvider.ts`. |
| **Phase 10: Live DOM Selector Verification Engine** | Webview JS injection vulnerabilities & Shadow DOM blindness | Use isolated world execution for selector validation; support open shadow root traversal. |
| **Phase 11: Multi-Turn Agent Loop & Streaming Traces** | Infinite tool call recursion & IPC payload saturation | Set hard iteration caps (max 5); stream lightweight delta events to renderer. |
| **Phase 12: Flow Accuracy Evaluation Harness** | Non-deterministic benchmark flakiness | Run evaluations on deterministic localhost HTML fixtures with `temperature: 0`. |
| **Phase 13: UI Trace Inspector & Skill Selector** | Leaking passwords in execution trace viewer & UI stutter | Apply `redactSecrets()` pipeline and throttle Zustand state updates. |

---

## Sources

- ProQA Codebase: `electron/ipc/aiProvider.ts`, `electron/ipc/cliRunner.ts`, `electron/ipc/webviewManager.ts`, `src/utils/domMiner.ts`
- Electron Security Best Practices: Context Isolation, Isolated Worlds (`executeJavaScriptInIsolatedWorld`)
- Playwright Documentation: Selector engines, Shadow DOM piercing locators (`getByRole`, `getByTestId`)
- Google GenAI & OpenAI Tool Calling Specifications
