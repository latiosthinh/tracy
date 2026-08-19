import { describe, it, expect } from 'vitest';
import { isHealableStep, validateSemanticInvariants, ACTION_VERB_OPPOSITES } from './semanticInvariants';
import { DOMCandidateElement, HealableStep } from './types';

describe('Semantic Invariants & Assertion Guard (HEAL-01 / HEAL-03)', () => {
  it('identifies assertion and expectation steps as non-healable', () => {
    expect(isHealableStep({ type: 'assert', selector: '#title' })).toBe(false);
    expect(isHealableStep({ type: 'expect', selector: '#title' })).toBe(false);
    expect(isHealableStep({ action: 'expectVisible', selector: '#title' })).toBe(false);
    expect(isHealableStep({ action: 'assertText', selector: '#title' })).toBe(false);
    expect(isHealableStep({ action: 'leftClick', selector: '#submit', expect: 'to be visible' })).toBe(false);

    // Normal action steps are healable
    expect(isHealableStep({ action: 'leftClick', selector: '#submit' })).toBe(true);
    expect(isHealableStep({ action: 'fill', selector: '#email', text: 'user@example.com' })).toBe(true);
  });

  it('rejects candidate if step is an assertion', () => {
    const step: HealableStep = { type: 'assert', selector: '#header' };
    const candidate: DOMCandidateElement = { tagName: 'h1', text: 'Header' };
    const result = validateSemanticInvariants(step, candidate);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Assertion steps are immutable');
  });

  it('strictly rejects opposite action verbs (e.g. Save -> Cancel)', () => {
    const step: HealableStep = { action: 'leftClick', selector: '#save-button', text: 'Save' };
    const candidateCancel: DOMCandidateElement = { tagName: 'button', text: 'Cancel' };
    const candidateDiscard: DOMCandidateElement = { tagName: 'button', text: 'Discard changes' };

    const resultCancel = validateSemanticInvariants(step, candidateCancel);
    expect(resultCancel.allowed).toBe(false);
    expect(resultCancel.reason).toContain('Semantic contradiction detected');

    const resultDiscard = validateSemanticInvariants(step, candidateDiscard);
    expect(resultDiscard.allowed).toBe(false);
    expect(resultDiscard.reason).toContain('Semantic contradiction detected');
  });

  it('strictly rejects destructive verbs injected into benign actions', () => {
    const step: HealableStep = { action: 'leftClick', selector: '#update-profile', text: 'Update Profile' };
    const candidateDelete: DOMCandidateElement = { tagName: 'button', text: 'Delete Profile' };

    const result = validateSemanticInvariants(step, candidateDelete);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('destructive action verb');
  });

  it('allows valid semantic matches and synonym variations', () => {
    const step: HealableStep = { action: 'leftClick', selector: '#btn-submit', text: 'Save Changes' };
    const candidate: DOMCandidateElement = { tagName: 'button', text: 'Save Item', testId: 'save-btn' };

    const result = validateSemanticInvariants(step, candidate);
    expect(result.allowed).toBe(true);
  });

  it('has comprehensive opposite dictionary', () => {
    expect(ACTION_VERB_OPPOSITES.save).toContain('cancel');
    expect(ACTION_VERB_OPPOSITES.login).toContain('logout');
    expect(ACTION_VERB_OPPOSITES.next).toContain('back');
  });
});
