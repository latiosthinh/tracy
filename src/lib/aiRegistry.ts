// Declarative agent registry — single source of truth for all AI agents.
// Pure data module (no React, no Electron imports).

export type AgentCategory = 'local-cli' | 'cloud-api';
export type AgentKind = 'cli' | 'http';
export type HttpProtocol = 'google' | 'openai' | 'anthropic' | 'openai-compat' | 'cursor';

export interface AgentDef {
  id: string;
  displayName: string;
  category: AgentCategory;
  kind: AgentKind;
  description: string;
  iconName: string;
  defaultModel: string;
  models: string[];
  needsApiKey: boolean;
  needsEndpoint: boolean;
  allowsCustomModel?: boolean;
  // CLI agents
  cliBinary?: string;
  altBinaries?: string[];
  versionArgs?: string[];
  promptViaArgv?: boolean;
  buildArgs?: (opts?: { model?: string; prompt?: string }) => string[];
  // HTTP agents
  protocol?: HttpProtocol;
  defaultEndpoint?: string;
  // env vars carrying this agent's credential
  envKeyNames?: string[];
}

/** All canonical agent definitions (single source of truth). */
export const AGENT_REGISTRY: AgentDef[] = [
  // --- Local CLI agents ---
  {
    id: 'claude-code',
    displayName: 'Claude Code CLI',
    category: 'local-cli',
    kind: 'cli',
    description: 'Anthropic Claude Code — local CLI agent',
    iconName: 'Terminal',
    defaultModel: '',
    models: [],
    needsApiKey: false,
    needsEndpoint: false,
    cliBinary: 'claude',
    versionArgs: ['--version'],
    buildArgs: ({ model }: { model?: string; prompt?: string } = {}) =>
      ['-p', '--output-format', 'text', ...(model ? ['--model', model] : [])],
    envKeyNames: ['ANTHROPIC_API_KEY'],
  },
  {
    id: 'gemini-cli',
    displayName: 'Gemini CLI',
    category: 'local-cli',
    kind: 'cli',
    description: 'Google Gemini CLI — local CLI agent',
    iconName: 'Terminal',
    defaultModel: '',
    models: [],
    needsApiKey: false,
    needsEndpoint: false,
    cliBinary: 'gemini',
    versionArgs: ['--version'],
    buildArgs: ({ model, prompt }: { model?: string; prompt?: string } = {}) =>
      ['-p', prompt ?? '', ...(model ? ['--model', model] : [])],
    promptViaArgv: true,
    envKeyNames: ['GEMINI_API_KEY'],
  },
  {
    id: 'cursor-agent',
    displayName: 'Cursor Agent CLI',
    category: 'local-cli',
    kind: 'cli',
    description: 'Cursor Agent — local CLI agent from Cursor',
    iconName: 'Terminal',
    defaultModel: '',
    models: [],
    needsApiKey: false,
    needsEndpoint: false,
    cliBinary: 'cursor-agent',
    altBinaries: ['agent'],
    versionArgs: ['--version'],
    buildArgs: ({ model }: { model?: string; prompt?: string } = {}) =>
      ['--print', '--output-format', 'text', ...(model ? ['--model', model] : [])],
    envKeyNames: ['CURSOR_API_KEY', 'CURSOR_AUTH_TOKEN'],
  },
  {
    id: 'opencode',
    displayName: 'OpenCode',
    category: 'local-cli',
    kind: 'cli',
    description: 'OpenCode — open-source CLI agent',
    iconName: 'Terminal',
    defaultModel: '',
    models: [],
    needsApiKey: false,
    needsEndpoint: false,
    cliBinary: 'opencode',
    versionArgs: ['--version'],
    buildArgs: ({ model }: { model?: string; prompt?: string } = {}) =>
      ['run', ...(model ? ['--model', model] : [])],
    envKeyNames: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
  },
  {
    id: 'pi',
    displayName: 'Pi',
    category: 'local-cli',
    kind: 'cli',
    description: 'Pi — conversational AI CLI',
    iconName: 'Terminal',
    defaultModel: '',
    models: [],
    needsApiKey: false,
    needsEndpoint: false,
    cliBinary: 'pi',
    versionArgs: ['--version'],
    buildArgs: ({ prompt }: { model?: string; prompt?: string } = {}) =>
      ['-p', prompt ?? ''],
    promptViaArgv: true,
    envKeyNames: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
  },
  {
    id: 'qwen',
    displayName: 'Qwen Code',
    category: 'local-cli',
    kind: 'cli',
    description: 'Qwen Code — Alibaba Qwen CLI agent',
    iconName: 'Terminal',
    defaultModel: '',
    models: [],
    needsApiKey: false,
    needsEndpoint: false,
    cliBinary: 'qwen',
    versionArgs: ['--version'],
    buildArgs: ({ model, prompt }: { model?: string; prompt?: string } = {}) =>
      ['-p', prompt ?? '', ...(model ? ['--model', model] : [])],
    promptViaArgv: true,
    envKeyNames: ['DASHSCOPE_API_KEY', 'OPENAI_API_KEY'],
  },
  {
    id: 'codex',
    displayName: 'Codex',
    category: 'local-cli',
    kind: 'cli',
    description: 'Codex — OpenAI Codex CLI agent',
    iconName: 'Terminal',
    defaultModel: '',
    models: [],
    needsApiKey: false,
    needsEndpoint: false,
    cliBinary: 'codex',
    versionArgs: ['--version'],
    buildArgs: ({ model }: { model?: string; prompt?: string } = {}) =>
      ['exec', ...(model ? ['--model', model] : [])],
    envKeyNames: ['OPENAI_API_KEY'],
  },
  {
    id: 'copilot',
    displayName: 'GitHub Copilot CLI',
    category: 'local-cli',
    kind: 'cli',
    description: 'GitHub Copilot CLI agent',
    iconName: 'Terminal',
    defaultModel: '',
    models: [],
    needsApiKey: false,
    needsEndpoint: false,
    cliBinary: 'copilot',
    versionArgs: ['--version'],
    buildArgs: ({ model }: { model?: string; prompt?: string } = {}) =>
      ['--allow-all-tools', ...(model ? ['--model', model] : [])],
    envKeyNames: [] as string[],
  },

  // --- Cloud API agents ---
  {
    id: 'byok-gemini',
    displayName: 'Gemini (BYOK)',
    category: 'cloud-api',
    kind: 'http',
    description: 'Google Gemini API — bring your own key',
    iconName: 'Sparkles',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    needsApiKey: true,
    needsEndpoint: false,
    protocol: 'google',
    envKeyNames: ['GEMINI_API_KEY'],
  },
  {
    id: 'byok-openai',
    displayName: 'OpenAI / GPT (BYOK)',
    category: 'cloud-api',
    kind: 'http',
    description: 'OpenAI API — bring your own key',
    iconName: 'Sparkles',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-5'],
    needsApiKey: true,
    needsEndpoint: false,
    allowsCustomModel: true,
    protocol: 'openai',
    envKeyNames: ['OPENAI_API_KEY'],
  },
  {
    id: 'byok-claude',
    displayName: 'Claude (BYOK)',
    category: 'cloud-api',
    kind: 'http',
    description: 'Anthropic Claude API — bring your own key',
    iconName: 'Sparkles',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514'],
    needsApiKey: true,
    needsEndpoint: false,
    protocol: 'anthropic',
    envKeyNames: ['ANTHROPIC_API_KEY'],
  },
  {
    id: 'byok-mimo',
    displayName: 'Mimo (BYOK)',
    category: 'cloud-api',
    kind: 'http',
    description: 'Xiaomi Mimo API — bring your own key',
    iconName: 'Sparkles',
    defaultModel: 'gpt-4o-mini',
    models: [],
    allowsCustomModel: true,
    needsApiKey: true,
    needsEndpoint: false,
    protocol: 'openai',
    defaultEndpoint: 'https://api.xiaomimimo.com/v1',
    envKeyNames: ['OPENAI_API_KEY'],
  },
  {
    id: 'byok-grok',
    displayName: 'Grok (xAI BYOK)',
    category: 'cloud-api',
    kind: 'http',
    description: 'xAI Grok API — bring your own key',
    iconName: 'Sparkles',
    defaultModel: 'grok-4.6',
    models: ['grok-4.6', 'grok-4', 'grok-3'],
    needsApiKey: true,
    needsEndpoint: false,
    allowsCustomModel: true,
    protocol: 'openai',
    defaultEndpoint: 'https://api.x.ai/v1',
    envKeyNames: ['XAI_API_KEY'],
  },
  {
    id: 'byok-cursor',
    displayName: 'Cursor Cloud API',
    category: 'cloud-api',
    kind: 'http',
    description: 'Cursor Cloud Agent API — bring your own key',
    iconName: 'Sparkles',
    defaultModel: 'cursor-fast',
    models: ['cursor-fast', 'cursor-pro'],
    needsApiKey: true,
    needsEndpoint: false,
    protocol: 'cursor',
    defaultEndpoint: 'https://api.cursor.com',
    envKeyNames: ['CURSOR_API_KEY'],
  },
  {
    id: 'custom-gateway',
    displayName: 'Custom Gateway (Ollama / OpenAI-compatible)',
    category: 'cloud-api',
    kind: 'http',
    description: 'Local or custom OpenAI-compatible gateway (e.g., Ollama, LM Studio). Supports free-text model names.',
    iconName: 'Cpu',
    defaultModel: 'llama3.2',
    models: [],
    needsApiKey: false,
    needsEndpoint: true,
    allowsCustomModel: true,
    protocol: 'openai-compat',
    defaultEndpoint: 'http://localhost:11434',
  },
];

/** Legacy alias → canonical id mapping for backward compatibility. */
export const LEGACY_AGENT_ALIASES: Record<string, string> = {
  'gemini-3.6-flash': 'byok-gemini',
  'local-agent-cli': 'custom-gateway',
  'cursor-sdk': 'byok-cursor',
  'cursor-cli': 'cursor-agent',
  'open-code': 'opencode',
};

// ── Helpers ───────────────────────────────────────────────

export function getAgentDef(id: string): AgentDef | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}

export function agentsByCategory(cat: AgentCategory): AgentDef[] {
  return AGENT_REGISTRY.filter((a) => a.category === cat);
}

/** Resolve legacy aliases to their canonical ids. Unknown ids pass through. */
export function resolveAgentId(id: string): string {
  return LEGACY_AGENT_ALIASES[id] ?? id;
}

// ── Model ID sanitizer (from open-design) ─────────────────

export const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/:@-]*$/;

export function isValidModelId(m: string): boolean {
  return m.length > 0 && m.length <= 200 && MODEL_ID_PATTERN.test(m);
}
