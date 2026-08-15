import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from './useTranslation';

describe('useTranslation', () => {
  it('translates simple nested key', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('toolbar.reload')).toBe('Reload page');
  });

  it('interpolates parameters correctly with {param}', () => {
    const { result } = renderHook(() => useTranslation());
    // @ts-expect-error test key
    expect(result.current.t('test.greeting', { name: 'Alice', count: 5 })).toBe('Hello Alice, you have 5 items');
  });

  it('returns full key path if missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('non.existent.key')).toBe('non.existent.key');
    expect(warnSpy).toHaveBeenCalledWith('Translation key not found: non.existent.key');
    warnSpy.mockRestore();
  });
});
