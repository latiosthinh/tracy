import { HealableStep, DOMCandidateElement } from './types';
import { validateSemanticInvariants } from './semanticInvariants';
import { createProvider, AiProviderConfig } from '../../ipc/aiProvider';

export interface SynthesizerResult {
  selector: string;
  confidence: number;
  rationale: string;
}

/**
 * Sanitizes and validates selector format to prevent arbitrary code execution or invalid syntax.
 */
export function sanitizeSynthesizedSelector(raw: string): string {
  if (!raw) return '';

  let cleaned = raw.trim();
  // Strip code fences or quotes
  cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  // Strip prefix like "page.locator(...)" or "locator(...)" if returned by LLM
  const locMatch = cleaned.match(/^(?:page\.)?locator\((['"`])(.*)\1\)$/);
  if (locMatch) {
    cleaned = locMatch[2];
  }

  return cleaned;
}

/**
 * Synthesizes a resilient Playwright fallback selector using GenAI when heuristics fail.
 */
export async function synthesizeFallbackLocator(
  step: HealableStep,
  compactDOM: string,
  providerConfig?: { agentId?: string; config?: AiProviderConfig; customProvider?: { generateFlow: (prompt: string, sys?: string) => Promise<string> } }
): Promise<SynthesizerResult | null> {
  if (!step || !compactDOM) return null;

  const originalTarget = step.selector || step.target || step.text || '';
  const action = step.action || step.command || 'click';

  const systemInstruction = `You are a Playwright test engineer.
Fix the broken locator for the failed test step.
Analyze step & DOM snapshot, return ONE resilient selector in JSON.
RULES:
1. JSON ONLY: {"selector": "...", "confidence": 0.85, "rationale": "..."}.
2. Prefer: [data-testid], role/aria, text/attribute CSS, unique #id.
3. NEVER choose opposite action verbs (e.g. Save -> Cancel/Delete).
4. No markdown, no extra commentary.`;

  const userPrompt = `Failed step:
Action: ${action}
Target: ${JSON.stringify(originalTarget)}
Value: ${JSON.stringify(step.text || step.value || '')}

DOM:
${compactDOM}

JSON:`;

  try {
    let rawResponse = '';

    if (providerConfig?.customProvider) {
      rawResponse = await providerConfig.customProvider.generateFlow(userPrompt, systemInstruction);
    } else {
      const agentId = providerConfig?.agentId || 'google';
      const provider = await createProvider(agentId, providerConfig?.config);
      rawResponse = await provider.generateFlow(userPrompt, systemInstruction);
    }

    if (!rawResponse) return null;

    // Parse JSON
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const rawSelector = parsed.selector;
    if (!rawSelector || typeof rawSelector !== 'string') return null;

    const selector = sanitizeSynthesizedSelector(rawSelector);
    const confidence = typeof parsed.confidence === 'number' ? Math.min(1.0, Math.max(0.0, parsed.confidence)) : 0.8;
    const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : 'AI synthesized replacement locator';

    // Verify against semantic invariants
    const candidateMock: DOMCandidateElement = {
      tagName: selector.match(/^[a-z0-9]+/i)?.[0] || 'button',
      selector,
      text: selector.match(/:has-text\(["']([^"']+)["']\)/i)?.[1] || parsed.rationale || undefined,
      ariaLabel: selector.match(/aria-label=["']([^"']+)["']/i)?.[1] || undefined,
      testId: selector.match(/data-testid=["']([^"']+)["']/i)?.[1] || undefined,
    };

    const invariantCheck = validateSemanticInvariants(step, candidateMock);
    if (!invariantCheck.allowed) {
      return null;
    }

    return {
      selector,
      confidence,
      rationale,
    };
  } catch {
    return null;
  }
}
