import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YamlDiffModal } from './YamlDiffModal';

describe('YamlDiffModal', () => {
  it('renders no changes message when original and modified are identical', () => {
    render(
      <YamlDiffModal
        isOpen={true}
        onClose={vi.fn()}
        originalYaml="step: 1"
        modifiedYaml="step: 1"
      />
    );

    expect(screen.getByText(/No changes detected/i)).toBeInTheDocument();
  });

  it('renders diff additions and deletions with badges and content', () => {
    render(
      <YamlDiffModal
        isOpen={true}
        onClose={vi.fn()}
        originalYaml={'step: 1'}
        modifiedYaml={'step: 2'}
      />
    );

    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('step: 2')).toBeInTheDocument();
    expect(screen.getByText('step: 1')).toBeInTheDocument();
  });

  it('calls onRevert when revert button clicked', () => {
    const onRevert = vi.fn();
    const onClose = vi.fn();
    render(
      <YamlDiffModal
        isOpen={true}
        onClose={onClose}
        originalYaml="step: 1"
        modifiedYaml="step: 2"
        onRevert={onRevert}
      />
    );

    const revertBtn = screen.getByText(/Revert to Saved/i);
    fireEvent.click(revertBtn);
    expect(onRevert).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
