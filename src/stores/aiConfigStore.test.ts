import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { useAiConfigStore } from './aiConfigStore';

// Mock tracyApi
vi.mock('@/src/lib/ipc', () => ({
  tracyApi: {
    loadAiConfig: vi.fn().mockResolvedValue(null),
    saveAiConfig: vi.fn().mockResolvedValue(undefined),
    testAiConnection: vi.fn().mockResolvedValue({ ok: false }),
    runAgentStream: vi.fn().mockResolvedValue(''),
    onAgentStreamChunk: vi.fn().mockResolvedValue(() => {}),
  },
  isElectronEnv: () => true,
}));

describe('aiConfigStore — basic operations', () => {
  // Clean slate between tests
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset all stores after each test
    useAiConfigStore.setState({
      loaded: false,
      selectedAgentId: '',
      agentModels: {},
      agentCredentials: {},
    });
  });

  it('selectAgent sets id', () => {
    useAiConfigStore.getState().selectAgent('claude-code');
    expect(useAiConfigStore.getState().selectedAgentId).toBe('claude-code');
  });

  it('setModel stores valid model ID', () => {
    useAiConfigStore.getState().setModel('byok-openai', 'gpt-4o');
    expect(useAiConfigStore.getState().agentModels['byok-openai']).toBe('gpt-4o');
  });

  it('setModel rejects empty model IDs', () => {
    useAiConfigStore.getState().setModel('byok-openai', '');
    expect(useAiConfigStore.getState().agentModels['byok-openai']).toBeUndefined();
  });

  it('setCredential merges credentials per agent', () => {
    const store = useAiConfigStore.getState();
    store.setCredential('byok-gemini', { apiKey: 'sk-test' });

    const s1 = useAiConfigStore.getState();
    expect(s1.agentCredentials['byok-gemini']?.apiKey).toBe('sk-test');

    store.setCredential('byok-gemini', { customEndpoint: 'http://custom.com/v1' });

    const s2 = useAiConfigStore.getState();
    expect(s2.agentCredentials['byok-gemini']?.customEndpoint).toBe('http://custom.com/v1');
    // Existing apiKey should be preserved
    expect(s2.agentCredentials['byok-gemini']?.apiKey).toBe('sk-test');
  });

  it('loadFromDisk hydrates state when config exists', async () => {
    const mock = {
      selectedAgentId: 'byok-gemini',
      agentModels: {},
      agentCredentials: {},
    };
    const { tracyApi } = await import('@/src/lib/ipc');
    (tracyApi.loadAiConfig as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mock);

    await useAiConfigStore.getState().loadFromDisk();

    const state = useAiConfigStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.selectedAgentId).toBe('byok-gemini');
    expect(state.agentModels).toEqual({});
    expect(state.agentCredentials).toEqual({});
  });

  it('loadFromDisk marks loaded=true even when no config (browser mode)', async () => {
    const { tracyApi } = await import('@/src/lib/ipc');
    (tracyApi.loadAiConfig as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    await useAiConfigStore.getState().loadFromDisk();

    expect(useAiConfigStore.getState().loaded).toBe(true);
  });
});
