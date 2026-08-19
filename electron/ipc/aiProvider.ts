// NOTE: relative import — the electron main build does not resolve the '@/' alias.
import { getAgentDef, resolveAgentId } from '../../src/lib/aiRegistry';
import type { ToolDefinition } from '../../src/types/skills';

export interface AiProviderConfig {
  apiKey?: string;
  customEndpoint?: string;
  model?: string;
}

export const QA_AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'validate_selector',
    description: 'Validates if a selector exists, is unique, visible, and clickable in the active project webview DOM.',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'The selector to validate (CSS, XPath, text=, role=, or auto-detected). Max 1000 chars.',
        },
        selectorType: {
          type: 'string',
          description: 'Explicit probe type.',
          enum: ['css', 'xpath', 'text', 'aria', 'auto'],
        },
        expectedTag: {
          type: 'string',
          description: 'Optional expected HTML tag name (e.g., button, input, a). Alphanumeric only.',
        },
        targetText: {
          type: 'string',
          description: 'Optional expected element text or substring.',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'find_elements_by_text',
    description: 'Searches the active webview DOM for visible elements containing or exactly matching text and returns candidate locators.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to search for within page elements.',
        },
        exact: {
          type: 'boolean',
          description: 'Whether to match exact text or substring.',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'inspect_element',
    description: 'Inspects detailed attributes, computed roles, test IDs, and bounding boxes for elements matching a selector.',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Target selector to inspect in detail.',
        },
      },
      required: ['selector'],
    },
  },
];

export interface GoogleFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface OpenAiToolDeclaration {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
      }>;
      required?: string[];
    };
  };
}

export interface AnthropicToolDeclaration {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface ParsedToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export function formatToolsForGoogle(tools: ToolDefinition[]): GoogleFunctionDeclaration[] {
  return tools.map((tool) => {
    const properties: Record<string, { type: string; description?: string; enum?: string[] }> = {};
    for (const [key, param] of Object.entries(tool.parameters.properties || {})) {
      properties[key] = {
        type: param.type.toUpperCase(),
        ...(param.description ? { description: param.description } : {}),
        ...(param.enum ? { enum: param.enum } : {}),
      };
    }
    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'OBJECT',
        properties,
        ...(tool.parameters.required ? { required: tool.parameters.required } : {}),
      },
    };
  });
}

export function formatToolsForOpenAi(tools: ToolDefinition[]): OpenAiToolDeclaration[] {
  return tools.map((tool) => {
    const properties: Record<string, { type: string; description?: string; enum?: string[] }> = {};
    for (const [key, param] of Object.entries(tool.parameters.properties || {})) {
      properties[key] = {
        type: param.type,
        ...(param.description ? { description: param.description } : {}),
        ...(param.enum ? { enum: param.enum } : {}),
      };
    }
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties,
          ...(tool.parameters.required ? { required: tool.parameters.required } : {}),
        },
      },
    };
  });
}

export function formatToolsForAnthropic(tools: ToolDefinition[]): AnthropicToolDeclaration[] {
  return tools.map((tool) => {
    const properties: Record<string, { type: string; description?: string; enum?: string[] }> = {};
    for (const [key, param] of Object.entries(tool.parameters.properties || {})) {
      properties[key] = {
        type: param.type,
        ...(param.description ? { description: param.description } : {}),
        ...(param.enum ? { enum: param.enum } : {}),
      };
    }
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties,
        ...(tool.parameters.required ? { required: tool.parameters.required } : {}),
      },
    };
  });
}

export function sanitizeToolArguments(name: string, rawArgs: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...rawArgs };
  if (typeof sanitized.selector === 'string') {
    sanitized.selector = sanitized.selector.trim().slice(0, 1000);
  }
  if (typeof sanitized.expectedTag === 'string') {
    sanitized.expectedTag = sanitized.expectedTag.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
  }
  if (typeof sanitized.targetText === 'string') {
    sanitized.targetText = sanitized.targetText.slice(0, 500);
  }
  if (typeof sanitized.text === 'string') {
    sanitized.text = sanitized.text.slice(0, 500);
  }
  return sanitized;
}

