---
phase: 07-ai-recipes-and-diff-preview
plan: 03
subsystem: ai-copilot
tags:
  - copilot
  - telemetry
  - tokens-per-second
  - i18n
requires:
  - 07-01
  - 07-02
provides:
  - live-generation-telemetry
  - token-speed-chip
affects:
  - src/components/ai/AiCopilot.tsx
  - src/a11y/en.json
tech-stack:
  added: []
  patterns:
    - live-telemetry-calculation
    - token-estimation-formula
key-files:
  created: []
  modified:
    - src/components/ai/AiCopilot.tsx
    - src/components/ai/AiCopilot.test.tsx
    - src/a11y/en.json
decisions:
  - "Calculate estimated token count via standard ~4 chars/token heuristic during streaming and on completion"
  - "Display live tokens/sec speed and elapsed duration in streaming box header with Gauge icon"
metrics:
  duration: 4m
  completed: 2026-08-16
---

# Phase 07 Plan 03: Live Generation Telemetry Summary

Live token generation speed, token count, and elapsed latency metrics in AiCopilot.

## Key Changes

1. **Generation Telemetry State & Calculation (`AiCopilot.tsx`)**:
   - Track `generationStartTime`, `generationDuration`, `tokenCount`, and `tokenSpeed` (t/s).
   - Dynamically compute streaming telemetry as incoming stream chunks arrive via `onAgentStreamChunk`.
   - Update final duration and speed upon stream/generation completion.

2. **Telemetry Chip UI (`AiCopilot.tsx`)**:
   - Render telemetry badge with `Gauge` icon inside generated/streaming YAML box header.
   - Distinct live stats vs completed stats presentation.

3. **Internationalization & A11y (`en.json`)**:
   - Added `copilot.telemetry.*` translation strings for speed, tokens, duration, and formatted stats.

4. **Testing (`AiCopilot.test.tsx`)**:
   - Added unit test asserting presence of telemetry chip and token metrics on generation.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
