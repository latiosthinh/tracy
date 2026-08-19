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

  const systemInstruction = `You are an expert Playwright test automation engineer.
Your task is to fix a broken locator for an automated test step.
Analyze the target step and compact DOM structure, and return ONE resilient, unique selector for Playwright.

STRICT RULES:
1. Return ONLY valid JSON format: {"selector": "...", "confidence": 0.85, "rationale": "..."}.
2. Choose resilient selectors in order of preference:
   - [data-testid="..."]
   - role/aria locator like [role="button"][name="..."] or [aria-label="..."]
   - scoped text/attribute CSS like button:has-text("...") or input[name="..."]
   - unique #id or stable CSS path.
3. NEVER pick an opposite action verb (e.g. if original was "Save", NEVER pick "Cancel" or "Delete").
4. NEVER invent non-existent DOM elements not present in the compact DOM snippet.
5. No markdown fences, no explanation outside the JSON object.`;

  const userPrompt = `Failed step details:
- Action: ${action}
- Original Target / Selector: ${JSON.stringify(originalTarget)}
- Expected Text / Value: ${JSON.stringify(step.text || step.value || '')}
- Step Metadata: ${JSON.stringify(step)}

Current Compact DOM Snapshot:
${compactDOM}

Generate the replacement locator JSON:`;

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