export function parseGoogleToolCalls(response: any): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const candidates = response?.candidates || (response?.response?.candidates);
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part?.functionCall) {
            const fc = part.functionCall;
            const args = fc.args || {};
            calls.push({
              id: fc.id || undefined,
              name: fc.name,
              arguments: sanitizeToolArguments(fc.name, typeof args === 'object' && args !== null ? args : {}),
            });
          }
        }
      }
    }
  }

  // Also check top-level functionCalls array if present on SDK response
  if (calls.length === 0 && Array.isArray(response?.functionCalls)) {
    for (const fc of response.functionCalls) {
      if (fc?.name) {
        const args = fc.args || {};
        calls.push({
          id: fc.id || undefined,
          name: fc.name,
          arguments: sanitizeToolArguments(fc.name, typeof args === 'object' && args !== null ? args : {}),
        });
      }
    }
  }

  return calls;
}

export function parseOpenAiToolCalls(responseBody: any): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const choice = responseBody?.choices?.[0];
  const message = choice?.message || choice?.delta;
  const toolCalls = message?.tool_calls;

  if (Array.isArray(toolCalls)) {
    for (const tc of toolCalls) {
      if (tc.type === 'function' && tc.function?.name) {
        let args: Record<string, unknown> = {};
        if (typeof tc.function.arguments === 'string') {
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            args = {};
          }
        } else if (typeof tc.function.arguments === 'object' && tc.function.arguments !== null) {
          args = tc.function.arguments;
        }
        calls.push({
          id: tc.id || undefined,
          name: tc.function.name,
          arguments: sanitizeToolArguments(tc.function.name, args),
        });
      }
    }
  }

  return calls;
}

export function parseAnthropicToolCalls(responseBody: any): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const content = responseBody?.content;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'tool_use' && block?.name) {
        const input = block.input || {};
        calls.push({
          id: block.id || undefined,
          name: block.name,
          arguments: sanitizeToolArguments(block.name, typeof input === 'object' && input !== null ? input : {}),
        });
      }
    }
  }

  return calls;
}

export function formatGoogleToolResult(callId: string | undefined, name: string, result: unknown): Record<string, unknown> {
  return {
    functionResponse: {
      name,
      response: {
        output: typeof result === 'string' ? redactSecrets(result) : result,
      },
      ...(callId ? { id: callId } : {}),
    },
  };
}

export function formatOpenAiToolResult(callId: string | undefined, name: string, result: unknown): Record<string, unknown> {
  return {
    role: 'tool',
    tool_call_id: callId || name,
    content: typeof result === 'string' ? redactSecrets(result) : redactSecrets(JSON.stringify(result)),
  };
}

export function formatAnthropicToolResult(callId: string | undefined, name: string, result: unknown): Record<string, unknown> {
  return {
    type: 'tool_result',
    tool_use_id: callId || name,
    content: typeof result === 'string' ? redactSecrets(result) : redactSecrets(JSON.stringify(result)),
  };
}

export interface AiProvider {
  generateFlow(prompt: string, systemInstruction?: string): Promise<string>;
}

const HTTP_REQUEST_TIMEOUT = 180_000;

function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-…')
    .replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, 'sk-ant-…')
    .replace(/\bBearer [A-Za-z0-9._-]+/g, 'Bearer …')
    .replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, '$1: …')
    .replace(/key=[A-Za-z0-9_-]+/gi, 'key=…')
    .replace(/AIza[A-Za-z0-9_-]{3,}/g, 'AIza…');
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
        signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error (${res.status}): ${redactSecrets(err)}`);
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
        signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error (${res.status}): ${redactSecrets(err)}`);
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
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model || 'llama3.2',
          messages: [
            { role: 'system', content: systemInstruction || 'You are a test automation engineer. Generate valid YAML test flows.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Custom gateway error (${res.status}): ${redactSecrets(err)}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    },
  };
}

