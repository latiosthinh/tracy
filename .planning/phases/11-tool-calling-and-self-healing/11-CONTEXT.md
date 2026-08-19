# Phase 11: Multi-Provider Tool Calling & Self-Healing Loop - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** Smart Discuss (v3.0 Milestone)

<domain>
## Phase Boundary

Connect LLM providers (Google GenAI, OpenAI-compat, Anthropic, CLI) to live DOM verification tools with automatic selector self-correction and loop guards. Fulfills requirements TOOL-01 and TOOL-02.
</domain>

<decisions>
## Implementation Decisions

### 1. Multi-Provider Tool Calling Bridge
- Update `electron/ipc/aiProvider.ts` to support tool schemas and multi-turn tool calling.
- Core exposed tools:
  - `validate_selector(selector, expectedTag, targetText)`: Invokes webview probe on active project webview.
  - `find_elements_by_text(text)`: Searches for visible text and returns suggested robust locators.
- Format tool definitions for Google GenAI (`functionDeclarations`), Anthropic (`tools`), and OpenAI (`tools: [{type: 'function'}]`).

### 2. Bounded Self-Correction & Loop Guards
- Implement `executeAgentToolLoop` in `electron/ipc/aiProvider.ts`.
- Set maximum turn limit to `5` iterations.
- If selector probe returns `matchCount: 0` or `AmbiguousMultiple`, return diagnostic payload so LLM repairs selector.
- Emits real-time reasoning traces via IPC event `agent_tool_trace` (`{ turn, thought, toolCall, toolResult, timestamp }`).
- Fallback for stdin local CLI agents: append tool results to conversation turns or instruct CLI via system prompt.
</decisions>

<code_context>
## Existing Code Insights

- `electron/ipc/aiProvider.ts`: Factory creating provider instances for Google GenAI, OpenAI, Anthropic, Cursor.
- `electron/ipc/webviewManager.ts`: Exports `validateDomSelector(projectId, selector, options)`.
- `electron/preload.ts`: Whitelist channels for streaming traces (`agent_tool_trace`).
</code_context>

<specifics>
## Specific Requirements Covered

- **TOOL-01**: Multi-Provider Tool Calling Abstraction.
- **TOOL-02**: Bounded Self-Correction & Loop Guard.
</specifics>
