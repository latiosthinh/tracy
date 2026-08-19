import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatrixRunnerPanel } from './MatrixRunnerPanel';
import { BrowserWorkerCard } from './BrowserWorkerCard';
import { MatrixResultsGrid } from './MatrixResultsGrid';
import { useMatrixStore } from '@/src/stores/matrixStore';
import { useProjectStore } from '@/src/stores/projectStore';
import type { MatrixExecutionSummary } from '@/src/types/matrix';

describe('Multi-Browser Matrix Runner Components', () => {
  beforeEach(() => {
    useMatrixStore.setState({
      selectedBrowsers: ['chromium', 'firefox', 'webkit'],
      maxConcurrency: 3,
      isMatrixRunning: false,
      activeMatrixRun: null,
      matrixHistory: [],
      selectedBrowserDetail: null,
    });

    useProjectStore.setState({
      projects: [
        {
          id: 'proj-1',
          name: 'Demo App',
          targetUrl: 'https://example.com',
          environment: 'development',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          flows: [
            {
              id: 'flow-checkout',
              name: 'Checkout Flow',
              path: 'flows/checkout.yaml',
              tags: [],
              metadata: {},
              yamlContent: 'url: https://example.com\n---\n- navigate: /cart',
              steps: [
                { id: '1', command: 'navigate', target: '/cart', status: 'pending' },
                { id: '2', command: 'leftClick', target: '#buy', status: 'pending' },
              ],
            },
          ],
          domSnapshots: {},
        },
      ],
      activeProjectId: 'proj-1',
      activeFlowId: 'flow-checkout',
    });
  });

  it('renders matrix runner panel with engine checkboxes and concurrency slider', () => {
    render(<MatrixRunnerPanel />);

    expect(screen.getByText('Multi-Browser Matrix Runner')).toBeInTheDocument();
    expect(screen.getByText('Run Multi-Browser Matrix')).toBeInTheDocument();
    expect(screen.getAllByText('Chromium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Firefox').length).toBeGreaterThan(0);
    expect(screen.getAllByText('WebKit').length).toBeGreaterThan(0);
  });

  it('toggles browser targets and changes concurrency', () => {
    render(<MatrixRunnerPanel />);

    const firefoxCheckbox = screen.getByRole('checkbox', { name: /Firefox/i });
    expect(firefoxCheckbox).toBeChecked();

    fireEvent.click(firefoxCheckbox);
    expect(useMatrixStore.getState().selectedBrowsers).toEqual(['chromium', 'webkit']);

    const slider = screen.getByLabelText('Concurrency Workers');
    fireEvent.change(slider, { target: { value: '4' } });
    expect(useMatrixStore.getState().maxConcurrency).toBe(4);
  });

  it('renders BrowserWorkerCard with live execution progress and failure trace', () => {
    render(
      <BrowserWorkerCard
        browser="chromium"
        workerProgress={{
          browser: 'chromium',
          status: 'running',
          currentStepIndex: 1,
          totalSteps: 2,
          currentStepName: 'Click Buy Button',
          passedCount: 1,
          failedCount: 0,
          durationMs: 1500,
        }}
      />
    );

    expect(screen.getByText('Chromium')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders MatrixResultsGrid comparing cross-browser step results', () => {
    const summary: MatrixExecutionSummary = {
      flowId: 'flow-checkout',
      flowName: 'Checkout Flow',
      timestamp: Date.now(),
      overallStatus: 'passed',
      durationMs: 4200,
      browsers: {
        chromium: {
          browser: 'chromium',
          status: 'passed',
          currentStepIndex: 2,
          totalSteps: 2,
          passedCount: 2,
          failedCount: 0,
          durationMs: 1200,
        },
        firefox: {
          browser: 'firefox',
          status: 'passed',
          currentStepIndex: 2,
          totalSteps: 2,
          passedCount: 2,
          failedCount: 0,
          durationMs: 1800,
        },
        webkit: {
          browser: 'webkit',
          status: 'passed',
          currentStepIndex: 2,
          totalSteps: 2,
          passedCount: 2,
          failedCount: 0,
          durationMs: 1400,
        },
      },
    };

    render(<MatrixResultsGrid summary={summary} />);

    expect(screen.getByText('Checkout Flow')).toBeInTheDocument();
    expect(screen.getByText('1.20s')).toBeInTheDocument();
    expect(screen.getByText('1.80s')).toBeInTheDocument();
  });
});
