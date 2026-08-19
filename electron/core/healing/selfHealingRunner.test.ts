import { describe, it, expect, vi } from 'vitest';
import { executeStepWithHealing, resolveHealedLocator } from './selfHealingRunner';
import { HealableStep } from './types';

describe('selfHealingRunner', () => {
  it('executes normal step directly when locator works', async () => {
    const mockLocator = {
      click: vi.fn().mockResolvedValue(undefined),
    };
    const mockPage: any = {
      locator: vi.fn().mockReturnValue(mockLocator),
      getByText: vi.fn(),
    };

    const step: HealableStep = {
      action: 'leftClick',
      selector: '#submit-btn',
    };

    const result = await executeStepWithHealing(mockPage, step);
    expect(result.success).toBe(true);
    expect(result.healed).toBe(false);
    expect(mockLocator.click).toHaveBeenCalled();
  });

  it('fails immediately without healing if step is an assertion', async () => {
    const mockLocator = {
      waitFor: vi.fn().mockRejectedValue(new Error('Timeout 5000ms')),
    };
    const mockPage: any = {
      locator: vi.fn().mockReturnValue(mockLocator),
    };

    const step: HealableStep = {
      action: 'assertVisible',
      selector: '#error-banner',
      type: 'assert',
    };

    const result = await executeStepWithHealing(mockPage, step);
    expect(result.success).toBe(false);
    expect(result.healed).toBe(false);
    expect(result.error).toContain('Timeout 5000ms');
  });

  it('intercepts timeout error and heals step via heuristic candidate', async () => {
    const brokenLocator = {
      click: vi.fn().mockRejectedValue(new Error('locator.click: Timeout 10000ms exceeded')),
    };
    const healedLocator = {
      waitFor: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      first: () => healedLocator,
    };

    const mockPage: any = {
      locator: vi.fn((sel: string) => {
        if (sel === '#submit-btn') return brokenLocator;
        if (sel === '[data-testid="submit-btn"]') return healedLocator;
        return brokenLocator;
      }),
      evaluate: vi.fn().mockResolvedValue([
        {
          tagName: 'button',
          testId: 'submit-btn',
          text: 'Submit Application',
          role: 'button',
          classes: ['btn', 'btn-primary'],
        },
      ]),
    };

    const step: HealableStep = {
      action: 'leftClick',
      selector: '#submit-btn',
      text: 'Submit Application',
    };

    const result = await executeStepWithHealing(mockPage, step);
    expect(result.success).toBe(true);
    expect(result.healed).toBe(true);
    expect(result.healingDetails?.strategy).toBe('heuristic');
    expect(result.healingDetails?.healedSelector).toBe('[data-testid="submit-btn"]');
    expect(healedLocator.click).toHaveBeenCalled();
  });

  it('falls back to AI synthesis when heuristics do not meet threshold', async () => {
    const brokenLocator = {
      click: vi.fn().mockRejectedValue(new Error('locator.click: Timeout 10000ms exceeded')),
    };
    const aiHealedLocator = {
      waitFor: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      first: () => aiHealedLocator,
    };

    let evalCount = 0;
    const mockPage: any = {
      locator: vi.fn((sel: string) => {
        if (sel === '#obscure-id') return brokenLocator;
        if (sel === 'button[data-ref="pay-now"]') return aiHealedLocator;
        return brokenLocator;
      }),
      evaluate: vi.fn().mockImplementation(() => {
        evalCount++;
        if (evalCount === 1) {
          // extractLiveDOMCandidates
          return Promise.resolve([
            {
              tagName: 'button',
              id: 'btn-unrelated',
              text: 'Help',
            },
          ]);
        }
        // captureCompactSnapshot
        return Promise.resolve('<button data-ref="pay-now">Pay Now</button>');
      }),
    };

    const mockProvider = {
      generateFlow: vi.fn().mockResolvedValue(JSON.stringify({
        selector: 'button[data-ref="pay-now"]',
        confidence: 0.85,
        rationale: 'Found button with payment reference attribute',
      })),
    };

    const step: HealableStep = {
      action: 'leftClick',
      selector: '#obscure-id',
      text: 'Pay Now',
    };

    const result = await executeStepWithHealing(mockPage, step, {
      providerConfig: { customProvider: mockProvider },
    });

    expect(result.success).toBe(true);
    expect(result.healed).toBe(true);
    expect(result.healingDetails?.strategy).toBe('ai');
    expect(result.healingDetails?.healedSelector).toBe('button[data-ref="pay-now"]');
    expect(aiHealedLocator.click).toHaveBeenCalled();
  });
});
