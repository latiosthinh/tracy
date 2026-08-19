import { describe, it, expect, vi } from 'vitest';
import { synthesizeFallbackLocator, sanitizeSynthesizedSelector } from './aiSynthesizer';
import { HealableStep } from './types';

describe('aiSynthesizer', () => {
  it('sanitizes synthesized selector output', () => {
    expect(sanitizeSynthesizedSelector('```json\n"button[data-testid=\'save\']"\n```')).toBe("button[data-testid='save']");
    expect(sanitizeSynthesizedSelector("page.locator('#submit')")).toBe('#submit');
    expect(sanitizeSynthesizedSelector('  [data-testid="login"]  ')).toBe('[data-testid="login"]');
  });

  it('synthesizes fallback locator successfully with valid AI JSON output', async () => {
    const mockProvider = {
      generateFlow: vi.fn().mockResolvedValue(JSON.stringify({
        selector: '[data-testid="save-profile-btn"]',
        confidence: 0.92,
        rationale: 'Found updated save button testid',
      })),
    };

    const step: HealableStep = {
      action: 'leftClick',
      selector: '#old-save-button',
      text: 'Save',
    };

    const compactDOM = '<button id="btn-123" data-testid="save-profile-btn">Save Changes</button>';

    const result = await synthesizeFallbackLocator(step, compactDOM, { customProvider: mockProvider });

    expect(result).not.toBeNull();
    expect(result?.selector).toBe('[data-testid="save-profile-btn"]');
    expect(result?.confidence).toBe(0.92);
    expect(result?.rationale).toBe('Found updated save button testid');
  });

  it('rejects AI selector proposing opposite semantic action', async () => {
    const mockProvider = {
      generateFlow: vi.fn().mockResolvedValue(JSON.stringify({
        selector: 'button:has-text("Cancel")',
        confidence: 0.88,
        rationale: 'Clicked cancel button instead',
      })),
    };

    const step: HealableStep = {
      action: 'leftClick',
      selector: 'button.save-btn',
      text: 'Save',
    };

    const compactDOM = '<button class="btn">Cancel</button>';

    const result = await synthesizeFallbackLocator(step, compactDOM, { customProvider: mockProvider });
    expect(result).toBeNull();
  });

  it('returns null on invalid response or JSON parse error', async () => {
    const mockProvider = {
      generateFlow: vi.fn().mockResolvedValue('Sorry I could not find a selector.'),
    };

    const step: HealableStep = {
      action: 'leftClick',
      selector: '#btn',
    };

    const result = await synthesizeFallbackLocator(step, '<div />', { customProvider: mockProvider });
    expect(result).toBeNull();
  });
});
