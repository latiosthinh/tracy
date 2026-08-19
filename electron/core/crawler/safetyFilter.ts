import { InteractiveElement } from './types';

export const DANGEROUS_ACTION_PATTERN =
  /(^|[^a-zA-Z0-9])(logout|log-out|signout|sign-out|delete|remove|destroy|cancel|drop|terminate|reset|purge|unlink|unsubscribe|clear-all|trash)([^a-zA-Z0-9]|$)/i;

export interface SafetyCheckResult {
  isSafe: boolean;
  reason?: string;
}

/**
 * Evaluates whether an element triggers destructive actions (e.g. account deletion, logout, data purge).
 */
export function isDestructiveAction(element: Partial<InteractiveElement>): SafetyCheckResult {
  const fieldsToCheck = [
    element.text,
    element.ariaLabel,
    element.name,
    element.id,
    element.className,
    element.href,
    element.title,
    element.selector
  ];

  for (const field of fieldsToCheck) {
    if (typeof field === 'string' && DANGEROUS_ACTION_PATTERN.test(field)) {
      const match = field.match(DANGEROUS_ACTION_PATTERN);
      return {
        isSafe: false,
        reason: `Matched dangerous term: "${match ? match[0] : field}" in element attributes`
      };
    }
  }

  return { isSafe: true };
}

/**
 * Partitions interactive elements into safe elements to click and blocked items with explanations.
 */
export function filterSafeInteractiveElements(elements: InteractiveElement[]): {
  safe: InteractiveElement[];
  blocked: Array<{ element: InteractiveElement; reason: string }>;
} {
  const safe: InteractiveElement[] = [];
  const blocked: Array<{ element: InteractiveElement; reason: string }> = [];

  for (const element of elements) {
    const check = isDestructiveAction(element);
    if (check.isSafe) {
      safe.push({ ...element, isSafe: true });
    } else {
      blocked.push({
        element: { ...element, isSafe: false },
        reason: check.reason || 'Destructive action guard triggered'
      });
    }
  }

  return { safe, blocked };
}
