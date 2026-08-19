import { DOMCandidateElement, HealableStep, HeuristicScoreResult } from './types';
import { validateSemanticInvariants } from './semanticInvariants';

/**
 * Computes Dice's bigram coefficient between two strings (0.0 to 1.0)
 */
function diceCoefficient(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) {
    return s1 === s2 ? 1.0 : 0.0;
  }

  const getBigrams = (str: string): Map<string, number> => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;

  for (const [bigram, count1] of b1.entries()) {
    const count2 = b2.get(bigram) || 0;
    intersection += Math.min(count1, count2);
  }

  return (2.0 * intersection) / (s1.length - 1 + (s2.length - 1));
}

/**
 * Generates a resilient Playwright selector proposal for a candidate
 */
function generateProposedSelector(candidate: DOMCandidateElement): string {
  if (candidate.testId) {
    return `[data-testid="${candidate.testId}"]`;
  }
  if (candidate.id) {
    return `#${candidate.id}`;
  }
  if (candidate.ariaLabel) {
    return `[aria-label="${candidate.ariaLabel}"]`;
  }
  if (candidate.selector) {
    return candidate.selector;
  }
  const tag = candidate.tagName.toLowerCase();
  if (candidate.text && candidate.text.length < 30) {
    return `${tag}:has-text("${candidate.text.trim()}")`;
  }
  return tag;
}

/**
 * Extracts potential test ID, text, label, and tag hints from an existing CSS / XPath selector.
 */
function parseTargetSelectorHints(selector: string) {
  const testIdMatch = selector.match(/data-testid=["']?([^"']+)["']?/i);
  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
  const ariaMatch = selector.match(/aria-label=["']?([^"']+)["']?/i);
  const textMatch = selector.match(/:has-text\(["']?([^"']+)["']?\)/i);
  const tagMatch = selector.match(/^([a-zA-Z0-9]+)/);

  return {
    testId: testIdMatch ? testIdMatch[1] : undefined,
    id: idMatch ? idMatch[1] : undefined,
    ariaLabel: ariaMatch ? ariaMatch[1] : undefined,
    text: textMatch ? textMatch[1] : undefined,
    tag: tagMatch ? tagMatch[1].toLowerCase() : undefined,
  };
}

/**
 * Calculates a multi-attribute weighted score for a single candidate element.
 * Attributes:
 * - testId / ID: weight 0.35
 * - aria-label / name: weight 0.25
 * - text similarity: weight 0.20
 * - role / tag: weight 0.10
 * - structural proximity: weight 0.10
 */
export function calculateCandidateScore(
  targetSelector: string,
  step: HealableStep,
  candidate: DOMCandidateElement
): { score: number; breakdown: HeuristicScoreResult['matchBreakdown'] } {
  const hints = parseTargetSelectorHints(targetSelector || step.selector || '');
  const targetText = step.text || hints.text;
  const candText = candidate.text;

  // 1. TestID / ID score (Weight: 0.35)
  let testIdScore = 0.0;
  const targetTestId = hints.testId || hints.id;
  const candTestId = candidate.testId || candidate.id;
  if (targetTestId && candTestId) {
    if (targetTestId.toLowerCase() === candTestId.toLowerCase()) {
      testIdScore = 1.0;
    } else {
      testIdScore = diceCoefficient(targetTestId, candTestId);
    }
  } else if (!targetTestId && candidate.testId && targetText && candText) {
    // If target selector had no testId but candidate has testId and matching text
    testIdScore = diceCoefficient(targetText, candText);
  }

  // 2. Aria-label / Name score (Weight: 0.25)
  let ariaLabelScore = 0.0;
  const targetAria = hints.ariaLabel || (typeof step['aria-label'] === 'string' ? (step['aria-label'] as string) : undefined);
  const candAria = candidate.ariaLabel;
  if (targetAria && candAria) {
    ariaLabelScore = diceCoefficient(targetAria, candAria);
  } else if (!targetAria && candAria && targetText) {
    const normCand = candAria.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normTarget = targetText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normCand === normTarget || normCand.includes(normTarget) || normTarget.includes(normCand)) {
      ariaLabelScore = 1.0;
    } else {
      ariaLabelScore = diceCoefficient(targetText, candAria);
    }
  } else if (targetAria && !candAria && candText) {
    ariaLabelScore = diceCoefficient(targetAria, candText);
  }

  // 3. Text score (Weight: 0.20)
  let textScore = 0.0;
  if (targetText && candText) {
    textScore = diceCoefficient(targetText, candText);
  }

  // 4. Role & Tag score (Weight: 0.10)
  let roleTagScore = 0.0;
  const targetTag = hints.tag;
  const candTag = candidate.tagName.toLowerCase();
  if (targetTag && targetTag === candTag) {
    roleTagScore = 1.0;
  } else if (!targetTag && ['button', 'input', 'a', 'select'].includes(candTag)) {
    roleTagScore = 1.0; // Interactive candidate baseline
  } else if (targetTag && targetTag !== candTag) {
    roleTagScore = 0.2;
  }

  // 5. Structural DOM Path / Proximity score (Weight: 0.10)
  let proximityScore = 0.0;
  if (candidate.path && (targetSelector.includes('/') || targetSelector.includes('>'))) {
    proximityScore = diceCoefficient(targetSelector, candidate.path);
  } else if (candidate.boundingBox && candidate.boundingBox.width > 0 && candidate.boundingBox.height > 0) {
    proximityScore = 1.0;
  } else {
    proximityScore = 1.0; // Default DOM present element
  }

  const rawScore =
    testIdScore * 0.35 +
    ariaLabelScore * 0.25 +
    textScore * 0.20 +
    roleTagScore * 0.10 +
    proximityScore * 0.10;

  return {
    score: Math.min(1.0, Math.max(0.0, Number(rawScore.toFixed(3)))),
    breakdown: {
      testIdScore,
      ariaLabelScore,
      textScore,
      roleTagScore,
      proximityScore,
    },
  };
}

/**
 * Deterministically ranks live DOM candidates against a failed step.
 */
export function rankHeuristicCandidates(
  step: HealableStep,
  candidates: DOMCandidateElement[]
): HeuristicScoreResult[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  const results: HeuristicScoreResult[] = candidates.map((candidate) => {
    const invariantCheck = validateSemanticInvariants(step, candidate);

    if (!invariantCheck.allowed) {
      return {
        candidate,
        score: 0.0,
        confidence: 0.0,
        proposedSelector: generateProposedSelector(candidate),
        invariantsPassed: false,
        rejectionReason: invariantCheck.reason,
      };
    }

    const { score, breakdown } = calculateCandidateScore(
      step.selector || '',
      step,
      candidate
    );

    return {
      candidate,
      score,
      confidence: score,
      proposedSelector: generateProposedSelector(candidate),
      invariantsPassed: true,
      matchBreakdown: breakdown,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
