import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkMockManager } from '../core/network/networkMockManager';

// Mock dependencies
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: vi.fn().mockReturnValue([]),
  },
  WebContentsView: vi.fn(),
}));

vi.mock('playwright-core', () => ({
  chromium: {
    connectOverCDP: vi.fn(),
  },
}));

vi.mock('dom-miner', () => ({
  runCompactObserve: vi.fn(),
  formatCompactTree: vi.fn(),
  authenticate: vi.fn(),
}));

vi.mock('../core/healing/selfHealingRunner.js', () => ({
  executeStepWithHealing: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../core/healing/artifactManager.js', () => ({
  saveHealArtifacts: vi.fn().mockResolvedValue({}),
  saveFailureArtifacts: vi.fn().mockResolvedValue({}),
}));

describe('playwrightEngine NetworkMockManager integration (TDD RED)', () => {
  let mockContext: any;
  let mockPage: any;
  let mockEvent: any;
  let handlers: Record<string, Function> = {};

  beforeEach(async () => {
    vi.clearAllMocks();
    handlers = {};

    const { ipcMain } = await import('electron');
    (ipcMain.handle as any).mockImplementation((channel: string, fn: Function) => {
      handlers[channel] = fn;
    });

    mockPage = {
      url: vi.fn().mockReturnValue('http://localhost:3000/app'),
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      title: vi.fn().mockResolvedValue('Test App'),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('fake')),
      mouse: { wheel: vi.fn() },
      setViewportSize: vi.fn(),
      evaluate: vi.fn(),
      locator: vi.fn(),
      getByText: vi.fn(),
      getByTestId: vi.fn(),
      getByRole: vi.fn(),
      getByLabel: vi.fn(),
      getByPlaceholder: vi.fn(),
    };

    mockContext = {
      pages: vi.fn().mockReturnValue([mockPage]),
      route: vi.fn().mockResolvedValue(undefined),
      routeFromHAR: vi.fn().mockResolvedValue(undefined),
      unrouteAll: vi.fn().mockResolvedValue(undefined),
    };

    const { chromium } = await import('playwright-core');
    (chromium.connectOverCDP as any).mockResolvedValue({
      contexts: vi.fn().mockReturnValue([mockContext]),
    });

    mockEvent = {
      sender: {
        isDestroyed: vi.fn().mockReturnValue(false),
        send: vi.fn(),
      },
    };
  });

  it('registers flow.metadata.mocks on mockManager and cleans up after execution', async () => {
    const { registerPlaywrightHandlers } = await import('./playwrightEngine');
    registerPlaywrightHandlers();

    const runFlowHandler = handlers['run_flow'];
    expect(runFlowHandler).toBeDefined();

    const flow = {
      name: 'Mock Test Flow',
      metadata: {
        mocks: [
          { url: '**/api/v1/users', status: 200, body: [{ id: 1, name: 'Alice' }] },
        ],
      },
      steps: [
        { command: 'navigate', value: 'http://localhost:3000/users' },
      ],
    };

    // Spy on NetworkMockManager prototype attachToContext, addRule, cleanup
    const attachSpy = vi.spyOn(NetworkMockManager.prototype, 'attachToContext');
    const addRuleSpy = vi.spyOn(NetworkMockManager.prototype, 'addRule');
    const cleanupSpy = vi.spyOn(NetworkMockManager.prototype, 'cleanup');

    await runFlowHandler(mockEvent, { flow, targetBaseUrl: 'http://localhost:3000', speedMs: 0 });

    expect(attachSpy).toHaveBeenCalled();
    expect(addRuleSpy).toHaveBeenCalledWith(expect.objectContaining({ url: '**/api/v1/users' }));
    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('handles step actions: mockRoute, unmockRoute, replayHar, assertRequest', async () => {
    const { registerPlaywrightHandlers } = await import('./playwrightEngine');
    registerPlaywrightHandlers();

    const runFlowHandler = handlers['run_flow'];

    const flow = {
      name: 'Network Steps Flow',
      steps: [
        { command: 'mockRoute', value: '**/api/checkout', args: { status: 201, body: { orderId: 'ord_123' } } },
        { command: 'replayHar', value: 'fixtures/demo.har', args: { notFound: 'fallback' } },
        { command: 'assertRequest', value: '**/api/checkout', args: { method: 'POST', count: 0 } },
        { command: 'unmockRoute', value: '**/api/checkout' },
      ],
    };

    const addRuleSpy = vi.spyOn(NetworkMockManager.prototype, 'addRule');
    const attachHarSpy = vi.spyOn(NetworkMockManager.prototype, 'attachHarReplay');
    const assertRequestSpy = vi.spyOn(NetworkMockManager.prototype, 'assertRequest');
    const removeRuleSpy = vi.spyOn(NetworkMockManager.prototype, 'removeRule');

    await runFlowHandler(mockEvent, { flow, targetBaseUrl: 'http://localhost:3000', speedMs: 0 });

    expect(addRuleSpy).toHaveBeenCalled();
    expect(attachHarSpy).toHaveBeenCalled();
    expect(assertRequestSpy).toHaveBeenCalled();
    expect(removeRuleSpy).toHaveBeenCalled();
  });

  it('fails step and stops execution when assertRequest fails', async () => {
    const { registerPlaywrightHandlers } = await import('./playwrightEngine');
    registerPlaywrightHandlers();

    const runFlowHandler = handlers['run_flow'];

    const flow = {
      name: 'Failing Assert Flow',
      steps: [
        // Expected count: 1, but actual captured is 0 -> should fail
        { command: 'assertRequest', value: '**/api/must-exist', args: { count: 1 } },
        { command: 'navigate', value: 'http://localhost:3000/never-reached' },
      ],
    };

    await runFlowHandler(mockEvent, { flow, targetBaseUrl: 'http://localhost:3000', speedMs: 0 });

    // Verify step-update failed for step 0
    const stepUpdates = mockEvent.sender.send.mock.calls
      .filter(([channel]: [string]) => channel === 'step-update')
      .map(([, payload]: [any, any]) => payload);

    expect(stepUpdates.some((u: any) => u.stepIndex === 0 && u.status === 'failed')).toBe(true);
    // Step 1 should never run
    expect(stepUpdates.some((u: any) => u.stepIndex === 1 && u.status === 'running')).toBe(false);
  });
});
