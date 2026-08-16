import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation, type TranslationKey } from './useTranslation';

describe('useTranslation', () => {
  it('translates simple nested key', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('toolbar.reload')).toBe('Reload page');
  });

  it('interpolates parameters correctly with {param}', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('splash.versionInfo', { version: 'v1.0.0' })).toBe('v1.0.0 • Electron • Chromium Engine');
  });

  it('provides compile-time type checking for translation keys', () => {
    const validKey: TranslationKey = 'common.close';
    expect(validKey).toBe('common.close');
  });

  it('returns full key path if missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('non.existent.key')).toBe('non.existent.key');
    expect(warnSpy).toHaveBeenCalledWith('Translation key not found: non.existent.key');
    warnSpy.mockRestore();
  });
});


