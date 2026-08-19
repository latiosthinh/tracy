# Phase 14: Flow Accuracy Benchmark & Evaluation Suite - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** Smart Discuss (v3.0 Milestone)

<domain>
## Phase Boundary

Measure and guard flow generation precision and stability against deterministic HTML fixtures and ground-truth flows. Fulfills requirements EVAL-01 and EVAL-02.
</domain>

<decisions>
## Implementation Decisions

### 1. Deterministic HTML Test Fixtures
- Create static mock HTML scenarios in `src/test/fixtures/eval/`:
  - `auth-flow.html`: Login, MFA split code inputs, cookie consent banner.
  - `complex-form.html`: Custom select dropdown, datepicker, client-side validation errors (`aria-invalid`).
  - `data-table.html`: Paginated table, row action buttons, column sorting.
  - `modal-shadow.html`: Open shadow root custom elements, animated backdrop modal.
- Create canonical ground-truth reference YAML flows for each scenario in `src/test/fixtures/eval/ground-truth/`.

### 2. Automated Accuracy & Stability Benchmark Runner
- Implement `src/lib/eval/benchmarkRunner.ts`:
  - Evaluates generated flow YAML against ground-truth and fixture DOM.
  - Metrics computed:
    - **Locator Precision**: % of selectors that match exactly 1 visible element in the fixture DOM.
    - **Step Recall**: % of required functional actions captured from ground-truth.
    - **Flow Pass Rate**: End-to-end executable validity against the fixture DOM.
  - Outputs structured benchmark scorecards.
- Add Vitest test suite in `src/lib/eval/benchmarkRunner.test.ts`.
</decisions>

<code_context>
## Existing Code Insights

- `src/utils/domMiner.ts`: Compresses DOM into syntax trees.
- `src/utils/flowUtils.ts`: Parses and formats YAML test flows.
- `src/utils/selectorScorer.ts`: Scores selector stability and classification.
</code_context>

<specifics>
## Specific Requirements Covered

- **EVAL-01**: Deterministic Test Fixture Suite.
- **EVAL-02**: Automated Flow Accuracy & Stability Benchmark.
</specifics>
