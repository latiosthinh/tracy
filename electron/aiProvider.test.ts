import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createProvider,
  QA_AGENT_TOOLS,
  formatToolsForGoogle,
  formatToolsForOpenAi,
  formatToolsForAnthropic,
  parseGoogleToolCalls,
  parseOpenAiToolCalls,
  parseAnthropicToolCalls,
  formatGoogleToolResult,
  formatOpenAiToolResult,
  formatAnthropicToolResult,
  sanitizeToolArguments,
  executeAgentToolLoop,
} from './ipc/aiProvider';

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

  it('handles terminal failure states (cancelled, expired, failed) in Cursor provider', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.endsWith('/v1/agents/tasks') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ task_id: 'task-cancelled' }),
        } as Response;
      }

      if (urlStr.endsWith('/v1/agents/tasks/task-cancelled/complete') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        } as Response;
      }

      if (urlStr.endsWith('/v1/agents/tasks/task-cancelled') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'cancelled' }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = await createProvider('byok-cursor', { apiKey: 'cursor-key' });
    await expect(provider.generateFlow('test prompt')).rejects.toThrow(/Cursor agent task failed with status 'cancelled'/);
  });

  it('handles message pagination in Cursor provider', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.endsWith('/v1/agents/tasks') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ task_id: 'task-paged' }),
        } as Response;
      }

      if (urlStr.endsWith('/v1/agents/tasks/task-paged/complete') && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        } as Response;
      }

      if (urlStr.endsWith('/v1/agents/tasks/task-paged') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'completed' }),
        } as Response;
      }

      if (urlStr.includes('/v1/agents/tasks/task-paged/messages')) {
        if (urlStr.includes('cursor=page2')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              messages: [
                { role: 'assistant', content: 'name: Paged Flow\nsteps: []' },
              ],
              has_more: false,
            }),
          } as Response;
        } else {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              messages: [
                { role: 'user', content: 'Generate test flow' },
              ],
              has_more: true,
              next_cursor: 'page2',
            }),
          } as Response;
        }
      }

      return { ok: false, status: 404 } as Response;
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = await createProvider('byok-cursor', { apiKey: 'cursor-key' });
    const result = await provider.generateFlow('Generate test flow');
    expect(result).toBe('name: Paged Flow\nsteps: []');
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

