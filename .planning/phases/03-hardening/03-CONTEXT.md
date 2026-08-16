# Phase 03 Context: Post-Audit Hardening

## Overview
Comprehensive remediation of findings from the full codebase audit. Organized into 3 serial waves:
1. Wave 1 (Security): Command injection, path traversal, navigation jail, URL allowlists, fetch timeouts.
2. Wave 2 (Correctness): Auto-save wiring, listener dedupe, web-mode IPC guards, require fix, real Modal focus trap, pause generation token.
3. Wave 3 (CI & A11y Integrity): Strict ESLint restoration, comprehensive a11y guard test, remaining string extraction (~59 strings), en.json dedupe, typed `t()` keys.

## Decisions
- Serial execution to prevent file merge conflicts in `electron/ipc/playwrightEngine.ts` and `src/components/studio/`.
- Single source of truth for `defaultSaveLocation` in persisted `uiStore`.
- Strict ESLint gate with `--max-warnings 0` reinstated in CI.
- All URL-accepting IPC handlers must validate with standard `isAllowedNavigationUrl` allowlist.
