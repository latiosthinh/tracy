# Phase 11 Plan 01: Canonical QA Tools & Multi-Provider Translators Summary

Canonical QA tool schemas (`validate_selector`, `find_elements_by_text`, `inspect_element`) and protocol translators for Google GenAI, OpenAI, and Anthropic implemented in `electron/ipc/aiProvider.ts`.

## Key Implementations

1. **Tool Parameter Type Contracts (`src/types/skills.ts`)**:
   - `AgentToolCall`: Tool invocation details (name, arguments, id).
   - `AgentToolResult`: Output results, match counts, diagnostic details, error messages.
   - `AgentToolTraceEvent`: Trace event structure with turn count, thought string, tool call, tool result, and timestamp.

2. **Canonical QA Tool Definitions (`electron/ipc/aiProvider.ts`)**:
   - `QA_AGENT_TOOLS`: Canonical definitions for `validate_selector`, `find_elements_by_text`, and `inspect_element`.
   - `sanitizeToolArguments`: Bounds input selectors (<=1000 chars), sanitizes expected tag names (alphanumeric only), and clamps text lengths.

3. **Protocol Translators & Response Parsers**:
   - `formatToolsForGoogle`: Converts `ToolDefinition[]` to Google GenAI `FunctionDeclaration[]` with uppercase `OBJECT`, `STRING`, etc.
   - `formatToolsForOpenAi`: Converts `ToolDefinition[]` to OpenAI `tools: [{ type: 'function', function: { name, description, parameters } }]`.
   - `formatToolsForAnthropic`: Converts `ToolDefinition[]` to Anthropic `tools: [{ name, description, input_schema }]`.
   - `parseGoogleToolCalls`, `parseOpenAiToolCalls`, `parseAnthropicToolCalls`: Extracts tool calls from respective provider responses.
   - `formatGoogleToolResult`, `formatOpenAiToolResult`, `formatAnthropicToolResult`: Formats tool outputs into turn history with automatic secret redaction.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm lint`: Passed (ESLint 0 warnings, TypeScript noEmit clean).
- `pnpm test electron/aiProvider.test.ts`: Passed (20/20 unit tests).
- `pnpm test`: Passed (34 test files, 403 tests).

## Self-Check: PASSED
