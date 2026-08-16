# Phase 06 Plan 03: Playwright TypeScript Exporter & Code Preview Modal Summary

**One-liner:** Implemented pure TypeScript Playwright code generator supporting all YAML actions/assertions and integrated syntax-highlighted export modal with copy/download features.

## Dependency Graph

- **Requires:** Phase 06 Plan 02 (YAML diffing & editor polish)
- **Provides:** Standalone Playwright `.spec.ts` test export functionality from any Tracy YAML flow
- **Affects:** `src/utils/playwrightExporter.ts`, `src/components/editor/PlaywrightExportModal.tsx`, `src/components/editor/YamlEditor.tsx`

## Tech Stack & Key Files

### Added
- `src/utils/playwrightExporter.ts`: Pure function converting `FlowFile` and target URL into idiomatic Playwright TypeScript specs (`test.describe`, `test.setTimeout`, locators, assertions, keyboard/mouse actions).
- `src/utils/playwrightExporter.test.ts`: Vitest test suite testing step code generation across 8 distinct categories.
- `src/components/editor/PlaywrightExportModal.tsx`: Accessible dialog previewing generated TypeScript code with line numbers, copy button, and `.spec.ts` blob download.
- `src/components/editor/PlaywrightExportModal.test.tsx`: Component tests verifying render, copy clipboard action, and spec download blob generation.

### Modified
- `src/components/editor/YamlEditor.tsx`: Added "Export Playwright Spec" button (`FileCode2` icon) to toolbar and wired up `PlaywrightExportModal`.
- `src/components/studio/StudioRightSidebar.tsx`: Passed `flow` and `targetUrl` props to `YamlEditor`.
- `src/a11y/en.json`: Added i18n keys for `exportPlaywright`, `downloadSpec`, `copiedPlaywright`, and `playwrightExportTitle`.

## Key Decisions

1. **Pure String Code Generation**: Evaluated template generation vs. AST builders; chose deterministic pure-string formatting to preserve maximum readability and zero-dependency runtime execution in browser/Electron modes.
2. **Accessible Native Modal Layering**: Leveraged existing `Modal.tsx` focus-trap/A11y architecture with custom line-numbered scrollable code viewer and blob download.

## Verification & Self-Check

- Unit tests: `pnpm test src/utils/playwrightExporter.test.ts` (8/8 passed)
- Component tests: `pnpm test src/components/editor/PlaywrightExportModal.test.tsx` (3/3 passed)
- Full suite: `pnpm lint` and `pnpm test` (23 test files, 317 tests passed)

## Self-Check: PASSED
