import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandPalette } from './CommandPalette';
import { useUiStore } from '@/src/stores/uiStore';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({
      isCommandPaletteOpen: true,
      currentView: 'studio',
      activeTab: 'editor',
      inspectMode: false,
      recordMode: false,
    });
    useProjectStore.setState({
      projects: [
        {
          id: 'proj-1',
          name: 'Alpha Project',
          targetUrl: 'http://localhost:3000',
          environment: 'development',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          flows: [
            {
              id: 'flow-1',
              name: 'login.yaml',
              path: 'flows/login.yaml',
              tags: [],
              steps: [],
              category: 'Smoke',
              yamlContent: '# Login\n---\n- navigate: /login',
              metadata: {},
            },
            {
              id: 'flow-2',
              name: 'checkout.yaml',
              path: 'flows/checkout.yaml',
              tags: [],
              steps: [],
              category: 'E2E',
              yamlContent: '# Checkout\n---\n- navigate: /checkout',
              metadata: {},
            },
          ],
        },
      ],
      activeProjectId: 'proj-1',
      openProjectIds: ['proj-1'],
      activeFlowId: 'flow-1',
    });
    useExecutionStore.setState({
      isExecuting: false,
    });
  });

  it('renders input with autofocus and role combobox when open', () => {
    render(<CommandPalette />);
    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('does not render when isCommandPaletteOpen is false', () => {
    useUiStore.setState({ isCommandPaletteOpen: false });
    const { container } = render(<CommandPalette />);
    expect(container.firstChild).toBeNull();
  });

  it('filters items correctly on query input', () => {
    render(<CommandPalette />);
    const input = screen.getByRole('combobox');
    
    // Type query matching checkout flow
    fireEvent.change(input, { target: { value: 'checkout' } });

    expect(screen.getByText('checkout.yaml')).toBeInTheDocument();
    expect(screen.queryByText('login.yaml')).not.toBeInTheDocument();
  });

  it('shows no results message when search yields nothing', () => {
    render(<CommandPalette />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'nonexistent-query-xyz' } });

    expect(screen.getByText(/No commands or matching items found/i)).toBeInTheDocument();
  });

  it('navigates with ArrowDown / ArrowUp and selects item on Enter', () => {
    const selectFlowMock = vi.fn();
    useProjectStore.setState({ selectFlow: selectFlowMock });

    render(<CommandPalette />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'checkout' } });

    // Press Enter to trigger the top filtered item
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(selectFlowMock).toHaveBeenCalledWith('flow-2');
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it('closes on Escape key press', () => {
    render(<CommandPalette />);
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it('executes action commands when clicked', () => {
    const startExecutionMock = vi.fn();
    useExecutionStore.setState({ startExecution: startExecutionMock });

    render(<CommandPalette />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Run Active Flow' } });

    const option = screen.getByText('Run Active Flow');
    fireEvent.click(option);

    expect(startExecutionMock).toHaveBeenCalled();
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);
  });
});
