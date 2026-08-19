import { describe, it, expect } from 'vitest';
import { isDestructiveAction, filterSafeInteractiveElements, DANGEROUS_ACTION_PATTERN } from './safetyFilter';
import { InteractiveElement } from './types';

describe('Destructive Action Safety Filter', () => {
  it('DANGEROUS_ACTION_PATTERN matches dangerous keywords', () => {
    expect(DANGEROUS_ACTION_PATTERN.test('Delete account')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('btn-remove-item')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('logout')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('sign-out')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('destroy all')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('Cancel subscription')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('purge')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('unlink')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('unsubscribe')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('clear-all')).toBe(true);
    expect(DANGEROUS_ACTION_PATTERN.test('trash')).toBe(true);
  });

  it('isDestructiveAction flags elements containing destructive keywords in text, ariaLabel, name, id, or href', () => {
    const el1: Partial<InteractiveElement> = {
      tagName: 'button',
      text: 'Delete Profile',
      selector: '#btn-del'
    };
    expect(isDestructiveAction(el1).isSafe).toBe(false);
    expect(isDestructiveAction(el1).reason).toContain('Delete');

    const el2: Partial<InteractiveElement> = {
      tagName: 'a',
      href: '/auth/logout',
      selector: 'a.logout'
    };
    expect(isDestructiveAction(el2).isSafe).toBe(false);

    const el3: Partial<InteractiveElement> = {
      tagName: 'button',
      ariaLabel: 'Remove item from cart',
      selector: 'button.remove'
    };
    expect(isDestructiveAction(el3).isSafe).toBe(false);

    const el4: Partial<InteractiveElement> = {
      tagName: 'input',
      type: 'submit',
      name: 'terminate_user',
      selector: 'input[name="terminate_user"]'
    };
    expect(isDestructiveAction(el4).isSafe).toBe(false);
  });

  it('isDestructiveAction passes safe navigation and interaction elements', () => {
    const safeLinks: Partial<InteractiveElement>[] = [
      { tagName: 'a', text: 'Dashboard', href: '/dashboard', selector: 'a[href="/dashboard"]' },
      { tagName: 'button', text: 'Search Products', selector: 'button#search' },
      { tagName: 'button', text: 'Next Page', ariaLabel: 'Next Page', selector: 'button.pagination-next' },
      { tagName: 'a', text: 'View Details', href: '/products/123', selector: 'a.details' },
      { tagName: 'button', text: 'Apply Filter', selector: '#filter-btn' }
    ];

    for (const el of safeLinks) {
      expect(isDestructiveAction(el).isSafe).toBe(true);
    }
  });

  it('filterSafeInteractiveElements separates safe and blocked elements cleanly', () => {
    const elements: InteractiveElement[] = [
      { tagName: 'a', text: 'Home', href: '/', selector: 'a#home', isSafe: true },
      { tagName: 'button', text: 'Sign Out', selector: 'button#signout', isSafe: true },
      { tagName: 'button', text: 'View Report', selector: 'button#report', isSafe: true },
      { tagName: 'button', text: 'Purge Cache', selector: 'button#purge', isSafe: true },
      { tagName: 'a', text: 'Settings', href: '/settings', selector: 'a#settings', isSafe: true }
    ];

    const result = filterSafeInteractiveElements(elements);
    expect(result.safe.map(s => s.text)).toEqual(['Home', 'View Report', 'Settings']);
    expect(result.blocked.length).toBe(2);
    expect(result.blocked[0].element.text).toBe('Sign Out');
    expect(result.blocked[1].element.text).toBe('Purge Cache');
  });
});
