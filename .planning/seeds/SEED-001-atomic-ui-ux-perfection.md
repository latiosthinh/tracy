---
id: SEED-001
status: dormant
planted: 2026-08-16
planted_during: Milestone 1.0 (Phase 03)
trigger_when: when focusing on UI/UX polish, keyboard shortcuts, or advanced studio authoring workflows
scope: Large
---

# SEED-001: Atomic UI/UX Perfection & Advanced Studio Workflows

## Why This Matters

ProQA is a developer-centric desktop IDE for E2E web automation. A great IDE requires sub-second tactile responsiveness, comprehensive keyboard shortcuts, seamless multi-view layouts, and pixel-perfect atomic consistency. While the core architecture (Playwright execution, per-project browser isolation, AI copilot, a11y dictionary) is solid, investing in atomic UI/UX perfection elevates ProQA from a functional testing tool to an indispensable, delightful desktop workstation.

## When to Surface

**Trigger:** When starting a milestone focused on UX polish, power-user keyboard mastery, or visual authoring enhancements.

Surface this seed during `/gsd-new-milestone` when:
- Designing Milestone 2.0 or a dedicated UX Polish milestone
- Implementing global keyboard shortcut maps (`Ctrl+P` command palette, `Ctrl+1..9` tab switching)
- Adding diffing, visual step duplication, or multi-split studio layouts
- Enhancing report export with standalone HTML/trace viewer bundles

## Scope Estimate

**Large** — Multi-phase milestone covering:
1. **Global Keyboard & Command Palette (`Ctrl+K` / `Ctrl+P`)**:
   - Quick file switcher, project jumper, test runner triggers, and action search without touching the mouse.
   - Tab switching shortcuts (`Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+1..9`).
2. **Studio Layout & Viewport Versatility**:
   - Horizontal vs. Vertical split toggle (ideal for widescreen monitors vs. tall mobile test recording).
   - Embedded device bezel frames (iPhone, iPad, Pixel mockups with realistic dimensions and touch simulation indicators).
   - Dark/light mode preview toggle for the embedded webview page.
3. **YAML & Visual Step Editor Enhancements**:
   - Side-by-side YAML Diff View against last execution or git commit.
   - Multi-step selection, bulk delete, step duplication (`Alt+Drag` / `Ctrl+D`), and step grouping.
   - One-click "Copy as Playwright TypeScript" code generator button.
4. **AI Copilot Presets & Prompt Memory**:
   - Prompt library with one-click QA recipes ("Test all form validations", "Generate edge-case checkout assertions", "Audit a11y roles on page").
   - Side-by-side YAML diff preview before applying AI-generated flows.
   - Live token generation speed counter and token usage metrics.
5. **Interactive Report & Flamechart Export**:
   - Self-contained single-file HTML report export with embedded step screenshots and timeline breakdown.
   - Step latency flamechart highlighting slow network requests or selector bottlenecks.

## Breadcrumbs

Key files and design references in the codebase:
- `src/components/layout/AppShell.tsx` — Root layout and global modal orchestrator
- `src/components/layout/Header.tsx` — Project and Flow tab bars
- `src/components/studio/StudioView.tsx` — Split view, draggable divider, and viewport controller
- `src/components/studio/StudioToolbar.tsx` — Browser navigation, recording, inspect, and DOM miner triggers
- `src/components/editor/YamlEditor.tsx` — Autocomplete, YAML syntax highlighter, and editor controls
- `src/components/editor/VisualStepEditor.tsx` — Drag-and-drop step blocks and action parameter chips
- `src/components/ai/AiCopilot.tsx` — AI test synthesizer and provider switchboard
- `src/components/settings/UiSettingsPanel.tsx` — Theme CSS variable customizer and font configurations
- `src/components/ui/` (`Button.tsx`, `Input.tsx`, `Modal.tsx`, `IconButton.tsx`) — Atomic design tokens

## Notes

- ProQA's visual identity (vintage amber and roasted stone `#0c0a09` / `#d97706`) is fully established with 6px rounded corners.
- All user-facing strings are already extracted to `src/a11y/en.json` — all new UI additions must use `useTranslation()`.
- WAI-ARIA modal semantics, focus traps, and navigation guards are in place.
