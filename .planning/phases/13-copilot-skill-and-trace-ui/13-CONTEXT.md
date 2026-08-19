# Phase 13: Copilot Skill Selector & Trace Inspector UI - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** Smart Discuss (v3.0 Milestone)

<domain>
## Phase Boundary

Allow QA engineers to toggle active domain skills, select skill presets, and inspect real-time agent thoughts, tool calls, and selector checks in AI Copilot. Fulfills requirements UI-01 and UI-02.
</domain>

<decisions>
## Implementation Decisions

### 1. Skill Selector & Preset Bar
- Implement `SkillSelector.tsx` in `src/components/ai/`:
  - Renders skill toggle pills with category badges and tooltip descriptions.
  - Preset dropdown: "Standard QA", "Form Specialist", "Data Table Deep-Dive", "Full Power".
  - Connects directly to `agentStore`'s `activeSkillIds`, `toggleSkill`, and `applySkillPreset`.

### 2. Live Reasoning Trace Inspector
- Implement `TraceInspector.tsx` in `src/components/ai/`:
  - Collapsible accordion in `AiCopilot.tsx` showing real-time agent tool events (subscribed via `tracyApi.onAgentToolTrace`).
  - Displays turn number, thought bubble, tool badge (`validate_selector`, `find_elements_by_text`), arguments, status (match count / success), and duration.
  - Automatically redacts passwords, bearer tokens, and secrets in JSON payloads.
  - Fully accessible with ARIA live regions and keyboard controls.
  - User strings registered in `src/a11y/en.json`.
</decisions>

<code_context>
## Existing Code Insights

- `src/components/ai/AiCopilot.tsx`: Main copilot component; contains prompt input, QA presets, diff preview modal, and telemetry chips.
- `src/stores/agentStore.ts`: Already contains `activeSkillIds`, `toggleSkill`, and `applySkillPreset`.
- `src/lib/ipc.ts`: Provides `onAgentToolTrace(callback)`.
</code_context>

<specifics>
## Specific Requirements Covered

- **UI-01**: Copilot Skill Selector & Preset Badges.
- **UI-02**: Live Reasoning Trace Inspector.
</specifics>
