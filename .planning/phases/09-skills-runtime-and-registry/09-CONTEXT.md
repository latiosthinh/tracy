# Phase 09: Declarative Agent Skills Runtime & Registry - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** Smart Discuss (v3.0 Milestone)

<domain>
## Phase Boundary

Provide type-safe definitions, storage, and runtime registry for agent skills across renderer and main process. Fulfills requirements SKILL-01 and SKILL-02.
</domain>

<decisions>
## Implementation Decisions

### 1. Skill Definition & Serialization Format
- Use `zod` (`^3.24.2`) for schema definition, runtime validation, and JSON-Schema export.
- Support both pure TypeScript code definitions (`TracySkillDef`) and declarative file loading (`.skill.json` / `.skill.yaml`).
- Schema includes: `id`, `name`, `description`, `version`, `domain` (auth, forms, tables, shadow-dom, generic), `systemPromptInjection`, `tools` (list of tool schemas), `parameters` schema, `tags`.

### 2. Built-in vs Custom Discovery
- Built-in skills live in `src/lib/skills/builtins/`.
- Dynamic project custom skills are discovered from `.proqa/skills/` within the active project root directory.
- Expose IPC channel `load_project_skills(projectPath)` to scan and validate custom skill definitions safely via Electron main.

### 3. Store & Renderer Architecture
- Extend existing `agentStore.ts` to manage active skill IDs (`activeSkillIds: string[]`), custom registered skills, and preset packs ("Standard QA", "Form Specialist", "Data Table Deep-Dive", "Full Power").
- Active skills persist per project.
- Provide selector helpers to compile active system prompts and tool sets for AI providers.
</decisions>

<code_context>
## Existing Code Insights

- `src/stores/agentStore.ts`: Already manages selected agent model, BYOK credentials, and agent configuration.
- `electron/ipc/aiProvider.ts`: Factory creating AI providers; will consume active skill definitions.
- `src/lib/aiRegistry.ts`: Static registry of LLM providers and local CLIs; skills layer builds on top of this.
</code_context>

<specifics>
## Specific Requirements Covered

- **SKILL-01**: Declarative Skill Definition Schema with Zod validation.
- **SKILL-02**: Skills Store & Registry Engine with built-in + workspace loading in `agentStore`.
</specifics>
