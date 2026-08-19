import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiCopilot } from './AiCopilot';
import { Project, FlowFile } from '@/src/types/autoflow';

const mockProject: Project = {
  id: 'proj-1',
  name: 'Test Project',
  targetUrl: 'https://example.com',
  flows: [],
  tags: [],
  environment: 'development',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockFlow: FlowFile = {
  id: 'flow-1',
  name: 'Checkout Flow',
  path: 'flows/checkout.yaml',
  yamlContent: 'url: https://example.com\n---\n- navigate: /',
  metadata: { url: 'https://example.com' },
  steps: [],
  tags: [],
};

describe('AiCopilot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AiCopilot with scope tabs and recipes', () => {
    render(
      <AiCopilot
        activeProject={mockProject}
        activeFlow={mockFlow}
        currentYaml={mockFlow.yamlContent}
        onApplyGeneratedYaml={vi.fn()}
        targetUrl="https://example.com"
      />
    );

    expect(screen.getByText('Full flow')).toBeInTheDocument();
    expect(screen.getByText('Single flow')).toBeInTheDocument();
    expect(screen.getByText('Agent Skills & Domain Packs')).toBeInTheDocument();
    expect(screen.getByText('QA Test Recipes')).toBeInTheDocument();
  });

  it('displays generation telemetry metrics when flow is generated', async () => {
    render(
      <AiCopilot
        activeProject={mockProject}
        activeFlow={mockFlow}
        currentYaml={mockFlow.yamlContent}
        onApplyGeneratedYaml={vi.fn()}
        targetUrl="https://example.com"
      />
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ yaml: 'url: https://example.com\n---\n- navigate: /\n- leftClick: "#checkout"' }),
    } as Response);

    const textarea = screen.getByPlaceholderText(/Generate a complete test suite for Test Project/i);
    fireEvent.change(textarea, { target: { value: 'Add checkout step' } });

    const submitBtn = screen.getByRole('button', { name: /Generate Project Test Steps/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const chip = screen.getByTestId('copilot-telemetry-chip');
      expect(chip).toBeInTheDocument();
      expect(chip.textContent).toMatch(/tokens/i);
      expect(chip.textContent).toMatch(/t\/s/i);
    });
  });

  it('allows previewing diff and replacing flow', async () => {
    const onApply = vi.fn();
    render(
      <AiCopilot
        activeProject={mockProject}
        activeFlow={mockFlow}
        currentYaml={mockFlow.yamlContent}
        onApplyGeneratedYaml={onApply}
        targetUrl="https://example.com"
      />
    );

    // Mock fetch for generate-flow
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ yaml: 'url: https://example.com\n---\n- navigate: /\n- leftClick: "#checkout"' }),
    } as Response);

    const textarea = screen.getByPlaceholderText(/Generate a complete test suite for Test Project/i);
    fireEvent.change(textarea, { target: { value: 'Add checkout step' } });

    const submitBtn = screen.getByRole('button', { name: /Generate Project Test Steps/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Preview Diff Before Apply')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Preview Diff Before Apply'));

    expect(screen.getByText('AI Step Diff Preview')).toBeInTheDocument();
    expect(screen.getByText('Replace Entire Flow')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Replace Entire Flow'));
    expect(onApply).toHaveBeenCalledWith('url: https://example.com\n---\n- navigate: /\n- leftClick: "#checkout"');
  });

  it('allows previewing diff and appending steps', async () => {
    const onApply = vi.fn();
    render(
      <AiCopilot
        activeProject={mockProject}
        activeFlow={mockFlow}
        currentYaml={mockFlow.yamlContent}
        onApplyGeneratedYaml={onApply}
        targetUrl="https://example.com"
      />
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ yaml: 'url: https://example.com\n---\n- leftClick: "#cart"' }),
    } as Response);

    const textarea = screen.getByPlaceholderText(/Generate a complete test suite for Test Project/i);
    fireEvent.change(textarea, { target: { value: 'Add cart step' } });

    fireEvent.click(screen.getByRole('button', { name: /Generate Project Test Steps/i }));

    await waitFor(() => {
      expect(screen.getByText('Preview Diff Before Apply')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Preview Diff Before Apply'));
    fireEvent.click(screen.getByText('Append Steps to End'));

    expect(onApply).toHaveBeenCalledWith(
      'url: https://example.com\n---\n- navigate: /\n\n# --- Appended AI Steps ---\n- leftClick: "#cart"'
    );
  });
});
