import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LatencyFlamechart } from './LatencyFlamechart';
import type { TestRunResult } from '@/src/types/execution';

describe('LatencyFlamechart', () => {
  const mockResult: TestRunResult = {
    id: 'run-1',
    flowId: 'flow-1',
    flowName: 'Checkout Test',
    timestamp: '2026-08-16T12:00:00Z',
    durationMs: 3000,
    status: 'PASSED',
    passedCount: 3,
    failedCount: 0,
    skippedCount: 0,
    totalCount: 3,
    steps: [
      {
        id: 's1',
        command: 'navigate',
        value: 'https://example.com',
        status: 'passed',
        durationMs: 300,
      },
      {
        id: 's2',
        command: 'leftClick',
        target: '#submit-btn',
        status: 'passed',
        durationMs: 950,
      },
      {
        id: 's3',
        command: 'waitFor',
        target: '.modal',
        status: 'passed',
        durationMs: 1750,
      },
    ],
    logs: [],
    artifacts: { screenshots: [] },
  };

  it('renders summary metrics including duration and bottlenecks', () => {
    render(<LatencyFlamechart result={mockResult} />);

    expect(screen.getByText('3.00s')).toBeInTheDocument();
    // Bottlenecks count (>800ms) is 2 (950ms and 1750ms)
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/waitFor \(1750ms\)/i)).toBeInTheDocument();
  });

  it('renders latency bars with warning tags for slow and critical steps', () => {
    render(<LatencyFlamechart result={mockResult} />);

    expect(screen.getByText('navigate')).toBeInTheDocument();
    expect(screen.getByText('leftClick')).toBeInTheDocument();
    expect(screen.getByText('waitFor')).toBeInTheDocument();

    expect(screen.getByText(/Slow \(>800ms\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Bottleneck \(>1.5s\)/i)).toBeInTheDocument();
    expect(screen.getByText('300ms')).toBeInTheDocument();
    expect(screen.getByText('950ms')).toBeInTheDocument();
    expect(screen.getByText('1750ms')).toBeInTheDocument();
  });

  it('handles empty step list gracefully', () => {
    const emptyResult: TestRunResult = {
      ...mockResult,
      steps: [],
      durationMs: 0,
    };
    render(<LatencyFlamechart result={emptyResult} />);
    expect(screen.getByText(/No step duration metrics available/i)).toBeInTheDocument();
  });
});
