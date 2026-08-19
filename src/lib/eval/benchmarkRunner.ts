import * as yaml from 'js-yaml';
import { JSDOM } from 'jsdom';
import { detectResilienceTier, scoreSelectorResilience } from '@/src/utils/selectorScorer';
import type {
  SelectorResilienceTier,
  SelectorScoreReport,
  SelectorValidationResult,
  DomElementProbeMatch,
  ProbeSelectorType,
} from '@/src/types/skills';

export interface EvaluatedStepResult {
  stepIndex: number;
  command: string;
  selector?: string;
  text?: string;
  foundInDom: boolean;
  matchCount: number;
  isUnique: boolean;
  scoreReport?: SelectorScoreReport;
  groundTruthMatched: boolean;
  error?: string;
}

export interface BenchmarkMetricResult {
  validYaml: boolean;
  totalSteps: number;
  groundTruthStepsCount: number;
  matchedGroundTruthStepsCount: number;
  locatorPrecision: number; // 0 - 100 (%)
  stepRecall: number; // 0 - 100 (%)
  resilienceScore: number; // 0 - 100 (avg score)
  flowPassRate: number; // 0 or 100 (%)
  tierDistribution: Record<SelectorResilienceTier, number>;
  stepResults: EvaluatedStepResult[];
  errors: string[];
}

export interface BenchmarkEvaluationTask {
  scenarioName: string;
  modelId?: string;
  candidateYaml: string;
  groundTruthYaml: string;
  htmlFixture: string;
}

export interface BenchmarkScenarioResult extends BenchmarkMetricResult {
  scenarioName: string;
  modelId?: string;
}

export interface BenchmarkSuiteResult {
  totalScenarios: number;
  overallPrecision: number;
  overallRecall: number;
  overallPassRate: number;
  overallResilience: number;
  tierDistribution: Record<SelectorResilienceTier, number>;
  scenarioResults: BenchmarkScenarioResult[];
  timestamp: string;
}

export interface ParsedFlowStep {
  command: string;
  selector?: string;
  text?: string;
  key?: string;
  timeout?: number;
  raw: Record<string, unknown>;
}

/**
 * Parses raw YAML flow into parsed step definitions safely.
 */
