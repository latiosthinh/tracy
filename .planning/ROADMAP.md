# Roadmap: ProQA

## Milestones

- ✅ **v1.0 Project-Isolated Studio & Hardening** — Phases 1-3 (shipped 2026-08-15)
- ✅ **v2.0 Atomic UI/UX Perfection & Power Studio Workflows** — Phases 4-8 (shipped 2026-08-19)
- 📋 **v3.0 AI Flow Gen V2 & Dynamic Agent Skills** — Phases 9-14 (planned)

## Phases

<details>
<summary>✅ v1.0 Project-Isolated Studio & Hardening (Phases 1-3) — SHIPPED 2026-08-15</summary>

- [x] Phase 01: Per-Project Embedded Browser (3/3 plans) — completed 2026-08-15
- [x] Phase 02: Accessibility & Zero-Hardcoded-Text Refactor (4/4 plans) — completed 2026-08-15
- [x] Phase 03: Post-Audit Hardening (3/3 plans) — completed 2026-08-15

</details>

<details>
<summary>✅ v2.0 Atomic UI/UX Perfection & Power Studio Workflows (Phases 4-8) — SHIPPED 2026-08-19</summary>

- [x] Phase 04: Command Palette & Global Keyboard Shortcuts (2/2 plans) — completed 2026-08-16
- [x] Phase 05: Studio Layout Versatility & Device Viewports (3/3 plans) — completed 2026-08-16
- [x] Phase 06: Editor Polish, YAML Diffing & Playwright TS Exporter (3/3 plans) — completed 2026-08-16
- [x] Phase 07: AI Copilot QA Recipes & Diff Preview (3/3 plans) — completed 2026-08-16
- [x] Phase 08: Interactive HTML Reports & Latency Flamechart (2/2 plans) — completed 2026-08-16

</details>

### Milestone v3.0: AI Flow Gen V2 & Dynamic Agent Skills

- [ ] **Phase 09: Declarative Agent Skills Runtime & Registry** - Schema, serialization, project skill loader, and store registry
- [ ] **Phase 10: Live DOM Selector Pre-Validation Engine** - Isolated webview selector prober, stability scoring, and resilience hierarchy
- [ ] **Phase 11: Multi-Provider Tool Calling & Self-Healing Loop** - Native tool calling across providers with bounded auto-repair loop
- [ ] **Phase 12: Built-in QA Domain Skills Catalog** - Domain skills for Auth/MFA, Forms, Data Tables, and Shadow DOM/Modals
- [ ] **Phase 13: Copilot Skill Selector & Trace Inspector UI** - UI controls for skill toggling, presets, and live reasoning trace stream
- [ ] **Phase 14: Flow Accuracy Benchmark & Evaluation Suite** - Ground-truth fixtures and Vitest accuracy scoring harness

## Phase Details

### Phase 09: Declarative Agent Skills Runtime & Registry
**Goal**: Provide type-safe definitions, storage, and runtime registry for agent skills across renderer and main process
**Depends on**: Nothing in v3.0 (builds on v2.0 baseline)
**Requirements**: SKILL-01, SKILL-02
**Success Criteria** (what must be TRUE):
  1. Developers can define agent skills with system prompt modifiers, parameter schemas, and tool definitions matching Zod contract
  2. Skills can be serialized to and parsed from `.skill.json` and `.skill.yaml` formats with validation errors reported
  3. `agentStore` provides active skill states, preset selection ("Standard QA", "Form Specialist", "Data Table Deep-Dive", "Full Power"), and dynamic project skill discovery
**Plans**: 2 plans
- [x] 09-01-PLAN.md — Zod Skill Schema, TypeScript Types, Validation & Serializer
- [x] 09-02-PLAN.md — Skill Registry, Built-ins Catalog Scaffolding, and agentStore Integration

### Phase 10: Live DOM Selector Pre-Validation Engine
**Goal**: Enable real-time probing of CSS, XPath, Text, and ARIA selectors directly against live embedded webviews in isolated context
**Depends on**: Phase 09
**Requirements**: VERIFY-01, VERIFY-02
**Success Criteria** (what must be TRUE):
  1. Main IPC handler `validate_dom_selector` executes probes in webview isolated world without polluting target page scripts
  2. Probe returns match count, visibility state, bounding box, tag name, text content, and shadow DOM penetration within strict timeout
  3. Locators are categorized into `UniquePresent`, `AmbiguousMultiple`, `NotPresent`, or `DeferredDynamic` with fallback resilience scoring
**Plans**: 2 plans
- [x] 10-01-PLAN.md — Isolated-World Webview Selector Prober IPC & Preload Channel
- [x] 10-02-PLAN.md — Selector Stability Scoring Engine & Ambiguity Classifier

