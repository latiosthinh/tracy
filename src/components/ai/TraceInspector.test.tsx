import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TraceInspector } from './TraceInspector';
import type { AgentToolTraceEvent } from '@/src/types/skills';

describe('TraceInspector', () => {
  it('renders nothing when trace list is empty and not executing', () => {
    const { container } = render(<TraceInspector traces={[]} isExecuting={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders active monitoring chip when executing with empty traces', () => {
    render(<TraceInspector traces={[]} isExecuting={true} />);
    expect(screen.getByText(/Monitoring agent execution trace/i)).toBeInTheDocument();
  });

  it('renders trace events with turns, thoughts, and tool details', () => {
    const mockTraces: AgentToolTraceEvent[] = [
      {
        turn: 1,
        thought: 'Searching for username input',
        toolCall: {
          name: 'validate_selector',
          arguments: { selector: 'input[name="user"]' },
        },
        toolResult: { valid: true, matchCount: 1, details: { stabilityTier: 'High' } },
        durationMs: 42,
        timestamp: new Date().toISOString(),
      },
    ];

    render(<TraceInspector traces={mockTraces} isExecuting={false} />);
    expect(screen.getByText(/Turn 1/i)).toBeInTheDocument();
    expect(screen.getByText(/validate_selector/i)).toBeInTheDocument();
    expect(screen.getByText(/"Searching for username input"/i)).toBeInTheDocument();
  });
});
