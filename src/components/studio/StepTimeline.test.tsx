import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepTimeline } from './StepTimeline';
import type { FlowStep } from '@/src/types/flow';

describe('StepTimeline', () => {
  const mockSteps: FlowStep[] = [
    {
      id: 'step-1',
      command: 'navigate',
      target: 'https://example.com',
      status: 'passed',
      durationMs: 400,
    },
    {
      id: 'step-2',
      command: 'leftClick',
      target: 'button#old-submit',
      status: 'passed',
      durationMs: 850,
      healResult: {
        healed: true,
        strategy: 'heuristic',
        originalSelector: 'button#old-submit',
        healedSelector: '[data-testid="submit-btn"]',
        confidence: 0.94,
        reason: 'Attribute testId match with 94% score',
        artifacts: {
          screenshotPath: 'test-results/flow/healed-step-1.png',
        },
      },
    },
  ];

  it('renders heal badge, strategy tag, and confidence score for healed step', () => {
    render(
      <StepTimeline
        steps={mockSteps}
        isExecuting={false}
        activeStepIndex={-1}
        logs={[]}
        onStartRun={vi.fn()}
        onPauseRun={vi.fn()}
        onResetRun={vi.fn()}
        executionSpeed={600}
        onSpeedChange={vi.fn()}
      />
    );

    expect(screen.getByText('⚡ Healed')).toBeInTheDocument();
    expect(screen.getByText('Heuristic Match')).toBeInTheDocument();
    expect(screen.getByText('94% Confidence')).toBeInTheDocument();
  });

  it('expands selector diff accordion on click to show original vs replacement selector', () => {
    render(
      <StepTimeline
        steps={mockSteps}
        isExecuting={false}
        activeStepIndex={-1}
        logs={[]}
        onStartRun={vi.fn()}
        onPauseRun={vi.fn()}
        onResetRun={vi.fn()}
        executionSpeed={600}
        onSpeedChange={vi.fn()}
      />
    );

    const accordionBtn = screen.getByRole('button', { name: /Self-Healed Selector Diff:/i });
    expect(accordionBtn).toBeInTheDocument();

    // Before clicking, diff details are collapsed
    expect(screen.queryByText(/Original: button#old-submit/i)).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(accordionBtn);

    expect(screen.getByText(/- Original: button#old-submit/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Replacement: \[data-testid="submit-btn"\]/i)).toBeInTheDocument();
    expect(screen.getByText(/📷 test-results\/flow\/healed-step-1\.png/i)).toBeInTheDocument();
  });
});