export function parseFlowYamlSteps(yamlContent: string): {
  valid: boolean;
  frontmatter: Record<string, unknown>;
  steps: ParsedFlowStep[];
  errors: string[];
} {
  if (!yamlContent || !yamlContent.trim()) {
    return {
      valid: false,
      frontmatter: {},
      steps: [],
      errors: ['YAML content cannot be empty'],
    };
  }

  try {
    const docs = yaml.loadAll(yamlContent, null, { schema: yaml.JSON_SCHEMA }) as unknown[];
    if (!docs || docs.length === 0) {
      return {
        valid: false,
        frontmatter: {},
        steps: [],
        errors: ['Empty YAML documents'],
      };
    }

    let rawFrontmatter: Record<string, unknown> = {};
    let rawSteps: unknown[] = [];

    if (docs.length === 1) {
      if (Array.isArray(docs[0])) {
        rawSteps = docs[0];
      } else if (docs[0] && typeof docs[0] === 'object') {
        const docObj = docs[0] as Record<string, unknown>;
        if (Array.isArray(docObj.steps)) {
          rawSteps = docObj.steps;
          rawFrontmatter = docObj;
        } else {
          // Single step or object
          rawSteps = [docObj];
        }
      }
    } else {
      rawFrontmatter = (docs[0] as Record<string, unknown>) || {};
      rawSteps = (docs[1] as unknown[]) || [];
    }

    if (!Array.isArray(rawSteps)) {
      return {
        valid: false,
        frontmatter: rawFrontmatter,
        steps: [],
        errors: ['Steps must be an array'],
      };
    }

    const steps: ParsedFlowStep[] = [];
    for (const item of rawSteps) {
      if (!item || typeof item !== 'object') continue;
      const stepObj = item as Record<string, unknown>;
      const command = Object.keys(stepObj)[0];
      if (!command) continue;

      const def = stepObj[command];
      let selector: string | undefined;
      let text: string | undefined;
      let key: string | undefined;
      let timeout: number | undefined;

      if (typeof def === 'string') {
        if (command === 'navigate') {
          // def is url or path
        } else if (command === 'fill') {
          text = def;
        } else if (command === 'press') {
          key = def;
        } else if (def.startsWith('#') || def.startsWith('.') || def.includes('[')) {
          selector = def;
        }
      } else if (def && typeof def === 'object') {
        const obj = def as Record<string, unknown>;
        if (typeof obj.selector === 'string') selector = obj.selector;
        if (typeof obj.text === 'string') text = obj.text;
        if (typeof obj.key === 'string') key = obj.key;
        if (typeof obj.timeout === 'number') timeout = obj.timeout;
      }

      // Also check top-level properties in stepObj (e.g. - fill: ... selector: ...)
      if (!selector && typeof stepObj.selector === 'string') selector = stepObj.selector;
      if (!text && typeof stepObj.text === 'string') text = stepObj.text;
      if (!key && typeof stepObj.key === 'string') key = stepObj.key;
      if (!timeout && typeof stepObj.timeout === 'number') timeout = stepObj.timeout;

      steps.push({
        command,
        selector,
        text,
        key,
        timeout,
        raw: stepObj,
      });
    }

    return {
      valid: true,
      frontmatter: rawFrontmatter,
      steps,
      errors: [],
    };
  } catch (err) {
    return {
      valid: false,
      frontmatter: {},
      steps: [],
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/**
 * Execute DOM selector query across fixture DOM including Shadow DOM penetration.
 */
export function queryFixtureDom(
  document: Document,
  rawSelector: string
): { valid: boolean; selectorType: ProbeSelectorType; matchCount: number; matches: Element[]; error?: string } {
  const trimmed = (rawSelector || '').trim();
  if (!trimmed) {
    return { valid: false, selectorType: 'auto', matchCount: 0, matches: [], error: 'Empty selector' };
  }

  let effectiveType: ProbeSelectorType = 'auto';
  if (trimmed.startsWith('xpath=') || trimmed.startsWith('//') || trimmed.startsWith('(//')) {
    effectiveType = 'xpath';
  } else if (trimmed.startsWith('text=')) {
    effectiveType = 'text';
  } else if (trimmed.startsWith('role=')) {
    effectiveType = 'aria';
  } else {
    effectiveType = 'css';
  }

  try {
    let elements: Element[] = [];

    if (effectiveType === 'xpath') {
      const xpathExpr = trimmed.startsWith('xpath=') ? trimmed.slice(6) : trimmed;
      const result = document.evaluate(
        xpathExpr,
        document,
        null,
        9 /* XPathResult.FIRST_ORDERED_NODE_TYPE */,
        null
      );
      // Evaluate snapshot
      const snapshot = document.evaluate(
        xpathExpr,
        document,
        null,
        7 /* XPathResult.ORDERED_NODE_SNAPSHOT_TYPE */,
        null
      );
      for (let i = 0; i < snapshot.snapshotLength; i++) {
        const node = snapshot.snapshotItem(i);
        if (node && node.nodeType === 1) {
          elements.push(node as Element);
        }
      }
      if (elements.length === 0 && result.singleNodeValue && result.singleNodeValue.nodeType === 1) {
        elements.push(result.singleNodeValue as Element);
      }
    } else if (effectiveType === 'text') {
      const targetText = trimmed.slice(5).trim().toLowerCase();
      const allEls = Array.from(document.querySelectorAll('*'));
      for (const el of allEls) {
        const text = (el.textContent || '').trim().toLowerCase();
        if (text.includes(targetText)) {
          const hasChildWithSameText = Array.from(el.children).some((c) =>
            (c.textContent || '').trim().toLowerCase().includes(targetText)
          );
          if (!hasChildWithSameText) {
            elements.push(el);
          }
        }
      }
    } else if (effectiveType === 'aria') {
      const roleVal = trimmed.startsWith('role=') ? trimmed.slice(5) : trimmed;
      elements = Array.from(document.querySelectorAll(`[role="${roleVal}"], ${roleVal}`));
    } else {
      // Standard or deep CSS query across document and shadow roots
      const deepQuery = (root: Document | ShadowRoot | Element): Element[] => {
        const found: Element[] = [];
        try {
          found.push(...Array.from(root.querySelectorAll(trimmed)));
        } catch (err) {
          throw err;
        }
        const all = root.querySelectorAll('*');
        for (let i = 0; i < all.length; i++) {
          const el = all[i];
          if (el.shadowRoot) {
            found.push(...deepQuery(el.shadowRoot));
          }
        }
        return found;
      };

      elements = deepQuery(document);
    }

    return {
      valid: true,
      selectorType: effectiveType,
      matchCount: elements.length,
      matches: elements,
    };
  } catch (err) {
    return {
      valid: false,
      selectorType: effectiveType,
      matchCount: 0,
      matches: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Creates a synthetic SelectorValidationResult for scoreSelectorResilience.
 */
function createSyntheticProbeResult(
  queryRes: { valid: boolean; selectorType: ProbeSelectorType; matchCount: number; matches: Element[]; error?: string },
  selector: string
): SelectorValidationResult {
  const matches: DomElementProbeMatch[] = queryRes.matches.map((el) => {
    return {
      tagName: el.tagName ? el.tagName.toLowerCase() : '',
      textPreview: (el.textContent || '').trim().slice(0, 100) || undefined,
      role: el.getAttribute('role') || undefined,
      testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || undefined,
      isVisible: true,
      isClickable: true,
      isInShadowRoot: false,
    };
  });

  return {
    valid: queryRes.valid && queryRes.matchCount > 0,
    selector,
    selectorType: queryRes.selectorType,
    matchCount: queryRes.matchCount,
    visibleCount: queryRes.matchCount,
    matches,
    error: queryRes.error,
    durationMs: 1,
  };
}

/**
 * Evaluates candidate flow against ground-truth flow on a deterministic HTML fixture DOM.
 */
export function evaluateFlowAgainstFixture(
  candidateYaml: string,
  groundTruthYaml: string,
  htmlFixture: string
): BenchmarkMetricResult {
  const tierDistribution: Record<SelectorResilienceTier, number> = {
    TestId: 0,
    AriaRole: 0,
    VisibleText: 0,
    StandardCss: 0,
    DeepXPath: 0,
  };

  const parsedCandidate = parseFlowYamlSteps(candidateYaml);
  const parsedGroundTruth = parseFlowYamlSteps(groundTruthYaml);

  if (!parsedCandidate.valid) {
    return {
      validYaml: false,
      totalSteps: 0,
      groundTruthStepsCount: parsedGroundTruth.steps.length,
      matchedGroundTruthStepsCount: 0,
      locatorPrecision: 0,
      stepRecall: 0,
      resilienceScore: 0,
      flowPassRate: 0,
      tierDistribution,
      stepResults: [],
      errors: parsedCandidate.errors,
    };
  }

  const dom = new JSDOM(htmlFixture);
  const document = dom.window.document;

  const candidateSteps = parsedCandidate.steps;
  const gtSteps = parsedGroundTruth.steps;

  const stepResults: EvaluatedStepResult[] = [];
  let totalSelectors = 0;
  let uniqueResolvingSelectors = 0;
  let sumResilienceScores = 0;
  let allStepsPassed = candidateSteps.length > 0;

  // Track matched ground-truth step indices to compute recall
  const matchedGtIndices = new Set<number>();

  for (let i = 0; i < candidateSteps.length; i++) {
    const cStep = candidateSteps[i];
    let foundInDom = false;
    let matchCount = 0;
    let isUnique = false;
    let scoreReport: SelectorScoreReport | undefined;
    let groundTruthMatched = false;
    let stepError: string | undefined;

    if (cStep.selector) {
      totalSelectors++;
      const tier = detectResilienceTier(cStep.selector);
      tierDistribution[tier]++;

      const queryRes = queryFixtureDom(document, cStep.selector);
      matchCount = queryRes.matchCount;
      foundInDom = queryRes.valid && matchCount > 0;
      isUnique = matchCount === 1;
      stepError = queryRes.error;

      if (isUnique) {
        uniqueResolvingSelectors++;
      } else {
        allStepsPassed = false;
      }

      const probeResult = createSyntheticProbeResult(queryRes, cStep.selector);
      scoreReport = scoreSelectorResilience(cStep.selector, probeResult);
      sumResilienceScores += scoreReport.score;

      // Find matching GT step
      for (let g = 0; g < gtSteps.length; g++) {
        if (matchedGtIndices.has(g)) continue;
        const gtStep = gtSteps[g];

        // Same command action
        if (gtStep.command.toLowerCase() === cStep.command.toLowerCase()) {
          // If both have selectors, check if they match the same DOM target element or identical selector
          if (gtStep.selector) {
            const gtQuery = queryFixtureDom(document, gtStep.selector);
            if (
              gtStep.selector === cStep.selector ||
              (gtQuery.matches.length > 0 &&
                queryRes.matches.length > 0 &&
                gtQuery.matches[0] === queryRes.matches[0])
            ) {
              matchedGtIndices.add(g);
              groundTruthMatched = true;
              break;
            }
          } else {
            matchedGtIndices.add(g);
            groundTruthMatched = true;
            break;
          }
        }
      }
    } else {
      // Step without selector (e.g. navigate, press, wait)
      foundInDom = true;
      isUnique = true;

      for (let g = 0; g < gtSteps.length; g++) {
        if (matchedGtIndices.has(g)) continue;
        const gtStep = gtSteps[g];
        if (gtStep.command.toLowerCase() === cStep.command.toLowerCase()) {
          matchedGtIndices.add(g);
          groundTruthMatched = true;
          break;
        }
      }
    }

    stepResults.push({
      stepIndex: i,
      command: cStep.command,
      selector: cStep.selector,
      text: cStep.text,
      foundInDom,
      matchCount,
      isUnique,
      scoreReport,
      groundTruthMatched,
      error: stepError,
    });
  }

  const locatorPrecision =
    totalSelectors > 0 ? (uniqueResolvingSelectors / totalSelectors) * 100 : 100;

  const stepRecall =
    gtSteps.length > 0 ? (matchedGtIndices.size / gtSteps.length) * 100 : 100;

  const resilienceScore =
    totalSelectors > 0 ? Math.round(sumResilienceScores / totalSelectors) : 100;

  // Pass rate is 100% only if all candidate steps uniquely resolved and all gt steps were satisfied
  const flowPassRate = allStepsPassed && stepRecall === 100 && candidateSteps.length > 0 ? 100 : 0;

  return {
    validYaml: true,
    totalSteps: candidateSteps.length,
    groundTruthStepsCount: gtSteps.length,
    matchedGroundTruthStepsCount: matchedGtIndices.size,
    locatorPrecision: Number(locatorPrecision.toFixed(2)),
    stepRecall: Number(stepRecall.toFixed(2)),
    resilienceScore,
    flowPassRate,
    tierDistribution,
    stepResults,
    errors: [],
  };
}

/**
 * Runs batch evaluation tasks across scenarios and aggregates results.
 */
export function runBenchmarkSuite(tasks: BenchmarkEvaluationTask[]): BenchmarkSuiteResult {
  const scenarioResults: BenchmarkScenarioResult[] = [];
  const tierDistribution: Record<SelectorResilienceTier, number> = {
    TestId: 0,
    AriaRole: 0,
    VisibleText: 0,
    StandardCss: 0,
    DeepXPath: 0,
  };

  let totalPrecision = 0;
  let totalRecall = 0;
  let totalPassRate = 0;
  let totalResilience = 0;

  for (const task of tasks) {
    const evalResult = evaluateFlowAgainstFixture(
      task.candidateYaml,
      task.groundTruthYaml,
      task.htmlFixture
    );

    const scenarioRes: BenchmarkScenarioResult = {
      ...evalResult,
      scenarioName: task.scenarioName,
      modelId: task.modelId,
    };

    scenarioResults.push(scenarioRes);

    totalPrecision += evalResult.locatorPrecision;
    totalRecall += evalResult.stepRecall;
    totalPassRate += evalResult.flowPassRate;
    totalResilience += evalResult.resilienceScore;

    for (const [tier, count] of Object.entries(evalResult.tierDistribution)) {
      tierDistribution[tier as SelectorResilienceTier] += count;
    }
  }

  const count = tasks.length || 1;

  return {
    totalScenarios: tasks.length,
    overallPrecision: Number((totalPrecision / count).toFixed(2)),
    overallRecall: Number((totalRecall / count).toFixed(2)),
    overallPassRate: Number((totalPassRate / count).toFixed(2)),
    overallResilience: Number((totalResilience / count).toFixed(2)),
    tierDistribution,
    scenarioResults,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Formats BenchmarkSuiteResult into a clean, markdown comparison table.
 */
export function formatBenchmarkMarkdownReport(suiteResult: BenchmarkSuiteResult): string {
  const lines: string[] = [];

  lines.push('# Flow Accuracy & Stability Benchmark Report');
  lines.push(`Generated: ${suiteResult.timestamp}`);
  lines.push('');
  lines.push('### Overall Metrics');
  lines.push(`- **Scenarios Evaluated**: ${suiteResult.totalScenarios}`);
  lines.push(`- **Overall Pass Rate**: ${suiteResult.overallPassRate}%`);
  lines.push(`- **Locator Precision**: ${suiteResult.overallPrecision}%`);
  lines.push(`- **Step Recall**: ${suiteResult.overallRecall}%`);
  lines.push(`- **Average Resilience Score**: ${suiteResult.overallResilience} / 100`);
  lines.push('');
  lines.push('### Selector Tier Distribution');
  lines.push(`- 🟢 TestId: ${suiteResult.tierDistribution.TestId}`);
  lines.push(`- 🔵 AriaRole: ${suiteResult.tierDistribution.AriaRole}`);
  lines.push(`- 🟡 VisibleText: ${suiteResult.tierDistribution.VisibleText}`);
  lines.push(`- ⚪ StandardCss: ${suiteResult.tierDistribution.StandardCss}`);
  lines.push(`- 🔴 DeepXPath: ${suiteResult.tierDistribution.DeepXPath}`);
  lines.push('');
  lines.push('### Scenario Comparison Matrix');
  lines.push('| Scenario | Model | Precision | Recall | Pass Rate | Resilience | Status |');
  lines.push('|---|---|---|---|---|---|---|');

  for (const s of suiteResult.scenarioResults) {
    const statusBadge = s.flowPassRate === 100 ? '✅ PASS' : '❌ FAIL';
    const model = s.modelId || 'N/A';
    lines.push(
      `| ${s.scenarioName} | ${model} | ${s.locatorPrecision}% | ${s.stepRecall}% | ${s.flowPassRate}% | ${s.resilienceScore}/100 | ${statusBadge} |`
    );
  }

  lines.push('');
  return lines.join('\n');
}
