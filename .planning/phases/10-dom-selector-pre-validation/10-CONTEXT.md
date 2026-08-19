# Phase 10: Live DOM Selector Pre-Validation Engine - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** Smart Discuss (v3.0 Milestone)

<domain>
## Phase Boundary

Enable real-time probing of CSS, XPath, Text, and ARIA selectors directly against live embedded webviews in isolated context. Fulfills requirements VERIFY-01 and VERIFY-02.
</domain>

<decisions>
## Implementation Decisions

### 1. Isolated-World Probing
- Implement `validate_dom_selector` IPC handler in `electron/ipc/webviewManager.ts`.
- Execute probe scripts inside `WebContentsView` using `webContents.executeJavaScript` with `worldId: 999` (or isolated world function evaluation).
- Script queries selector and returns: `matchCount`, `visibleCount`, `tagName`, `textPreview`, `boundingBox` (`{x, y, width, height}`), `isClickable`, `isInShadowRoot`.
- Parameterized execution — input selectors sanitized to prevent script breakout.

### 2. Resilience Scoring & Ambiguity Tagging
- Implement `src/utils/selectorScorer.ts` to classify locators into:
  - `UniquePresent`: matchCount === 1 and visible.
  - `AmbiguousMultiple`: matchCount > 1.
  - `NotPresent`: matchCount === 0.
  - `DeferredDynamic`: flagged when selector is targeted after a modal/menu step.
- Compute stability rank hierarchy: Data-testid (`100`) > Role+Name / ARIA (`85`) > Visible Text (`70`) > ID/Class (`50`) > Deep XPath (`20`).
</decisions>

<code_context>
## Existing Code Insights

- `electron/ipc/webviewManager.ts`: Stores `activeWebviews: Map<string, WebContentsView>`. Already handles layout and navigation.
- `src/lib/ipc.ts`: Exposes frontend API for webview operations.
</code_context>

<specifics>
## Specific Requirements Covered

- **VERIFY-01**: Isolated-World Webview Selector Prober.
- **VERIFY-02**: Selector Robustness & Ambiguity Tagging.
</specifics>
