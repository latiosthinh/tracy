---
phase: 02-a11y-and-text-extraction
plan: 01
subsystem: a11y-i18n
tags: [a11y, i18n, eslint, modal]
requires: []
provides:
  - eslint-jsx-a11y-config
  - useTranslation-interpolation
  - en-json-domain-hierarchy
  - a11y-hardened-modal
affects:
  - src/hooks/useTranslation.ts
  - src/components/ui/Modal.tsx
  - src/a11y/en.json
  - eslint.config.mjs
tech-stack:
  added:
    - eslint-plugin-jsx-a11y
    - "@babel/eslint-parser"
  patterns:
    - "{param} string interpolation in useTranslation"
    - "WAI-ARIA modal dialog focus trap and Escape handler"
key-files:
  created:
    - src/hooks/useTranslation.test.ts
  modified:
    - package.json
    - eslint.config.mjs
    - src/a11y/en.json
    - src/hooks/useTranslation.ts
    - src/components/ui/Modal.tsx
decisions:
  - "Configured jsx-a11y lint rules with babel parser for TSX support while TypeScript 7.0 parser compatibility is pending."
metrics:
  duration: 4m
  completed_date: "2026-08-15"
---

# Phase 02 Plan 01: Core A11y & i18n Foundation Summary

String interpolation in useTranslation, full en.json domain hierarchy, eslint-plugin-jsx-a11y config, and a11y-hardened modal dialog with focus trap.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Install eslint-plugin-jsx-a11y and configure ESLint | 6766b22 | package.json, pnpm-lock.yaml, eslint.config.mjs |
| 2 | Upgrade useTranslation hook with interpolation and unit tests | 218fe98 (test RED), 81f4cf8 (feat GREEN) | src/hooks/useTranslation.ts, src/hooks/useTranslation.test.ts, src/a11y/en.json |
| 3 | A11y-harden shared Modal container | 4836d38 | src/components/ui/Modal.tsx, src/hooks/useTranslation.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Configured babel-eslint parser for jsx-a11y on TypeScript 7.0**
- **Found during:** Task 1
- **Issue:** `@typescript-eslint/parser` does not yet support TypeScript 7.0.x installed in repo.
- **Fix:** Added `@babel/eslint-parser` with React and TypeScript presets to enable jsx-a11y linting in `eslint.config.mjs`.
- **Files modified:** `eslint.config.mjs`, `package.json`, `pnpm-lock.yaml`
- **Commit:** 6766b22

## Self-Check: PASSED
- `src/hooks/useTranslation.ts` exists and tested
- `src/hooks/useTranslation.test.ts` exists and passing
- `src/components/ui/Modal.tsx` contains `aria-modal="true"`, focus trap, and Escape handler
- Commits `6766b22`, `218fe98`, `81f4cf8`, `4836d38` verified in git history
