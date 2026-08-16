# Phase 04 Context: Command Palette & Global Keyboard Shortcuts

## Overview
Power-user navigation & execution via global keyboard shortcuts and a spotlight-style command palette (`Ctrl+K` / `Ctrl+P`).

## Decisions
- Global keyboard event listener registered at root (`AppShell.tsx`) with input/textarea exclusions for typing, but allowing `Ctrl+*` global triggers anywhere.
- Command Palette items indexed dynamically from active project flows, open projects, studio actions (Run Flow, Pause, Mine DOM, Batch Mine, Toggle Record, Toggle Inspect, YAML Editor, AI Copilot), and modal triggers (Settings, Projects Manager, Docs, Cheatsheet).
- WAI-ARIA combobox pattern: `role="combobox"`, `aria-expanded="true"`, `aria-autocomplete="list"`, `aria-activedescendant`.
- All text strings extracted to `src/a11y/en.json` under `palette` and `shortcuts`.
- Keyboard cheatsheet modal (`?` or `Ctrl+/`) showing categorized shortcut matrix.
