import { Page, Locator } from 'playwright-core';
import { HealableStep, HealingResult, HEAL_CONFIDENCE_THRESHOLD } from './types';
import { isHealableStep } from './semanticInvariants';
import { rankHeuristicCandidates } from './heuristicScorer';
import { extractLiveDOMCandidates, captureCompactSnapshot } from './domProbe';
import { synthesizeFallbackLocator } from './aiSynthesizer';
import { AiProviderConfig } from '../../ipc/aiProvider';

export interface ExecuteStepOptions {
  autoHeal?: boolean;
  timeoutMs?: number;
  providerConfig?: {
    agentId?: string;
    config?: AiProviderConfig;
    customProvider?: { generateFlow: (prompt: string, sys?: string) => Promise<string> };
  };
  onLog?: (level: 'info' | 'warn' | 'error' | 'assertion', message: string) => void;
}

export interface StepExecutionResult {
  success: boolean;
  healed: boolean;
  healingDetails?: HealingResult;
  error?: string;
  durationMs: number;
}

/**
 * Resolves Playwright Locator from string or structured step target.
 */
export function resolvePlaywrightLocator(page: Page, target: unknown): Locator | null {
  if (!page || !target) return null;

  if (typeof target === 'string') {
    if (
      target.startsWith('#') ||
      target.startsWith('.') ||
      target.startsWith('/') ||
      target.startsWith('css=') ||
      target.startsWith('xpath=') ||
      target.includes(' > ') ||
      target.includes('[') ||
      target.includes(':has-text')
    ) {
      return page.locator(target);
    }
    return page.getByText(target, { exact: false });
  }

  if (typeof target === 'object' && target !== null) {
    const t = target as Record<string, any>;
    if (t.testId) return page.getByTestId(t.testId);
    if (t.role && t.name) return page.getByRole(t.role, { name: t.name });
    if (t.role) return page.getByRole(t.role);
    if (t.label) return page.getByLabel(t.label);
    if (t.placeholder) return page.getByPlaceholder(t.placeholder);
    if (t.text) return page.getByText(t.text, { exact: t.exact ?? false });
    if (t.css) return page.locator(t.css);
    if (t.xpath) return page.locator(`xpath=${t.xpath}`);
    if (t.id) return page.locator(`#${t.id}`);
    if (t.selector) return page.locator(t.selector);
  }

  return null;
}

/**
 * Executes low-level action on a resolved locator.
 */
async function performAction(
  page: Page,
  locator: Locator | null,
  step: HealableStep,
  timeout: number
): Promise<void> {
  const action = (step.action || step.command || 'click').toLowerCase();

  switch (action) {
    case 'navigate': {
      const url = step.url || step.value || step.target || '/';
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      break;
    }

    case 'click':
    case 'leftclick':
    case 'tap': {
      if (!locator) throw new Error(`Cannot click: Locator not resolved for target "${step.selector || step.target}"`);
      await locator.click({ timeout });
      break;
    }

    case 'doubleclick': {
      if (!locator) throw new Error(`Cannot doubleClick: Locator not resolved for target "${step.selector || step.target}"`);
      await locator.dblclick({ timeout });
      break;
    }

    case 'rightclick': {
      if (!locator) throw new Error(`Cannot rightClick: Locator not resolved for target "${step.selector || step.target}"`);
      await locator.click({ button: 'right', timeout });
      break;
    }

    case 'hover': {
      if (!locator) throw new Error(`Cannot hover: Locator not resolved for target "${step.selector || step.target}"`);
      await locator.hover({ timeout });
      break;
    }

    case 'fill': {
      if (!locator) throw new Error(`Cannot fill: Locator not resolved for target "${step.selector || step.target}"`);
      const text = step.value || step.text || '';
      await locator.fill(text, { timeout });
      break;
    }

    case 'press': {
      const key = step.key || step.value || step.target || 'Enter';
      if (locator) {
        await locator.press(key, { timeout });
      } else {
        await page.keyboard.press(key);
      }
      break;
    }

    case 'waitfor':
    case 'assertvisible': {
      if (locator) {
        await locator.waitFor({ state: 'visible', timeout });
      } else {
        const val = step.value || step.target;
        if (typeof val === 'number') {
          await page.waitForTimeout(val);
        } else if (typeof val === 'string') {
          await page.waitForSelector(val, { timeout });
        }
      }
      break;
    }

    case 'assertnotvisible': {
      if (!locator) throw new Error(`Cannot assertNotVisible: Locator not resolved for target "${step.selector || step.target}"`);
      await locator.waitFor({ state: 'hidden', timeout });
      break;
    }

    case 'asserttitle': {
      const expected = step.value || step.target || '';
      const title = await page.title();
      if (!title.includes(expected)) {
        throw new Error(`Title "${title}" does not contain expected "${expected}"`);
      }
      break;
    }

    case 'asserturl': {
      const expected = step.value || step.target || '';
      const currentUrl = page.url();
      if (!currentUrl.includes(expected)) {
        throw new Error(`URL "${currentUrl}" does not contain expected "${expected}"`);
      }
      break;
    }

    default: {
      if (locator) {
        await locator.click({ timeout });
      } else {
        throw new Error(`Unsupported action command: ${action}`);
      }
      break;
    }
  }
}

