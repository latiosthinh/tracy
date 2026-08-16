import { describe, it, expect } from 'vitest';
import { computeLineDiff, DiffLine } from './diffUtils';

describe('diffUtils', () => {
  it('handles identical text', () => {
    const text = 'line1\nline2\nline3';
    const result = computeLineDiff(text, text);
    expect(result).toEqual<DiffLine[]>([
      { type: 'unchanged', originalLineNumber: 1, modifiedLineNumber: 1, text: 'line1' },
      { type: 'unchanged', originalLineNumber: 2, modifiedLineNumber: 2, text: 'line2' },
      { type: 'unchanged', originalLineNumber: 3, modifiedLineNumber: 3, text: 'line3' },
    ]);
  });

  it('handles empty inputs', () => {
    const result = computeLineDiff('', '');
    expect(result).toEqual<DiffLine[]>([
      { type: 'unchanged', originalLineNumber: 1, modifiedLineNumber: 1, text: '' },
    ]);
  });

  it('handles additions', () => {
    const orig = 'line1\nline3';
    const mod = 'line1\nline2\nline3';
    const result = computeLineDiff(orig, mod);
    expect(result).toEqual<DiffLine[]>([
      { type: 'unchanged', originalLineNumber: 1, modifiedLineNumber: 1, text: 'line1' },
      { type: 'added', modifiedLineNumber: 2, text: 'line2' },
      { type: 'unchanged', originalLineNumber: 2, modifiedLineNumber: 3, text: 'line3' },
    ]);
  });

  it('handles deletions/removals', () => {
    const orig = 'line1\nline2\nline3';
    const mod = 'line1\nline3';
    const result = computeLineDiff(orig, mod);
    expect(result).toEqual<DiffLine[]>([
      { type: 'unchanged', originalLineNumber: 1, modifiedLineNumber: 1, text: 'line1' },
      { type: 'removed', originalLineNumber: 2, text: 'line2' },
      { type: 'unchanged', originalLineNumber: 3, modifiedLineNumber: 2, text: 'line3' },
    ]);
  });

  it('handles modifications / replacements', () => {
    const orig = 'step: click\nselector: .btn';
    const mod = 'step: click\nselector: #submit';
    const result = computeLineDiff(orig, mod);
    
    // Checks that unchanged is recognized and removed/added or modified lines exist
    expect(result[0]).toEqual({
      type: 'unchanged',
      originalLineNumber: 1,
      modifiedLineNumber: 1,
      text: 'step: click',
    });
    
    const hasRemoval = result.some(l => l.type === 'removed' && l.text === 'selector: .btn');
    const hasAddition = result.some(l => l.type === 'added' && l.text === 'selector: #submit');
    expect(hasRemoval).toBe(true);
    expect(hasAddition).toBe(true);
  });

  it('computes diff stats correctly', () => {
    const orig = 'a\nb\nc';
    const mod = 'a\nb_mod\nc\nd';
    const result = computeLineDiff(orig, mod);
    const addedCount = result.filter(l => l.type === 'added').length;
    const removedCount = result.filter(l => l.type === 'removed').length;
    expect(addedCount).toBe(2);
    expect(removedCount).toBe(1);
  });
});
