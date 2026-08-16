# Phase 06 Context: Editor Polish, YAML Diffing & Playwright TS Exporter

## Overview
Authoring productivity suite: visual side-by-side YAML diffing, multi-step selection/duplication in the visual builder, and automated conversion of YAML flows to idiomatic Playwright TypeScript specs (`.spec.ts`).

## Decisions
- YAML Diffing: line-by-line diff computation (additions in green, removals in red, unchanged in stone) in `src/utils/diffUtils.ts` without external heavy dependencies. Modal dialog `YamlDiffModal.tsx` compares current editor YAML against saved on-disk baseline or original flow YAML.
- Visual Step Editor: support multi-selection (click with Shift/Ctrl), step duplication action (`duplicateStep(flowId, stepIndex)` / `Ctrl+D`), and step cloning.
- Playwright TS Exporter: `src/utils/playwrightExporter.ts` converts Tracy YAML steps (`navigate`, `click`, `fill`, `hover`, `press`, `scroll`, `waitFor`, `assertVisible`, `assertText`, `assertTitle`, `assertUrl`, `screenshot`) into idiomatic `@playwright/test` TypeScript test suites with `test.describe` and `test()`.
- Export modal & toolbar trigger in editor header (`Code` / `Download` icons).
- All strings extracted to `src/a11y/en.json` under `editor` and `diff`.