/**
 * Attempts healing pipeline when step execution encounters a locator timeout error.
 */
export async function resolveHealedLocator(
  page: Page,
  step: HealableStep,
  options?: ExecuteStepOptions
): Promise<HealingResult | null> {
  const originalSelector = (step.selector || step.target || step.text || '') as string;

  // 1. Invariant check: Assertions are never healed
  if (!isHealableStep(step)) {
    return null;
  }

  // 2. Short grace period for DOM/network mutations to settle
  await new Promise((resolve) => setTimeout(resolve, 150));

  // 3. Extract live DOM candidates
  const candidates = await extractLiveDOMCandidates(page);
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // 4. Rank candidates via heuristic scorer
  const ranked = rankHeuristicCandidates(step, candidates);
  const topCandidate = ranked[0];

  if (topCandidate && topCandidate.score >= HEAL_CONFIDENCE_THRESHOLD && topCandidate.invariantsPassed) {
    const proposed = topCandidate.proposedSelector;
    const testLocator = page.locator(proposed);
    const targetEl = typeof (testLocator as any).first === 'function' ? (testLocator as any).first() : testLocator;

    try {
      await targetEl.waitFor({ state: 'visible', timeout: 2000 });
      return {
        healed: true,
        strategy: 'heuristic',
        originalSelector,
        healedSelector: proposed,
        confidence: topCandidate.score,
        reason: `Heuristic match with score ${topCandidate.score}`,
        candidate: topCandidate.candidate,
      };
    } catch {
      // Proposed selector not visible or broken, fall through to AI
    }
  }

  // 5. GenAI fallback locator synthesis
  const compactDOM = await captureCompactSnapshot(page, 150);
  if (compactDOM) {
    const aiResult = await synthesizeFallbackLocator(step, compactDOM, options?.providerConfig);
    if (aiResult && aiResult.selector) {
      const aiLocator = page.locator(aiResult.selector);
      const aiTarget = typeof (aiLocator as any).first === 'function' ? (aiLocator as any).first() : aiLocator;
      try {
        await aiTarget.waitFor({ state: 'visible', timeout: 2000 });
        return {
          healed: true,
          strategy: 'ai',
          originalSelector,
          healedSelector: aiResult.selector,
          confidence: aiResult.confidence,
          reason: aiResult.rationale,
        };
      } catch {
        // AI proposed selector failed verification
      }
    }
  }

  return null;
}

/**
 * Main execution wrapper intercepting timeouts, executing healing, and retrying.
 */
export async function executeStepWithHealing(
  page: Page,
  step: HealableStep,
  options: ExecuteStepOptions = {}
): Promise<StepExecutionResult> {
  const start = Date.now();
  const autoHeal = options.autoHeal ?? true;
  const timeoutMs = options.timeoutMs || step.timeout || 10000;
  const originalTarget = step.selector || step.target || step.text;

  // 1. Primary execution attempt
  try {
    const primaryLocator = resolvePlaywrightLocator(page, originalTarget);
    await performAction(page, primaryLocator, step, timeoutMs);
    return {
      success: true,
      healed: false,
      durationMs: Date.now() - start,
    };
  } catch (primaryErr: any) {
    const errMsg = primaryErr?.message || String(primaryErr);

    // If step is assertion or autoHeal is false, re-throw immediately
    if (!autoHeal || !isHealableStep(step)) {
      return {
        success: false,
        healed: false,
        error: errMsg,
        durationMs: Date.now() - start,
      };
    }

    options.onLog?.('warn', `Locator failed: "${originalTarget}". Attempting self-healing...`);

    // 2. Self-healing attempt
    const healingResult = await resolveHealedLocator(page, step, options);

    if (healingResult && healingResult.healed && healingResult.healedSelector) {
      try {
        const resolved = page.locator(healingResult.healedSelector);
        const healedLocator = typeof (resolved as any)?.first === 'function' ? (resolved as any).first() : resolved;
        await performAction(page, healedLocator, step, 5000);

        options.onLog?.(
          'assertion',
          `⚡ Self-healed step using ${healingResult.strategy} locator: "${healingResult.healedSelector}" (score: ${healingResult.confidence})`
        );

        return {
          success: true,
          healed: true,
          healingDetails: healingResult,
          durationMs: Date.now() - start,
        };
      } catch (retryErr: any) {
        return {
          success: false,
          healed: false,
          error: `Self-healing retry failed with selector "${healingResult.healedSelector}": ${retryErr?.message || retryErr}`,
          durationMs: Date.now() - start,
        };
      }
    }

    return {
      success: false,
      healed: false,
      error: errMsg,
      durationMs: Date.now() - start,
    };
  }
}
