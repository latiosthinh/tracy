import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShortcutsModal } from './ShortcutsModal';
import { useUiStore } from '@/src/stores/uiStore';

describe('ShortcutsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    useUiStore.setState({ isShortcutsModalOpen: true });

    render(<ShortcutsModal />);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Execution & Runner')).toBeInTheDocument();
    expect(screen.getByText('Navigation & Tabs')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    useUiStore.setState({ isShortcutsModalOpen: false });

    render(<ShortcutsModal />);

    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('calls setShortcutsModalOpen(false) when close button clicked', () => {
    const setShortcutsModalOpen = vi.fn();
    useUiStore.setState({ isShortcutsModalOpen: true, setShortcutsModalOpen });

    render(<ShortcutsModal />);

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    expect(setShortcutsModalOpen).toHaveBeenCalledWith(false);
  });
});
