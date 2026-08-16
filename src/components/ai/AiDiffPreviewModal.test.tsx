import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiDiffPreviewModal } from './AiDiffPreviewModal';

describe('AiDiffPreviewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    originalYaml: 'url: https://example.com\n---\n- navigate: /',
    generatedYaml: 'url: https://example.com\n---\n- navigate: /\n- leftClick: "#btn"',
    onReplace: vi.fn(),
    onAppend: vi.fn(),
  };

  it('renders modal when open', () => {
    render(<AiDiffPreviewModal {...defaultProps} />);
    expect(screen.getByText('AI Step Diff Preview')).toBeInTheDocument();
    expect(screen.getByText('Replace Entire Flow')).toBeInTheDocument();
    expect(screen.getByText('Append Steps to End')).toBeInTheDocument();
  });

  it('calls onReplace when replace button clicked', () => {
    const onReplace = vi.fn();
    render(<AiDiffPreviewModal {...defaultProps} onReplace={onReplace} />);
    fireEvent.click(screen.getByText('Replace Entire Flow'));
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it('calls onAppend when append button clicked', () => {
    const onAppend = vi.fn();
    render(<AiDiffPreviewModal {...defaultProps} onAppend={onAppend} />);
    fireEvent.click(screen.getByText('Append Steps to End'));
    expect(onAppend).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<AiDiffPreviewModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays no differences message when yamls are identical', () => {
    render(
      <AiDiffPreviewModal
        {...defaultProps}
        originalYaml="url: https://example.com"
        generatedYaml="url: https://example.com"
      />
    );
    expect(screen.getByText('No differences detected between active flow and AI output.')).toBeInTheDocument();
  });
});
