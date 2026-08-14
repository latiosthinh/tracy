export interface AiProviderConfig {
  apiKey?: string;
  customEndpoint?: string;
  model?: string;
}

export interface AiProvider {
  generateFlow(prompt: string, systemInstruction?: string): Promise<string>;
}

async function createGeminiProvider(config: AiProviderConfig): Promise<AiProvider> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.GEMINI_API_KEY || '' });
  const model = config.model || 'gemini-2.5-flash';

  return {
    async generateFlow(prompt: string, systemInstruction?: string): Promise<string> {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || 'You are a test automation engineer. Generate valid YAML test flows for the Tracy E2E testing framework. Return only YAML, no markdown fences.',
        },
      });
      return response.text || '';
    },
  };
}

async function createOpenAiProvider(config: AiProviderConfig): Promise<AiProvider> {
  const endpoint = config.customEndpoint || 'https://api.openai.com/v1';
  const model = config.model || 'gpt-4o-mini';

  return {
    async generateFlow(prompt: string, systemInstruction?: string): Promise<string> {
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemInstruction || 'You are a test automation engineer. Generate valid YAML test flows.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error (${res.status}): ${err}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    },
  };
}

async function createClaudeProvider(config: AiProviderConfig): Promise<AiProvider> {
  const endpoint = config.customEndpoint || 'https://api.anthropic.com';
  const model = config.model || 'claude-sonnet-4-20250514';

  return {
    async generateFlow(prompt: string, systemInstruction?: string): Promise<string> {
      const res = await fetch(`${endpoint}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemInstruction || 'You are a test automation engineer. Generate valid YAML test flows.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error (${res.status}): ${err}`);
      }

      const data = await res.json();
      return data.content?.[0]?.text || '';
    },
  };
}

async function createCustomGatewayProvider(config: AiProviderConfig): Promise<AiProvider> {
  const endpoint = config.customEndpoint || 'http://localhost:11434';

  return {
    async generateFlow(prompt: string, systemInstruction?: string): Promise<string> {
      const res = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'llama3.2',
          messages: [
            { role: 'system', content: systemInstruction || 'You are a test automation engineer. Generate valid YAML test flows.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Custom gateway error (${res.status}): ${err}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    },
  };
}

export async function createProvider(
  agentId: string,
  config: AiProviderConfig = {}
): Promise<AiProvider> {
  switch (agentId) {
    case 'byok-gemini':
    case 'gemini-cli':
    case 'gemini-3.6-flash':
      return createGeminiProvider(config);

    case 'byok-openai':
      return createOpenAiProvider(config);

    case 'byok-claude':
    case 'claude-code':
      return createClaudeProvider(config);

    case 'byok-mimo':
      return createOpenAiProvider({
        ...config,
        customEndpoint: config.customEndpoint || 'https://api.xiaomimimo.com/v1',
      });

    case 'custom-gateway':
    case 'local-agent-cli':
      return createCustomGatewayProvider(config);

    default:
      // Fallback: try as custom OpenAI-compatible endpoint
      return createCustomGatewayProvider(config);
  }
}
