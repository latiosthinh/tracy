import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestReports } from './TestReports';
import type { TestRunResult } from '@/src/types/execution';

describe('TestReports', () => {
  const mockResult: TestRunResult = {
    id: 'run-1',
    flowId: 'flow-1',
    flowName: 'Checkout Flow Test',
    timestamp: '2026-08-16 12:00:00',
    durationMs: 2500,
    status: 'PASSED',
    passedCount: 2,
    failedCount: 0,
    skippedCount: 0,
    totalCount: 2,
    steps: [
      {
        id: 's1',
        command: 'navigate',
        value: 'https://example.com',
        status: 'passed',
        durationMs: 500,
      },
      {
        id: 's2',
        command: 'leftClick',
        target: '#buy',
        status: 'passed',
        durationMs: 1200,
      },
    ],
    logs: [],
    artifacts: { screenshots: [] },
  };

  it('renders empty state when no test result is provided', () => {
    render(<TestReports lastResult={null} />);
    expect(screen.getByText(/No Test Execution Reports Yet/i)).toBeInTheDocument();
  });

  it('renders summary breakdown with list view by default', () => {
    render(<TestReports lastResult={mockResult} />);
    expect(screen.getByText('Checkout Flow Test')).toBeInTheDocument();
    expect(screen.getByText('navigate')).toBeInTheDocument();
    expect(screen.getByText('leftClick')).toBeInTheDocument();
  });

  it('toggles to Latency Flamechart view when flamechart button clicked', () => {
    render(<TestReports lastResult={mockResult} />);

    const flamechartToggle = screen.getByRole('button', { name: /Latency Flamechart/i });
    fireEvent.click(flamechartToggle);

    // Flamechart metrics should now be in the document
    expect(screen.getAllByText('2.50s').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Slow \(>800ms\)/i)).toBeInTheDocument();
    expect(screen.getByText('1200ms')).toBeInTheDocument();
    expect(screen.getByText('500ms')).toBeInTheDocument();

    // Toggle back to list view
    const listToggle = screen.getByRole('button', { name: /Step List/i });
    fireEvent.click(listToggle);

    expect(screen.queryByText(/Slow \(>800ms\)/i)).not.toBeInTheDocument();
    expect(screen.getByText('navigate')).toBeInTheDocument();
  });
});
