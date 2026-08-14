import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProvider } from './ipc/aiProvider';

describe('createProvider', () => {
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
