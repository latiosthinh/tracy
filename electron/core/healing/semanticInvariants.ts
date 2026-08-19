import { DOMCandidateElement, HealableStep } from './types';

/**
 * Opposing action verb pairs.
 * If the original intent and candidate text cross an opposite boundary, healing must be rejected.
 */
export const ACTION_VERB_OPPOSITES: Record<string, string[]> = {
  save: ['cancel', 'delete', 'discard', 'abort', 'close', 'remove'],
  cancel: ['save', 'submit', 'confirm', 'ok', 'apply', 'done'],
  submit: ['reset', 'clear', 'cancel', 'discard'],
  reset: ['submit', 'save', 'confirm', 'apply'],
  delete: ['save', 'create', 'add', 'keep', 'cancel', 'insert', 'new'],
  remove: ['save', 'add', 'create', 'keep', 'cancel', 'insert', 'new'],
  destroy: ['save', 'create', 'add', 'keep', 'cancel', 'insert', 'new'],
  purge: ['save', 'create', 'add', 'keep', 'cancel', 'insert', 'new'],
  create: ['delete', 'remove', 'destroy', 'purge', 'cancel'],
  add: ['delete', 'remove', 'destroy', 'purge', 'cancel'],
  login: ['logout', 'signout', 'sign out', 'log out', 'exit'],
  signin: ['logout', 'signout', 'sign out', 'log out', 'exit'],
  logout: ['login', 'signin', 'sign in', 'log in'],
  signout: ['login', 'signin', 'sign in', 'log in'],
  next: ['prev', 'previous', 'back'],
  prev: ['next', 'forward', 'continue'],
  previous: ['next', 'forward', 'continue'],
  back: ['next', 'forward', 'continue', 'submit'],
  confirm: ['cancel', 'reject', 'deny', 'dismiss'],
  accept: ['reject', 'deny', 'decline', 'cancel', 'dismiss'],
  reject: ['accept', 'confirm', 'allow', 'agree'],
  allow: ['block', 'deny', 'reject', 'disallow'],
  block: ['allow', 'permit', 'enable'],
  enable: ['disable', 'turn off', 'block'],
  disable: ['enable', 'turn on', 'allow'],
};

export const DESTRUCTIVE_VERBS = new Set([
  'delete',
  'remove',
  'destroy',
  'purge',
  'drop',
  'truncate',
  'logout',
  'signout',
]);

const INCOMPATIBLE_ROLE_PAIRS: Array<[RegExp, RegExp]> = [
  [/^button$/, /^(input|textarea|textbox)$/],
  [/^(input|textarea|textbox)$/, /^button$/],
  [/^link$/, /^select$/],
  [/^select$/, /^link$/],
  [/^checkbox$/, /^radio$/],
  [/^radio$/, /^checkbox$/],
];

/**
 * Checks if a step is allowed to be self-healed.
 * Assertion steps MUST NEVER be healed (per HEAL-03 and Pitfall 2.2).
 */
export function isHealableStep(step: HealableStep): boolean {
  if (!step) return false;

  const type = (step.type || '').toLowerCase();
  const action = (step.action || '').toLowerCase();

  if (type === 'assert' || type === 'expectation' || type === 'expect') {
    return false;
  }

  if (
    action.startsWith('expect') ||
    action.startsWith('assert') ||
    action.includes('assertion')
  ) {
    return false;
  }

  // Keywords in custom step properties
  if (
    typeof step.expect !== 'undefined' ||
    typeof step.assertion !== 'undefined'
  ) {
    return false;
  }

  return true;
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Validates candidate element against semantic invariants.
 * Strictly rejects opposite actions, role mismatches, and destructive verbs on benign actions.
 */
export function validateSemanticInvariants(
  originalStep: HealableStep,
  candidate: DOMCandidateElement
): { allowed: boolean; reason?: string } {
  // 1. Assertion step invariant
  if (!isHealableStep(originalStep)) {
    return {
      allowed: false,
      reason: 'Assertion steps are immutable and cannot be healed.',
    };
  }

  // 2. Interactive role / tag compatibility check
  const candidateTag = (candidate.tagName || '').toLowerCase();
  const candidateRole = (
    candidate.role ||
    (candidateTag === 'button'
      ? 'button'
      : candidateTag === 'a'
        ? 'link'
        : candidateTag === 'input'
          ? 'textbox'
          : '')
  ).toLowerCase();

  const originalSelector = (originalStep.selector || '').toLowerCase();
  let originalRoleOrTag = '';
  if (originalSelector.includes('button') || originalStep.action === 'leftClick') {
    if (originalSelector.includes('input')) {
      originalRoleOrTag = 'input';
    } else if (originalSelector.includes('button')) {
      originalRoleOrTag = 'button';
    } else if (originalSelector.includes('a') || originalSelector.includes('link')) {
      originalRoleOrTag = 'link';
    }
  }

  if (originalRoleOrTag && candidateRole) {
    for (const [r1, r2] of INCOMPATIBLE_ROLE_PAIRS) {
      if (r1.test(originalRoleOrTag) && r2.test(candidateRole)) {
        return {
          allowed: false,
          reason: `Incompatible role transition: ${originalRoleOrTag} cannot heal to ${candidateRole}.`,
        };
      }
    }
  }

  // 3. Verb and intent extraction
  const originalStrings = [
    originalStep.text,
    originalStep.selector,
    typeof originalStep['aria-label'] === 'string' ? (originalStep['aria-label'] as string) : undefined,
  ]
    .filter((s): s is string => Boolean(s))
    .join(' ');

  const candidateStrings = [
    candidate.text,
    candidate.ariaLabel,
    candidate.testId,
    candidate.id,
  ]
    .filter((s): s is string => Boolean(s))
    .join(' ');

  const origWords = extractWords(originalStrings);
  const candWords = extractWords(candidateStrings);

  // 4. Opposing action verb check
  for (const word of origWords) {
    const opposites = ACTION_VERB_OPPOSITES[word];
    if (opposites) {
      for (const candWord of candWords) {
        if (opposites.includes(candWord)) {
          return {
            allowed: false,
            reason: `Semantic contradiction detected: original intent '${word}' conflicts with candidate '${candWord}'.`,
          };
        }
      }
    }
  }

  // 5. Destructive verb injection guard
  const origHasDestructive = origWords.some((w) => DESTRUCTIVE_VERBS.has(w));
  const candHasDestructive = candWords.some((w) => DESTRUCTIVE_VERBS.has(w));
  if (!origHasDestructive && candHasDestructive) {
    return {
      allowed: false,
      reason: 'Candidate introduces destructive action verb not present in original step.',
    };
  }

  return { allowed: true };
}