### Phase 11: Multi-Provider Tool Calling & Self-Healing Loop
**Goal**: Connect LLM providers (Google GenAI, OpenAI-compat, Anthropic, CLI) to live DOM verification tools with automatic selector self-correction
**Depends on**: Phase 10
**Requirements**: TOOL-01, TOOL-02
**Success Criteria** (what must be TRUE):
  1. Multi-provider AI abstraction translates native tool definitions (`validate_selector`, `find_elements_by_text`, `inspect_element`) across Gemini, Anthropic, and OpenAI protocols
  2. When a generated selector fails validation, agent receives diagnostic feedback and automatically retries alternative resilient locators
  3. Generator enforces hard iteration cap (max 5 turns), loop guards, and emits streaming reasoning trace chunks over IPC
**Plans**: 2 plans
- [ ] 11-01-PLAN.md — Multi-Provider Tool Calling Layer & Protocol Translators in aiProvider.ts
- [ ] 11-02-PLAN.md — Self-Healing Agent Tool Execution Loop, Bounded Iterations & Trace Streaming IPC

### Phase 12: Built-in QA Domain Skills Catalog
**Goal**: Deliver battle-tested prompt engineering and locator heuristics for high-complexity web testing scenarios
**Depends on**: Phase 11
**Requirements**: DOMAIN-01, DOMAIN-02, DOMAIN-03, DOMAIN-04
**Success Criteria** (what must be TRUE):
  1. Auth skill synthesizes resilient flows for login, MFA split inputs, cookie banners, and session timeout waits
  2. Form skill emits proper blur/tab events, custom select handling, and error state validation checks (`aria-invalid`)
  3. Data table skill scopes row/column selectors and generates stable cell action locators across pagination
  4. Shadow DOM/Modal skill penetrates open shadow roots, iframe boundaries, and handles backdrop dismissals with animation waits
**Plans**: 1 plan
- [x] 12-01-PLAN.md — Built-in QA Domain Skills Modules, Builtins Index & Test Suite

### Phase 13: Copilot Skill Selector & Trace Inspector UI
**Goal**: Allow QA engineers to toggle active domain skills and inspect real-time agent thoughts and tool calls in AI Copilot
**Depends on**: Phase 12
**Requirements**: UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. User can toggle skills via pills and one-click presets in `AiCopilot.tsx` with project-persistent state
  2. Live reasoning trace panel displays step-by-step agent thinking, tool invocations, inputs, match results, and duration
  3. Sensitive credentials (passwords, tokens) are automatically redacted in trace logs, and all text uses accessible a11y labels
**Plans**: TBD
**UI hint**: yes

### Phase 14: Flow Accuracy Benchmark & Evaluation Suite
**Goal**: Measure and guard flow generation precision and stability against deterministic HTML fixtures and ground-truth flows
**Depends on**: Phase 13
**Requirements**: EVAL-01, EVAL-02
**Success Criteria** (what must be TRUE):
  1. Fixture suite provides static HTML scenarios and canonical ground-truth YAML flows for auth, tables, forms, and modals
  2. Vitest benchmark harness scores Locator Precision (% valid unique selectors), Step Recall (% required actions captured), and Flow Pass Rate
  3. Benchmark runner outputs structured comparison matrix across configured AI models/providers
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|---|---|---|---|---|
| 01. Per-Project Browser | v1.0 | 3/3 | Complete | 2026-08-15 |
| 02. A11y & i18n Extraction | v1.0 | 4/4 | Complete | 2026-08-15 |
| 03. Hardening | v1.0 | 3/3 | Complete | 2026-08-15 |
| 04. Command Palette | v2.0 | 2/2 | Complete | 2026-08-16 |
| 05. Studio Layout & Bezels | v2.0 | 3/3 | Complete | 2026-08-16 |
| 06. YAML Diff & TS Exporter | v2.0 | 3/3 | Complete | 2026-08-16 |
| 07. AI Recipes & Diff Preview | v2.0 | 3/3 | Complete | 2026-08-16 |
| 08. HTML Reports & Flamechart | v2.0 | 2/2 | Complete | 2026-08-16 |
| 09. Skills Runtime & Registry | v3.0 | 2/2 | Complete | 2026-08-19 |
| 10. DOM Selector Pre-Validation | v3.0 | 2/2 | Complete | 2026-08-19 |
| 11. Tool Calling & Self-Healing | v3.0 | 0/TBD | Not started | - |
| 12. QA Domain Skills Catalog | v3.0 | 1/1 | Complete | 2026-08-19 |
| 13. Copilot Skill & Trace UI | v3.0 | 0/TBD | Not started | - |
| 14. Flow Accuracy Benchmarks | v3.0 | 0/TBD | Not started | - |
