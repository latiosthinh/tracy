# Phase 15 Plan 01: Heuristic Scorer & Semantic Invariants Summary

Deterministic local heuristic candidate ranking engine and semantic invariant guardrails for runtime Playwright step self-healing.

## Key Changes

- **Types (`electron/core/healing/types.ts`)**:
  - Defined `HealableStep`, `DOMCandidateElement`, `FailedStepContext`, `HeuristicScoreResult`, `HealingResult`.
  - Set `HEAL_CONFIDENCE_THRESHOLD = 0.75`.
- **Semantic Invariants (`electron/core/healing/semanticInvariants.ts`)**:
  - `isHealableStep`: Strictly rejects assertion/expectation steps (`assert`, `expect`, `expectVisible`, etc.) from healing to prevent test mutations.
  - `ACTION_VERB_OPPOSITES`: Comprehensive mapping of opposing action intents (Save vs Cancel/Delete, Submit vs Reset, Login vs Logout, Next vs Prev).
  - `validateSemanticInvariants`: Rejects candidate elements with opposing action verbs, incompatible interactive roles, or destructive verbs on benign steps.
- **Heuristic Candidate Scorer (`electron/core/healing/heuristicScorer.ts`)**:
  - `calculateCandidateScore`: Multi-attribute weighted algorithm (testId: 0.35, aria-label: 0.25, text: 0.20, role/tag: 0.10, proximity: 0.10) with Dice coefficient similarity.
  - `rankHeuristicCandidates`: Ranks live DOM candidates descending by confidence score and assigns 0.0 to candidates failing semantic invariants.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm test electron/core/healing`: 10/10 unit tests passed.
- `pnpm lint`: ESLint zero warnings, TypeScript typecheck passed.
- `pnpm test`: 42 test suites, 462 tests passed.

## Self-Check: PASSED
