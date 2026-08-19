import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  evaluateFlowAgainstFixture,
  runBenchmarkSuite,
  formatBenchmarkMarkdownReport,
  parseFlowYamlSteps,
  queryFixtureDom,
  BenchmarkEvaluationTask,
} from './benchmarkRunner';
import { JSDOM } from 'jsdom';

describe('benchmarkRunner', () => {
  const fixturesDir = path.resolve(__dirname, '../../test/fixtures/eval');
  const groundTruthDir = path.resolve(fixturesDir, 'ground-truth');

  const authHtml = fs.readFileSync(path.join(fixturesDir, 'auth-flow.html'), 'utf-8');
  const authYaml = fs.readFileSync(path.join(groundTruthDir, 'auth-flow.yaml'), 'utf-8');
  const formHtml = fs.readFileSync(path.join(fixturesDir, 'complex-form.html'), 'utf-8');
  const formYaml = fs.readFileSync(path.join(groundTruthDir, 'complex-form.yaml'), 'utf-8');
  const tableHtml = fs.readFileSync(path.join(fixturesDir, 'data-table.html'), 'utf-8');
  const tableYaml = fs.readFileSync(path.join(groundTruthDir, 'data-table.yaml'), 'utf-8');
  const modalHtml = fs.readFileSync(path.join(fixturesDir, 'modal-shadow.html'), 'utf-8');
  const modalYaml = fs.readFileSync(path.join(groundTruthDir, 'modal-shadow.yaml'), 'utf-8');

  describe('Single flow evaluation', () => {
    it('evaluates perfect ground truth against fixture with 100% precision, recall, and pass rate', () => {
      const result = evaluateFlowAgainstFixture(authYaml, authYaml, authHtml);

      expect(result.validYaml).toBe(true);
      expect(result.locatorPrecision).toBe(100);
      expect(result.stepRecall).toBe(100);
      expect(result.flowPassRate).toBe(100);
      expect(result.resilienceScore).toBeGreaterThanOrEqual(70);
      expect(result.tierDistribution.TestId).toBeGreaterThan(0);
      expect(result.stepResults.length).toBeGreaterThan(0);
    });

    it('handles empty or malformed candidate YAML safely without throwing', () => {
      const emptyResult = evaluateFlowAgainstFixture('', authYaml, authHtml);
      expect(emptyResult.validYaml).toBe(false);
      expect(emptyResult.flowPassRate).toBe(0);
      expect(emptyResult.stepRecall).toBe(0);
      expect(emptyResult.locatorPrecision).toBe(0);

      const malformedResult = evaluateFlowAgainstFixture(':::invalid: yaml: [', authYaml, authHtml);
      expect(malformedResult.validYaml).toBe(false);
      expect(malformedResult.flowPassRate).toBe(0);
      expect(malformedResult.errors.length).toBeGreaterThan(0);
    });

    it('calculates precision penalties for missing, invalid, or ambiguous selectors', () => {
      const candidateYaml = `
# Partial Candidate Flow
---
- leftClick:
    selector: 'button[data-testid="accept-cookies"]'
- fill:
    selector: 'input[data-testid="non-existent-input"]'
    text: "test"
- leftClick:
    selector: 'button' # Ambiguous selector matching multiple buttons
`;

      const result = evaluateFlowAgainstFixture(candidateYaml, authYaml, authHtml);
      expect(result.validYaml).toBe(true);
      expect(result.stepResults.length).toBe(3);

      // Step 1: unique -> precision match
      // Step 2: not found -> 0 match
      // Step 3: ambiguous -> >1 matches
      expect(result.locatorPrecision).toBeCloseTo(33.33, 1);
      expect(result.flowPassRate).toBe(0); // Fails due to unresolved/ambiguous steps
    });

    it('handles candidate flows with missing functional steps (calculates partial recall)', () => {
      const partialCandidate = `
---
- leftClick:
    selector: 'button[data-testid="accept-cookies"]'
- fill:
    selector: 'input[name="email"]'
    text: "user@example.com"
`;

      const result = evaluateFlowAgainstFixture(partialCandidate, authYaml, authHtml);
      expect(result.validYaml).toBe(true);
      expect(result.locatorPrecision).toBe(100);
      expect(result.matchedGroundTruthStepsCount).toBe(2);
      expect(result.stepRecall).toBeLessThan(100);
      expect(result.flowPassRate).toBe(0); // Incomplete flow does not achieve 100% pass rate
    });

    it('computes resilience tier distribution across various selector formats', () => {
      const mixedCandidate = `
---
- leftClick:
    selector: 'button[data-testid="accept-cookies"]' # TestId
- leftClick:
    selector: 'role=button' # AriaRole
- leftClick:
    selector: 'text=Cookie Preferences' # VisibleText
- leftClick:
    selector: '.cookie-notice > div > span' # StandardCss
- leftClick:
    selector: '//html/body/div[1]/div[2]/button' # DeepXPath
`;

      const result = evaluateFlowAgainstFixture(mixedCandidate, authYaml, authHtml);
      expect(result.tierDistribution.TestId).toBe(1);
      expect(result.tierDistribution.AriaRole).toBe(1);
      expect(result.tierDistribution.VisibleText).toBe(1);
      expect(result.tierDistribution.StandardCss).toBe(1);
      expect(result.tierDistribution.DeepXPath).toBe(1);
    });

    it('handles steps without selectors (navigate, wait, press) gracefully', () => {
      const noSelectorYaml = `
---
- navigate: "http://localhost:3000/auth-flow.html"
- press: "Enter"
- waitFor: 500
`;
      const result = evaluateFlowAgainstFixture(noSelectorYaml, noSelectorYaml, authHtml);
      expect(result.validYaml).toBe(true);
      expect(result.locatorPrecision).toBe(100);
      expect(result.resilienceScore).toBe(100);
      expect(result.flowPassRate).toBe(100);
    });
  });

  describe('queryFixtureDom utility', () => {
    const dom = new JSDOM(authHtml);

    it('supports css queries', () => {
      const res = queryFixtureDom(dom.window.document, '#login-form');
      expect(res.valid).toBe(true);
      expect(res.matchCount).toBe(1);
      expect(res.matches[0].id).toBe('login-form');
    });

    it('supports text= queries', () => {
      const res = queryFixtureDom(dom.window.document, 'text=Accept All Cookies');
      expect(res.valid).toBe(true);
      expect(res.matchCount).toBeGreaterThanOrEqual(1);
    });

    it('supports xpath queries', () => {
      const res = queryFixtureDom(dom.window.document, '//input[@name="email"]');
      expect(res.valid).toBe(true);
      expect(res.matchCount).toBe(1);
    });

    it('supports role= queries', () => {
      const res = queryFixtureDom(dom.window.document, 'role=dialog');
      expect(res.valid).toBe(true);
    });

    it('handles invalid css syntax safely without crashing', () => {
      const res = queryFixtureDom(dom.window.document, 'div[[[invalid:::selector');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('parseFlowYamlSteps utility', () => {
    it('handles single doc with array', () => {
      const parsed = parseFlowYamlSteps(`
- leftClick: "#btn"
- fill: "sample text"
  selector: "#input"
`);
      expect(parsed.valid).toBe(true);
      expect(parsed.steps.length).toBe(2);
      expect(parsed.steps[0].command).toBe('leftClick');
      expect(parsed.steps[0].selector).toBe('#btn');
      expect(parsed.steps[1].text).toBe('sample text');
      expect(parsed.steps[1].selector).toBe('#input');
    });

    it('handles document with steps property', () => {
      const parsed = parseFlowYamlSteps(`
url: "http://example.com"
steps:
  - leftClick: "#btn"
`);
      expect(parsed.valid).toBe(true);
      expect(parsed.steps.length).toBe(1);
      expect(parsed.steps[0].command).toBe('leftClick');
    });
  });

  describe('Full Benchmark Suite and Report Generation', () => {
    it('runs full benchmark suite across all 4 canonical scenarios and produces markdown report', () => {
      const tasks: BenchmarkEvaluationTask[] = [
        {
          scenarioName: 'auth-flow',
          modelId: 'gemini-2.5-pro',
          candidateYaml: authYaml,
          groundTruthYaml: authYaml,
          htmlFixture: authHtml,
        },
        {
          scenarioName: 'complex-form',
          modelId: 'gemini-2.5-pro',
          candidateYaml: formYaml,
          groundTruthYaml: formYaml,
          htmlFixture: formHtml,
        },
        {
          scenarioName: 'data-table',
          modelId: 'gemini-2.5-pro',
          candidateYaml: tableYaml,
          groundTruthYaml: tableYaml,
          htmlFixture: tableHtml,
        },
        {
          scenarioName: 'modal-shadow',
          modelId: 'gemini-2.5-pro',
          candidateYaml: modalYaml,
          groundTruthYaml: modalYaml,
          htmlFixture: modalHtml,
        },
      ];

      const suiteResult = runBenchmarkSuite(tasks);

      expect(suiteResult.totalScenarios).toBe(4);
      expect(suiteResult.scenarioResults.length).toBe(4);
      expect(suiteResult.overallPrecision).toBe(100);
      expect(suiteResult.overallRecall).toBe(100);
      expect(suiteResult.overallPassRate).toBe(100);
      expect(suiteResult.overallResilience).toBeGreaterThanOrEqual(70);

      // Verify tier distribution counts
      expect(suiteResult.tierDistribution.TestId).toBeGreaterThan(0);

      const markdown = formatBenchmarkMarkdownReport(suiteResult);
      expect(markdown).toContain('# Flow Accuracy & Stability Benchmark Report');
      expect(markdown).toContain('auth-flow');
      expect(markdown).toContain('complex-form');
      expect(markdown).toContain('data-table');
      expect(markdown).toContain('modal-shadow');
      expect(markdown).toContain('gemini-2.5-pro');
      expect(markdown).toContain('✅ PASS');
    });
  });
});
