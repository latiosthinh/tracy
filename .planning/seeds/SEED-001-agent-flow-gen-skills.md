---
id: SEED-001
status: dormant
planted: 2026-08-19
planted_during: Milestone v2.0 (Phase 08-interactive-reports-and-flamechart)
trigger_when: Milestone: AI Flow Gen V2
scope: Large
---

# SEED-001: Build a set of skills for agent auto-generate flow accuracy

## Why This Matters

Current flow generation relies primarily on raw single-shot/stream prompt generation against compressed DOM trees (`dom-miner`). On complex web applications with rich client-side interactivity, shadow roots, dynamic tables, modals, and non-standard form controls, models can pick unstable selectors, miss intermediate wait conditions, or hallucinate interactions.

Building a dedicated agent skills framework provides:
- Modular domain skills (e.g., authentication patterns, interactive data grid navigation, iframe/shadow DOM traversal, resilient wait strategy injection).
- Step-by-step verification and self-correction tools for the agent before writing final YAML flows.
- Dramatically higher flow execution pass rates and robust selector generation matching `docs/FLOW_SCHEMA.md`.

## When to Surface

**Trigger:** Milestone: AI Flow Gen V2

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches any of these conditions:
- Initiating AI test generation quality improvements or AI Flow Gen V2
- Upgrades to `dom-miner`, element selection heuristics, or agent prompt pipelines
- Designing specialized skills/subagents for flow synthesis and verification

## Scope Estimate

**Large** — Requires:
- Skill definition architecture and runtime integration for local CLI runners and BYOK providers
- Domain-specific QA pattern libraries (form filling, table pagination, multi-step auth, drag-and-drop)
- Synthetic evaluation suite and benchmark harness measuring generated flow pass rate against sample web apps
- UI integration in Studio / AI Copilot for selecting active agent skills and inspecting skill invocations

## Breadcrumbs

Related code and decisions found in the current codebase:
- `docs/FLOW_SCHEMA.md` — Canonical schema definitions for YAML test steps and actions
- `docs/DOM_MINER.md` — DOM capture and token-optimized compression engine
- `electron/ipc/aiProvider.ts` — Multi-provider AI abstraction layer and flow generation pipelines
- `electron/ipc/cliRunner.ts` — Subprocess execution bridge for local AI agent CLIs (opencode, claude-code, codex, etc.)
- `src/components/ai/AiCopilot.tsx` — AI Copilot UI for flow generation and prompt recipes
- `src/utils/domMiner.ts` — Frontend bridge for DOM tree snapshotting and selector mining

## Notes

Captured during work following v2.0 milestone completion. When kicked off, consider creating specialized skills that agents can dynamically discover or invoke to validate CSS/XPath selectors against live `dom-miner` snapshots before emitting final YAML actions.