async function createCursorApiProvider(config: AiProviderConfig): Promise<AiProvider> {
  const endpoint = (config.customEndpoint || 'https://api.cursor.com').replace(/\/+$/, '');
  const model = config.model || 'cursor-fast';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  };

  return {
    async generateFlow(prompt: string, systemInstruction?: string): Promise<string> {
      // 1. Create task
      const userContent = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
      const createRes = await fetch(`${endpoint}/v1/agents/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: userContent }],
        }),
        signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT),
      });

      if (!createRes.ok) {
        const err = await createRes.text().catch(() => '');
        throw new Error(`Cursor API error (${createRes.status}): ${redactSecrets(err)}`);
      }

      const createData = (await createRes.json()) as { task_id?: string; id?: string };
      const taskId = createData.task_id || createData.id;
      if (!taskId) {
        throw new Error('Cursor API error: No task_id returned');
      }

      // 2. Trigger task completion / processing
      const completeRes = await fetch(`${endpoint}/v1/agents/tasks/${taskId}/complete`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT),
      });

      if (!completeRes.ok) {
        const err = await completeRes.text().catch(() => '');
        throw new Error(`Cursor API error (${completeRes.status}): ${redactSecrets(err)}`);
      }

      // 3. Poll until completed or terminal error (cap 5 min = 150 iterations @ 2s)
      const maxIterations = 150;
      let completed = false;

      for (let i = 0; i < maxIterations; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const pollRes = await fetch(`${endpoint}/v1/agents/tasks/${taskId}`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(15_000),
        });

        if (!pollRes.ok) {
          const err = await pollRes.text().catch(() => '');
          throw new Error(`Cursor API error (${pollRes.status}): ${redactSecrets(err)}`);
        }

        const pollData = (await pollRes.json()) as { state?: string; status?: string };
        const status = (pollData.status || pollData.state || '').toLowerCase();

        if (status === 'completed') {
          completed = true;
          break;
        } else if (['error', 'failed', 'cancelled', 'expired'].includes(status)) {
          throw new Error(`Cursor agent task failed with status '${status}': ${redactSecrets(JSON.stringify(pollData))}`);
        }
      }

      if (!completed) {
        throw new Error('Cursor agent task timed out');
      }

      // 4. Fetch messages (handle pagination if has_more)
      const allMessages: Array<{ role?: string; content?: string | Array<{ text?: string; type?: string }> }> = [];
      let cursor: string | undefined = undefined;

      while (true) {
        const queryUrl = cursor
          ? `${endpoint}/v1/agents/tasks/${taskId}/messages?cursor=${encodeURIComponent(cursor)}`
          : `${endpoint}/v1/agents/tasks/${taskId}/messages`;

        const msgRes = await fetch(queryUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(15_000),
        });

        if (!msgRes.ok) {
          const err = await msgRes.text().catch(() => '');
          throw new Error(`Cursor API error (${msgRes.status}): ${redactSecrets(err)}`);
        }

        const msgData = (await msgRes.json()) as
          | {
              messages?: Array<{ role?: string; content?: string | Array<{ text?: string; type?: string }> }>;
              has_more?: boolean;
              next_cursor?: string;
            }
          | Array<{ role?: string; content?: string | Array<{ text?: string; type?: string }> }>;

        if (Array.isArray(msgData)) {
          allMessages.push(...msgData);
          break;
        } else {
          allMessages.push(...(msgData.messages || []));
          if (msgData.has_more && msgData.next_cursor) {
            cursor = msgData.next_cursor;
          } else {
            break;
          }
        }
      }

      const assistantMessages = allMessages.filter((m) => m.role === 'assistant');
      const lastMsg = assistantMessages[assistantMessages.length - 1];

      if (!lastMsg || !lastMsg.content) {
        throw new Error('Cursor agent returned empty response');
      }

      let text = '';
      if (typeof lastMsg.content === 'string') {
        text = lastMsg.content;
      } else if (Array.isArray(lastMsg.content)) {
        text = lastMsg.content
          .map((part) => (typeof part === 'string' ? part : part.text || ''))
          .join('');
      }

      if (!text.trim()) {
        throw new Error('Cursor agent returned empty response');
      }

      return text;
    },
  };
}

/** SSE-style stream handler for OpenAI-compatible APIs (OpenAI, Mimo, Custom Gateway). */
async function streamFromSSE(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error (${res.status}): ${redactSecrets(err)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';

  // Accumulate SSE lines since the SDK may chunk them unpredictably
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete last line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        // OpenAI-compatible: choices[0].delta.content
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') {
          full += delta;
          onChunk(delta);
        }
      } catch {
        // Not JSON — might be partial SSE data; skip silently
      }
    }
  }

  return full;
}

/** SSE stream handler for Anthropic's streaming API. */
async function streamFromAnthropic(
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const res = await fetch(`${endpoint}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error (${res.status}): ${redactSecrets(err)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.slice(6);
      if (!dataStr) continue;

      try {
        const parsed = JSON.parse(dataStr);
        // Anthropic SSE events: type=content_block_delta, delta={text}
        if (parsed.type === 'content_block_delta' && typeof parsed.delta?.text === 'string') {
          full += parsed.delta.text;
          onChunk(parsed.delta.text);
        }
      } catch {
        // Skip non-JSON SSE chunks
      }
    }
  }

  return full;
}

// Extended provider types with optional streaming
interface StreamingProvider extends AiProvider {
  generateFlowStream?(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string>;
}

export async function createProvider(
  agentId: string,
  config: AiProviderConfig = {},
): Promise<AiProvider & { generateFlowStream?: AiProvider['generateFlow'] }> {
  const def = getAgentDef(resolveAgentId(agentId));

  if (def?.protocol) {
    switch (def.protocol) {
      case 'google':
        return createGeminiProviderWithStreaming(config);

      case 'openai':
        return createOpenAiProviderWithStreaming({
          ...config,
          customEndpoint: config.customEndpoint || def.defaultEndpoint,
        });

      case 'anthropic':
        return createClaudeProviderWithStreaming({
          ...config,
          customEndpoint: config.customEndpoint || def.defaultEndpoint,
        });

      case 'openai-compat':
        return createCustomGatewayWithStreaming({
          ...config,
          customEndpoint: config.customEndpoint || def.defaultEndpoint,
        });

      case 'cursor':
        return createCursorProviderWithStreaming({
          ...config,
          customEndpoint: config.customEndpoint || def.defaultEndpoint,
        });
    }
  }

  // CLI defs (no protocol) and unknown ids → fallback to custom gateway
  return createCustomGatewayWithStreaming(config);
}

async function createOpenAiProviderWithStreaming(config: AiProviderConfig): Promise<StreamingProvider> {
  const baseImpl = await createOpenAiProvider(config);
  const endpoint = config.customEndpoint || 'https://api.openai.com/v1';
  const model = config.model || 'gpt-4o-mini';

  return {
    generateFlow: baseImpl.generateFlow.bind(baseImpl),
    async generateFlowStream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string> {
      if (onChunk) {
        return streamFromSSE(`${endpoint}/chat/completions`, {
          model,
          stream: true,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: systemInstruction || 'You are a test automation engineer. Generate valid YAML test flows.' },
            { role: 'user', content: prompt },
          ],
        }, config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}, onChunk);
      }
      return baseImpl.generateFlow(prompt, systemInstruction);
    },
  };
}

