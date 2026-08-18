# Phase 07 Context: AI Copilot QA Recipes & Diff Preview

## Overview
Power up AI flow synthesis with one-click QA recipe prompt presets, visual diff inspection before applying AI steps, and live token generation telemetry.

## Decisions
- QA Recipe Presets: pre-engineered prompt templates (Form Validation, Navigation & Responsive, Accessibility Audit, Auth & Error Edge Cases, Complete Checkout Journey) available as clickable chips above the prompt input.
- AI Diff Preview: when AI finishes generating YAML, rather than immediately overwriting or applying, open `AiDiffPreviewModal.tsx` comparing active flow vs generated YAML with "Replace Active Flow", "Append Steps to End", or "Cancel".
- Live Telemetry: track stream chunks in `AiCopilot.tsx` computing elapsed time, token count (approx word/character ratio), and speed (tokens/sec).
- All strings extracted to `src/a11y/en.json` under `copilot.recipes`, `copilot.diff`, `copilot.telemetry`.
