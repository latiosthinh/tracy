import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisualStepEditor } from './VisualStepEditor';
import type { FlowStep } from '@/src/types/flow';

describe('VisualStepEditor', () => {
  const initialSteps: FlowStep[] = [
    { id: 's1', command: 'navigate', value: 'https://example.com', status: 'passed' },
    { id: 's2', command: 'leftClick', target: 'button#submit', status: 'pending' },
    { id: 's3', command: 'fill', target: 'input#name', value: 'Alice', status: 'pending' },
  ];

  it('renders all steps', () => {
    render(<VisualStepEditor steps={initialSteps} onStepsChange={vi.fn()} />);
    expect(screen.getByText('navigate')).toBeInTheDocument();
    expect(screen.getByText('leftClick')).toBeInTheDocument();
    expect(screen.getByText('fill')).toBeInTheDocument();
  });

  it('duplicates step when duplicate button is clicked', () => {
    const onStepsChange = vi.fn();
    render(<VisualStepEditor steps={initialSteps} onStepsChange={onStepsChange} />);

    const duplicateButtons = screen.getAllByTitle('Duplicate Step');
    expect(duplicateButtons.length).toBe(3);

    fireEvent.click(duplicateButtons[0]);
    expect(onStepsChange).toHaveBeenCalledTimes(1);

    const updatedSteps = onStepsChange.mock.calls[0][0];
    expect(updatedSteps.length).toBe(4);
    expect(updatedSteps[1].command).toBe('navigate');
    expect(updatedSteps[1].value).toBe('https://example.com');
    expect(updatedSteps[1].status).toBe('pending');
    expect(updatedSteps[1].id).not.toBe('s1');
  });

  it('allows multi-selecting steps and bulk deleting them', () => {
    const onStepsChange = vi.fn();
    render(<VisualStepEditor steps={initialSteps} onStepsChange={onStepsChange} />);

    // Select step 1 and step 3
    const step1Checkbox = screen.getByTitle('Select step 1');
    const step3Checkbox = screen.getByTitle('Select step 3');

    fireEvent.click(step1Checkbox);
    fireEvent.click(step3Checkbox);

    // Bulk delete button should appear
    const bulkDeleteBtn = screen.getByTitle('Delete Selected (2)');
    expect(bulkDeleteBtn).toBeInTheDocument();

    fireEvent.click(bulkDeleteBtn);

    expect(onStepsChange).toHaveBeenCalledTimes(1);
    const updatedSteps = onStepsChange.mock.calls[0][0];
    expect(updatedSteps.length).toBe(1);
    expect(updatedSteps[0].id).toBe('s2');
  });

  it('selects all steps when select all is clicked', () => {
    const onStepsChange = vi.fn();
    render(<VisualStepEditor steps={initialSteps} onStepsChange={onStepsChange} />);

    const selectAllBtn = screen.getByTitle('Select All');
    fireEvent.click(selectAllBtn);

    const bulkDeleteBtn = screen.getByTitle('Delete Selected (3)');
    expect(bulkDeleteBtn).toBeInTheDocument();
  });
});
