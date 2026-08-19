import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioTabs } from './StudioTabs';
import type { ActiveTab } from '@/src/types/ui';

describe('StudioTabs', () => {
  it('renders visualizer tab alongside default tabs and triggers onTabChange', () => {
    let currentTab: ActiveTab = 'editor';
    const handleTabChange = vi.fn((tab: ActiveTab) => {
      currentTab = tab;
    });

    const { rerender } = render(
      <StudioTabs activeTab={currentTab} onTabChange={handleTabChange} />
    );

    const visualizerTabBtn = screen.getByRole('tab', { name: /Visualizer/i });
    expect(visualizerTabBtn).toBeInTheDocument();
    expect(visualizerTabBtn).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(visualizerTabBtn);
    expect(handleTabChange).toHaveBeenCalledWith('visualizer');

    rerender(<StudioTabs activeTab="visualizer" onTabChange={handleTabChange} />);
    expect(screen.getByRole('tab', { name: /Visualizer/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