async function createClaudeProviderWithStreaming(config: AiProviderConfig): Promise<StreamingProvider> {
  const baseImpl = await createClaudeProvider(config);
  const endpoint = config.customEndpoint || 'https://api.anthropic.com';
  const model = config.model || 'claude-sonnet-4-20250514';

  return {
    generateFlow: baseImpl.generateFlow.bind(baseImpl),
    async generateFlowStream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string> {
      if (onChunk) {
        return streamFromAnthropic(endpoint, config.apiKey || '', {
          model,
          max_tokens: 4096,
          system: systemInstruction || 'You are a test automation engineer. Generate valid YAML test flows.',
          messages: [{ role: 'user', content: prompt }],
        }, onChunk);
      }
      return baseImpl.generateFlow(prompt, systemInstruction);
    },
  };
}

async function createCustomGatewayWithStreaming(config: AiProviderConfig): Promise<StreamingProvider> {
  const baseImpl = await createCustomGatewayProvider(config);
  const endpoint = config.customEndpoint || 'http://localhost:11434';
  const model = config.model || 'llama3.2';

  return {
    generateFlow: baseImpl.generateFlow.bind(baseImpl),
    async generateFlowStream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string> {
      if (onChunk) {
        return streamFromSSE(`${endpoint}/v1/chat/completions`, {
          model,
          stream: true,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemInstruction || 'You are a test automation engineer. Generate valid YAML test flows.' },
            { role: 'user', content: prompt },
          ],
        }, {}, onChunk);
      }
      return baseImpl.generateFlow(prompt, systemInstruction);
    },
  };
}

async function createCursorProviderWithStreaming(config: AiProviderConfig): Promise<StreamingProvider> {
  const baseImpl = await createCursorApiProvider(config);
  return {
    generateFlow: baseImpl.generateFlow.bind(baseImpl),
    async generateFlowStream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string> {
      if (onChunk) {
        onChunk('[cursor] task created…\n');
        onChunk('[cursor] agent running…\n');
      }
      const result = await baseImpl.generateFlow(prompt, systemInstruction);
      if (onChunk) {
        onChunk(result);
      }
      return result;
    },
  };
}

async function createGeminiProviderWithStreaming(config: AiProviderConfig): Promise<StreamingProvider> {
  const baseImpl = await createGeminiProvider(config);
  return {
    generateFlow: baseImpl.generateFlow.bind(baseImpl),
    async generateFlowStream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string> {
      const result = await baseImpl.generateFlow(prompt, systemInstruction);
      if (onChunk) onChunk(result);
      return result;
    },
  };
}
