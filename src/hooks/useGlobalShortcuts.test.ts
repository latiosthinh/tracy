import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalShortcuts } from './useGlobalShortcuts';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';
import { useUiStore } from '@/src/stores/uiStore';

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers startExecution on Ctrl+Enter', () => {
    const startExecution = vi.fn();
    useExecutionStore.setState({ startExecution, isExecuting: false });
    useProjectStore.setState({
      projects: [{ id: 'p1', name: 'Proj 1', targetUrl: 'http://test.com', flows: [{ id: 'f1', name: 'f1.yaml', steps: [] }] as any }] as any,
      activeProjectId: 'p1',
      activeFlowId: 'f1',
    });

    renderHook(() => useGlobalShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(startExecution).toHaveBeenCalled();
  });

  it('triggers pauseExecution on Ctrl+Shift+P', () => {
    const pauseExecution = vi.fn();
    useExecutionStore.setState({ pauseExecution });

    renderHook(() => useGlobalShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'P',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(pauseExecution).toHaveBeenCalled();
  });

  it('switches project tab on Ctrl+1..9', () => {
    const selectProject = vi.fn();
    useProjectStore.setState({
      projects: [
        { id: 'p1', name: 'Proj 1', flows: [] } as any,
        { id: 'p2', name: 'Proj 2', flows: [] } as any,
      ],
      openProjectIds: ['p1', 'p2'],
      selectProject,
    });

    renderHook(() => useGlobalShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: '2',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(selectProject).toHaveBeenCalledWith('p2');
  });

  it('cycles flow tabs forward and backward on Ctrl+Tab and Ctrl+Shift+Tab', () => {
    const selectFlow = vi.fn();
    useProjectStore.setState({
      projects: [
        {
          id: 'p1',
          name: 'Proj 1',
          flows: [
            { id: 'f1', name: 'f1.yaml' },
            { id: 'f2', name: 'f2.yaml' },
            { id: 'f3', name: 'f3.yaml' },
          ] as any,
        } as any,
      ],
      activeProjectId: 'p1',
      activeFlowId: 'f1',
      selectFlow,
    });

    renderHook(() => useGlobalShortcuts());

    // Forward
    const eventForward = new KeyboardEvent('keydown', {
      key: 'Tab',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(eventForward);
    expect(selectFlow).toHaveBeenCalledWith('f2');

    // Backward
    const eventBackward = new KeyboardEvent('keydown', {
      key: 'Tab',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(eventBackward);
    expect(selectFlow).toHaveBeenCalledWith('f3');
  });

  it('opens shortcuts cheatsheet on pressing ? when not typing in input/textarea', () => {
    const setShortcutsModalOpen = vi.fn();
    useUiStore.setState({ setShortcutsModalOpen });

    renderHook(() => useGlobalShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: '?',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(setShortcutsModalOpen).toHaveBeenCalledWith(true);
  });

  it('does not open shortcuts modal if ? pressed inside an input', () => {
    const setShortcutsModalOpen = vi.fn();
    useUiStore.setState({ setShortcutsModalOpen });

    renderHook(() => useGlobalShortcuts());

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: '?',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    window.dispatchEvent(event);

    expect(setShortcutsModalOpen).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