describe('QA Tool Definitions and Multi-Provider Translators', () => {
  it('defines canonical QA_AGENT_TOOLS with proper names and required parameters', () => {
    expect(QA_AGENT_TOOLS).toHaveLength(3);
    const toolNames = QA_AGENT_TOOLS.map((t) => t.name);
    expect(toolNames).toContain('validate_selector');
    expect(toolNames).toContain('find_elements_by_text');
    expect(toolNames).toContain('inspect_element');

    const validateTool = QA_AGENT_TOOLS.find((t) => t.name === 'validate_selector');
    expect(validateTool?.parameters.required).toEqual(['selector']);
    expect(validateTool?.parameters.properties.selector.type).toBe('string');
    expect(validateTool?.parameters.properties.selectorType.enum).toContain('css');

    const textTool = QA_AGENT_TOOLS.find((t) => t.name === 'find_elements_by_text');
    expect(textTool?.parameters.required).toEqual(['text']);

    const inspectTool = QA_AGENT_TOOLS.find((t) => t.name === 'inspect_element');
    expect(inspectTool?.parameters.required).toEqual(['selector']);
  });

  it('translates tools to Google GenAI format (OBJECT type uppercase)', () => {
    const googleTools = formatToolsForGoogle(QA_AGENT_TOOLS);
    expect(googleTools).toHaveLength(3);
    expect(googleTools[0].name).toBe('validate_selector');
    expect(googleTools[0].parameters.type).toBe('OBJECT');
    expect(googleTools[0].parameters.properties.selector.type).toBe('STRING');
    expect(googleTools[0].parameters.properties.selectorType.enum).toContain('css');
    expect(googleTools[0].parameters.required).toEqual(['selector']);
  });

  it('translates tools to OpenAI function tools format', () => {
    const openAiTools = formatToolsForOpenAi(QA_AGENT_TOOLS);
    expect(openAiTools).toHaveLength(3);
    expect(openAiTools[0].type).toBe('function');
    expect(openAiTools[0].function.name).toBe('validate_selector');
    expect(openAiTools[0].function.parameters.type).toBe('object');
    expect(openAiTools[0].function.parameters.properties.selector.type).toBe('string');
    expect(openAiTools[0].function.parameters.required).toEqual(['selector']);
  });

  it('translates tools to Anthropic input_schema format', () => {
    const anthropicTools = formatToolsForAnthropic(QA_AGENT_TOOLS);
    expect(anthropicTools).toHaveLength(3);
    expect(anthropicTools[0].name).toBe('validate_selector');
    expect(anthropicTools[0].input_schema.type).toBe('object');
    expect(anthropicTools[0].input_schema.properties.selector.type).toBe('string');
    expect(anthropicTools[0].input_schema.required).toEqual(['selector']);
  });

  it('sanitizes tool arguments against tampering and payload bounding', () => {
    const rawArgs = {
      selector: '  div.my-button  ' + 'a'.repeat(2000),
      expectedTag: 'button<script>alert(1)</script>',
      targetText: 'Submit form',
    };
    const sanitized = sanitizeToolArguments('validate_selector', rawArgs);
    expect((sanitized.selector as string).length).toBeLessThanOrEqual(1000);
    expect(sanitized.expectedTag).toBe('buttonscriptalert1script');
    expect(sanitized.targetText).toBe('Submit form');
  });

  it('parses Google GenAI tool calls from response structure', () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'validate_selector',
                  args: { selector: '#submit-btn', selectorType: 'css' },
                },
              },
            ],
          },
        },
      ],
    };

    const parsed = parseGoogleToolCalls(mockResponse);
    expect(parsed).toEqual([
      {
        id: undefined,
        name: 'validate_selector',
        arguments: { selector: '#submit-btn', selectorType: 'css' },
      },
    ]);
  });

  it('parses OpenAI tool calls from response structure', () => {
    const mockOpenAiResponse = {
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'find_elements_by_text',
                  arguments: JSON.stringify({ text: 'Sign In', exact: true }),
                },
              },
            ],
          },
        },
      ],
    };

    const parsed = parseOpenAiToolCalls(mockOpenAiResponse);
    expect(parsed).toEqual([
      {
        id: 'call_123',
        name: 'find_elements_by_text',
        arguments: { text: 'Sign In', exact: true },
      },
    ]);
  });

  it('parses Anthropic tool calls from content blocks', () => {
    const mockAnthropicResponse = {
      content: [
        {
          type: 'tool_use',
          id: 'toolu_abc',
          name: 'inspect_element',
          input: { selector: '.user-card' },
        },
      ],
    };

    const parsed = parseAnthropicToolCalls(mockAnthropicResponse);
    expect(parsed).toEqual([
      {
        id: 'toolu_abc',
        name: 'inspect_element',
        arguments: { selector: '.user-card' },
      },
    ]);
  });

  it('formats tool results for Google, OpenAI, and Anthropic while redacting secrets', () => {
    const resultObj = { valid: true, matchCount: 1, key: 'sk-1234567890abcdef' };

    const googleResult = formatGoogleToolResult('fc_1', 'validate_selector', resultObj);
    expect(googleResult).toEqual({
      functionResponse: {
        name: 'validate_selector',
        response: {
          output: { valid: true, matchCount: 1, key: 'sk-1234567890abcdef' },
        },
        id: 'fc_1',
      },
    });

    const openAiResult = formatOpenAiToolResult('call_1', 'validate_selector', resultObj);
    expect(openAiResult.role).toBe('tool');
    expect(openAiResult.tool_call_id).toBe('call_1');
    expect(openAiResult.content).not.toContain('sk-1234567890abcdef');
    expect(openAiResult.content).toContain('sk-…');

    const anthropicResult = formatAnthropicToolResult('toolu_1', 'validate_selector', resultObj);
    expect(anthropicResult.type).toBe('tool_result');
    expect(anthropicResult.tool_use_id).toBe('toolu_1');
    expect(anthropicResult.content).toContain('sk-…');
  });
});

