import { describe, it, expect } from 'vitest';
import { calculateCandidateScore, rankHeuristicCandidates } from './heuristicScorer';
import { DOMCandidateElement, HealableStep } from './types';

describe('Heuristic Candidate Scorer (HEAL-01)', () => {
  it('prioritizes exact data-testid matches with high score', () => {
    const step: HealableStep = {
      action: 'leftClick',
      selector: '[data-testid="submit-login"]',
      text: 'Log In',
    };

    const candidateMatch: DOMCandidateElement = {
      tagName: 'button',
      testId: 'submit-login',
      text: 'Log In',
      ariaLabel: 'Submit Login',
    };

    const candidateUnrelated: DOMCandidateElement = {
      tagName: 'button',
      testId: 'other-button',
      text: 'Something else',
    };

    const scoreMatch = calculateCandidateScore(step.selector!, step, candidateMatch);
    const scoreUnrelated = calculateCandidateScore(step.selector!, step, candidateUnrelated);

    expect(scoreMatch.score).toBeGreaterThanOrEqual(0.85);
    expect(scoreUnrelated.score).toBeLessThan(0.4);
  });

  it('ranks candidates descending by computed confidence score', () => {
    const step: HealableStep = {
      action: 'leftClick',
      selector: '#login-btn',
      text: 'Sign In',
    };

    const candidates: DOMCandidateElement[] = [
      { tagName: 'button', text: 'Sign In', testId: 'login-btn' }, // High match
      { tagName: 'a', text: 'Sign In Now', ariaLabel: 'Sign In' }, // Medium match
      { tagName: 'div', text: 'Footer info' }, // Low match
    ];

    const ranked = rankHeuristicCandidates(step, candidates);

    expect(ranked.length).toBe(3);
    expect(ranked[0].candidate.testId).toBe('login-btn');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThan(ranked[2].score);
    expect(ranked[0].proposedSelector).toBe('[data-testid="login-btn"]');
  });

  it('sets score to 0.0 when candidate violates semantic invariants', () => {
    const step: HealableStep = {
      action: 'leftClick',
      selector: '#btn-save',
      text: 'Save Project',
    };

    const candidateOpposite: DOMCandidateElement = {
      tagName: 'button',
      text: 'Cancel Project',
      testId: 'btn-cancel',
    };

    const ranked = rankHeuristicCandidates(step, [candidateOpposite]);

    expect(ranked[0].invariantsPassed).toBe(false);
    expect(ranked[0].score).toBe(0.0);
    expect(ranked[0].confidence).toBe(0.0);
    expect(ranked[0].rejectionReason).toContain('Semantic contradiction');
  });

  it('handles empty candidate list gracefully', () => {
    const step: HealableStep = { action: 'leftClick', selector: '#btn' };
    const ranked = rankHeuristicCandidates(step, []);
    expect(ranked).toEqual([]);
  });
});
