import { describe, it, expect } from 'vitest';
import { minePlaywrightDom, formatMinedForPrompt, generateSuggestedSelectors } from './domMiner';

describe('minePlaywrightDom', () => {
  it('returns empty page for null tree', () => {
    const result = minePlaywrightDom(null, 'https://example.com', 'Example');
    expect(result.url).toBe('https://example.com');
    expect(result.title).toBe('Example');
    expect(result.nodes).toHaveLength(0);
    expect(result.stats.totalNodes).toBe(0);
  });

  it('processes a simple node tree', () => {
    const tree = {
      tag: 'div',
      isInteractive: false,
      isVisible: true,
      children: [
        {
          tag: 'button',
          role: 'button',
          text: 'Click Me',
          isInteractive: true,
          isVisible: true,
          children: [],
        },
      ],
    };

    const result = minePlaywrightDom(tree, 'https://example.com', 'Test');
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.stats.totalNodes).toBe(2);
    expect(result.stats.interactiveNodes).toBe(1);
  });

  it('generates testId locator when testId is present', () => {
    const tree = {
      tag: 'input',
      testId: 'email-input',
      isInteractive: true,
      isVisible: true,
      children: [],
    };

    const result = minePlaywrightDom(tree, 'https://example.com', 'Test');
    expect(result.nodes[0].locator).toBe("getByTestId('email-input')");
  });

  it('generates role locator when role and name are present', () => {
    const tree = {
      tag: 'button',
      role: 'button',
      name: 'Submit',
      isInteractive: true,
      isVisible: true,
      children: [],
    };

    const result = minePlaywrightDom(tree, 'https://example.com', 'Test');
    expect(result.nodes[0].locator).toBe("getByRole('button', { name: 'Submit' })");
  });

  it('generates placeholder locator when placeholder is present', () => {
    const tree = {
      tag: 'input',
      placeholder: 'Enter email',
      isInteractive: true,
      isVisible: true,
      children: [],
    };

    const result = minePlaywrightDom(tree, 'https://example.com', 'Test');
    expect(result.nodes[0].locator).toBe("getByPlaceholder('Enter email')");
  });

  it('computes correct stats', () => {
    const tree = {
      tag: 'div',
      isVisible: true,
      isInteractive: false,
      text: 'Hello',
      children: [
        { tag: 'a', href: '/link', text: 'Link', isInteractive: true, isVisible: true, children: [] },
        { tag: 'span', text: 'Hidden', isInteractive: false, isVisible: false, children: [] },
      ],
    };

    const result = minePlaywrightDom(tree, 'https://example.com', 'Test');
    expect(result.stats.totalNodes).toBe(3);
    expect(result.stats.visibleNodes).toBe(2);
    expect(result.stats.interactiveNodes).toBe(1);
    expect(result.stats.textHolders).toBe(2);
  });
});

describe('formatMinedForPrompt', () => {
  it('formats mined page into prompt-ready string', () => {
    const tree = {
      tag: 'div',
      isVisible: true,
      isInteractive: false,
      children: [
        { tag: 'button', role: 'button', name: 'Submit', isInteractive: true, isVisible: true, children: [] },
      ],
    };

    const mined = minePlaywrightDom(tree, 'https://example.com', 'Test Page');
    const output = formatMinedForPrompt(mined);

    expect(output).toContain('## Page DOM Map: Test Page');
    expect(output).toContain('URL: https://example.com');
    expect(output).toContain('## Interactive Elements');
    expect(output).toContain('Submit');
  });

  it('respects maxNodes limit', () => {
    const children = Array.from({ length: 200 }, (_, i) => ({
      tag: 'button',
      role: 'button',
      name: `Btn ${i}`,
      isInteractive: true,
      isVisible: true,
      children: [],
    }));

    const tree = { tag: 'div', isVisible: true, isInteractive: false, children };
    const mined = minePlaywrightDom(tree, 'https://example.com', 'Test');
    const output = formatMinedForPrompt(mined, 50);

    const interactiveSection = output.split('## Interactive Elements')[1];
    const locatorLines = interactiveSection.split('\n').filter(l => l.startsWith('['));
    expect(locatorLines.length).toBeLessThanOrEqual(50);
  });
});

describe('generateSuggestedSelectors', () => {
  it('returns testId selector as best rating', () => {
    const selectors = generateSuggestedSelectors({ testId: 'my-id' });
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors[0].type).toBe('testId');
    expect(selectors[0].rating).toBe('best');
  });

  it('returns role selector when role and text present', () => {
    const selectors = generateSuggestedSelectors({ role: 'button', text: 'Click Me' });
    const roleSelector = selectors.find(s => s.type === 'role');
    expect(roleSelector).toBeDefined();
    expect(roleSelector!.rating).toBe('recommended');
  });

  it('returns label selector when label present', () => {
    const selectors = generateSuggestedSelectors({ label: 'Email' });
    const labelSelector = selectors.find(s => s.type === 'label');
    expect(labelSelector).toBeDefined();
  });

  it('returns placeholder selector when placeholder present', () => {
    const selectors = generateSuggestedSelectors({ placeholder: 'Enter name' });
    const ps = selectors.find(s => s.type === 'placeholder');
    expect(ps).toBeDefined();
  });

  it('returns id selector as fallback', () => {
    const selectors = generateSuggestedSelectors({ id: 'my-el' });
    const idSelector = selectors.find(s => s.type === 'id');
    expect(idSelector).toBeDefined();
    expect(idSelector!.rating).toBe('fallback');
  });

  it('returns css selector as fragile', () => {
    const selectors = generateSuggestedSelectors({ className: 'btn-primary large' });
    const cssSelector = selectors.find(s => s.type === 'css');
    expect(cssSelector).toBeDefined();
    expect(cssSelector!.rating).toBe('fragile');
    expect(cssSelector!.value).toBe('.btn-primary');
  });

  it('returns empty array for empty element data', () => {
    const selectors = generateSuggestedSelectors({});
    expect(selectors).toHaveLength(0);
  });
});