describe('executeAgentToolLoop', () => {
  it('executes multi-turn tool calling and returns final YAML flow', async () => {
    let turnCount = 0;
    const mockProvider = vi.fn(async (messages: any[]) => {
      turnCount++;
      if (turnCount === 1) {
        return {
          choices: [
            {
              message: {
                content: 'Checking selector for login button...',
                tool_calls: [
                  {
                    id: 'call_1',
                    type: 'function',
                    function: {
                      name: 'validate_selector',
                      arguments: JSON.stringify({ selector: '#login-btn' }),
                    },
                  },
                ],
              },
            },
          ],
        };
      }
      return {
        text: 'name: Validated Login Flow\nsteps:\n  - click: "#login-btn"',
      };
    });

    const mockToolHandler = vi.fn(async (name: string, args: Record<string, unknown>) => {
      return { valid: true, matchCount: 1, matches: [{ tagName: 'button', isVisible: true }] };
    });

    const traces: any[] = [];
    const result = await executeAgentToolLoop({
      provider: mockProvider,
      prompt: 'Generate login test flow',
      toolHandler: mockToolHandler,
      onTrace: (event) => traces.push(event),
    });

    expect(result).toBe('name: Validated Login Flow\nsteps:\n  - click: "#login-btn"');
    expect(mockProvider).toHaveBeenCalledTimes(2);
    expect(mockToolHandler).toHaveBeenCalledWith('validate_selector', { selector: '#login-btn' });
    expect(traces).toHaveLength(2); // 1 for toolCall, 1 for toolResult
    expect(traces[0].turn).toBe(1);
    expect(traces[0].thought).toBe('Checking selector for login button...');
    expect(traces[0].toolCall?.name).toBe('validate_selector');
    expect(traces[1].toolResult?.valid).toBe(true);
    expect(traces[1].toolResult?.matchCount).toBe(1);
  });

  it('triggers self-correction diagnostic when selector returns 0 matches or ambiguous count', async () => {
    let turnCount = 0;
    const mockProvider = vi.fn(async (messages: any[]) => {
      turnCount++;
      if (turnCount === 1) {
        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'validate_selector',
                      args: { selector: '.broken-class' },
                    },
                  },
                ],
              },
            },
          ],
        };
      } else if (turnCount === 2) {
        // Last tool message should contain failure diagnostic
        const lastMsg = messages[messages.length - 1];
        expect(lastMsg.result.valid).toBe(false);
        expect(lastMsg.result.matchCount).toBe(0);

        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'validate_selector',
                      args: { selector: '[data-testid="login-button"]' },
                    },
                  },
                ],
              },
            },
          ],
        };
      }
      return {
        text: 'name: Self-Healed Flow\nsteps:\n  - click: "[data-testid=\\"login-button\\"]"',
      };
    });

    const mockToolHandler = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (args.selector === '.broken-class') {
        return { valid: false, matchCount: 0, reason: 'Element not found' };
      }
      return { valid: true, matchCount: 1, matches: [] };
    });

    const result = await executeAgentToolLoop({
      provider: mockProvider,
      prompt: 'Generate login flow',
      toolHandler: mockToolHandler,
    });

    expect(result).toContain('Self-Healed Flow');
    expect(mockProvider).toHaveBeenCalledTimes(3);
    expect(mockToolHandler).toHaveBeenCalledTimes(2);
  });

  it('strictly enforces hard cap of 5 turns', async () => {
    let turnCount = 0;
    const mockProvider = vi.fn(async () => {
      turnCount++;
      return {
        choices: [
          {
            message: {
              content: `Turn ${turnCount} loop`,
              tool_calls: [
                {
                  id: `call_${turnCount}`,
                  type: 'function',
                  function: {
                    name: 'validate_selector',
                    arguments: JSON.stringify({ selector: `#dynamic-sel-${turnCount}` }),
                  },
                },
              ],
            },
          },
        ],
      };
    });

    const mockToolHandler = vi.fn(async () => ({ valid: false, matchCount: 0 }));

    const result = await executeAgentToolLoop({
      provider: mockProvider,
      prompt: 'Infinite loop test',
      toolHandler: mockToolHandler,
      maxTurns: 10, // Requesting 10, but hardCap is 5
    });

    expect(mockProvider).toHaveBeenCalledTimes(5);
    expect(result).toBe('Turn 5 loop');
  });

  it('detects repetitive identical tool calls and stops infinite loops', async () => {
    let turnCount = 0;
    const mockProvider = vi.fn(async (messages: any[]) => {
      turnCount++;
      if (turnCount === 1 || turnCount === 2) {
        return {
          content: [
            {
              type: 'tool_use',
              id: `toolu_${turnCount}`,
              name: 'validate_selector',
              input: { selector: '.same-broken-button' },
            },
          ],
        };
      }
      // Inspect tool result on turn 3
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.result.error).toContain('Loop detected');
      return {
        content: [{ type: 'text', text: 'name: Final Fallback Flow' }],
      };
    });

    const mockToolHandler = vi.fn(async () => ({ valid: false, matchCount: 0 }));

    const result = await executeAgentToolLoop({
      provider: mockProvider,
      prompt: 'Repeated failing selector',
      toolHandler: mockToolHandler,
    });

    expect(result).toBe('name: Final Fallback Flow');
    expect(mockToolHandler).toHaveBeenCalledTimes(1); // Second repeat bypassed tool handler with loop error
  });
});
