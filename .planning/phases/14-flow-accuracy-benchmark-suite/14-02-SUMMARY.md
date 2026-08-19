---
phase: 14-flow-accuracy-benchmark-suite
plan: 02
subsystem: evaluation-and-benchmarking
tags:
  - evaluation
  - benchmarking
  - metrics
  - test-accuracy
  - selector-resilience
dependency_graph:
  requires:
    - 14-01
  provides:
    - benchmarkRunner
    - evaluateFlowAgainstFixture
    - runBenchmarkSuite
    - formatBenchmarkMarkdownReport
  affects:
    - evaluation-reports
    - agent-benchmarking
tech_stack:
  added: []
  patterns:
    - DOM fixture simulation with JSDOM
    - Safe YAML schema parsing (js-yaml)
    - Selector resilience hierarchy integration
    - Multi-scenario metric aggregation and markdown reporting
key_files:
  created:
    - src/lib/eval/benchmarkRunner.ts
    - src/lib/eval/benchmarkRunner.test.ts
  modified: []
decisions:
  - Implemented safe YAML parsing with JSON_SCHEMA and exception handling to prevent DoS from malformed candidate flows.
  - Added multi-mode selector query matching (CSS, XPath, Text, and AriaRole) with Shadow DOM penetration for fixture verification.
  - Implemented complete metric matrix: Locator Precision, Step Recall, Flow Pass Rate, Resilience Score, and Tier Breakdown.
metrics:
  duration: 5m
  completed_date: "2026-08-19"
  task_count: 2
  file_count: 2
---

# Phase 14 Plan 02: Flow Accuracy & Stability Benchmark Runner Summary

Implemented automated benchmark scoring engine and comparison report generator for evaluating generated YAML test flows against ground-truth references and DOM fixtures.

## Key Changes

1. **Benchmark Runner (`src/lib/eval/benchmarkRunner.ts`)**:
   - `evaluateFlowAgainstFixture`: Evaluates candidate YAML against ground-truth flows and HTML fixture DOMs. Calculates locator precision (% of unique matches), step recall (% of matched ground-truth actions), resilience score (0-100), and flow pass rate.
   - `runBenchmarkSuite`: Runs batch evaluations across multiple test scenarios (Auth, Forms, Data Table, Modal/Shadow DOM) and computes aggregated summary metrics.
   - `formatBenchmarkMarkdownReport`: Formats suite benchmark metrics into clean Markdown summary comparison tables.
   - `queryFixtureDom` & `parseFlowYamlSteps`: Safe parsing and multi-mode DOM query engine covering CSS, XPath, `text=`, and `role=`.

2. **Test Suite (`src/lib/eval/benchmarkRunner.test.ts`)**:
   - 14 tests verifying precision calculations, recall calculations, ambiguous/missing selector penalties, resilience tier distributions, empty/malformed YAML handling, and multi-scenario suite reports.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm lint` passed with 0 errors / 0 warnings.
- `pnpm test src/lib/eval/benchmarkRunner.test.ts` passed 14/14 tests.
- Full test suite `pnpm test` passed 448/448 tests.

## Self-Check: PASSED
- `src/lib/eval/benchmarkRunner.ts` exists and exports all required functions.
- `src/lib/eval/benchmarkRunner.test.ts` exists and passes.
- Commit `5d92b18` exists in git log.
