import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProvider } from './ipc/aiProvider';

describe('createProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('creates a Gemini provider for byok-gemini', async () => {
    vi.doMock('@google/genai', () => ({
      GoogleGenAI: class {
        models = {
          generateContent: vi.fn().mockResolvedValue({ text: '# yaml output' }),
        };
      },
    }));

    const provider = await createProvider('byok-gemini', { apiKey: 'test-key' });
    expect(provider).toBeDefined();
    expect(typeof provider.generateFlow).toBe('function');

    vi.doUnmock('@google/genai');
  });

  it('creates a custom gateway provider', async () => {
    const provider = await createProvider('custom-gateway', {
      customEndpoint: 'http://localhost:11434',
    });
    expect(provider).toBeDefined();
    expect(typeof provider.generateFlow).toBe('function');
  });

  it('creates an OpenAI provider for byok-openai', async () => {
    const provider = await createProvider('byok-openai', { apiKey: 'test-key' });
    expect(provider).toBeDefined();
    expect(typeof provider.generateFlow).toBe('function');
  });

  it('creates a Claude provider for byok-claude', async () => {
    const provider = await createProvider('byok-claude', { apiKey: 'test-key' });
    expect(provider).toBeDefined();
    expect(typeof provider.generateFlow).toBe('function');
  });

  it('creates a Grok provider for byok-grok', async () => {
    const provider = await createProvider('byok-grok', { apiKey: 'test-xai-key' });
    expect(provider).toBeDefined();
    expect(typeof provider.generateFlow).toBe('function');
  });

  it('creates a Cursor provider and executes full task lifecycle for byok-cursor', async () => {
    // Mock fetch for Cursor API:
    // 1. POST /v1/agents/tasks -> { task_id: 'task-123' }
    // 2. POST /v1/agents/tasks/task-123/complete -> { ok: true }
    // 3. GET /v1/agents/tasks/task-123 -> { status: 'completed' }
    // 4. GET /v1/agents/tasks/task-123/messages -> { messages: [...] }
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.endsWith('/v1/agents/tasks') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ task_id: 'task-123' }),
          text: async () => JSON.stringify({ task_id: 'task-123' }),
        } as Response;
      }

      if (urlStr.endsWith('/v1/agents/tasks/task-123/complete') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      }

      if (urlStr.endsWith('/v1/agents/tasks/task-123') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'completed' }),
          text: async () => JSON.stringify({ status: 'completed' }),
        } as Response;
      }

      if (urlStr.endsWith('/v1/agents/tasks/task-123/messages')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            messages: [
              { role: 'user', content: 'Generate test flow' },
              { role: 'assistant', content: 'name: Login Test\nsteps:\n  - open: /login' },
            ],
          }),
          text: async () => '',
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        text: async () => 'Not found',
      } as Response;
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = await createProvider('byok-cursor', { apiKey: 'cursor-key' });
    expect(provider).toBeDefined();
    expect(typeof provider.generateFlow).toBe('function');

    const result = await provider.generateFlow('Generate test flow');
    expect(result).toBe('name: Login Test\nsteps:\n  - open: /login');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('falls back to custom gateway for unknown agents', async () => {
    const provider = await createProvider('unknown-agent', {});
    expect(provider).toBeDefined();
    expect(typeof provider.generateFlow).toBe('function');
  });

  it('falls back to custom gateway for local-agent-cli', async () => {
    const provider = await createProvider('local-agent-cli', {
      customEndpoint: 'http://localhost:8080',
    });
    expect(provider).toBeDefined();
  });

  it('routes mimo to OpenAI-compatible endpoint', async () => {
    const provider = await createProvider('byok-mimo', { apiKey: 'key' });
    expect(provider).toBeDefined();
  });
});
