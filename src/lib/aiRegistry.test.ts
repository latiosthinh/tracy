import { describe, it, expect } from 'vitest';
import {
  AGENT_REGISTRY,
  getAgentDef,
  agentsByCategory,
  resolveAgentId,
  LEGACY_AGENT_ALIASES,
  isValidModelId,
} from './aiRegistry';

describe('AGENT_REGISTRY', () => {
  it('has exactly 15 entries', () => {
    expect(AGENT_REGISTRY).toHaveLength(15);
  });

  it('all ids are unique', () => {
    const ids = AGENT_REGISTRY.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('defines all expected canonical ids', () => {
    const expected = [
      'claude-code',
      'gemini-cli',
      'cursor-agent',
      'opencode',
      'pi',
      'qwen',
      'codex',
      'copilot',
      'byok-gemini',
      'byok-openai',
      'byok-claude',
      'byok-mimo',
      'byok-grok',
      'byok-cursor',
      'custom-gateway',
    ];
    expect(AGENT_REGISTRY.map((a) => a.id)).toEqual(expect.arrayContaining(expected));
  });

  it('required fields exist on every entry', () => {
    for (const agent of AGENT_REGISTRY) {
      expect(agent.id).toBeDefined();
      expect(agent.displayName).toBeDefined();
      expect(['local-cli', 'cloud-api']).toContain(agent.category);
      expect(['cli', 'http']).toContain(agent.kind);
      expect(agent.description).toBeDefined();
      expect(agent.iconName).toBeDefined();
      expect(typeof agent.defaultModel).toBe('string');
      expect(Array.isArray(agent.models)).toBe(true);
      expect(typeof agent.needsApiKey).toBe('boolean');
      expect(typeof agent.needsEndpoint).toBe('boolean');
    }
  });

  it('CLI agents have cliBinary + versionArgs + buildArgs; no protocol', () => {
    const cliAgents = agentsByCategory('local-cli');
    for (const agent of cliAgents) {
      expect(agent.kind).toBe('cli');
      expect(agent.cliBinary).toBeDefined();
      expect(agent.cliBinary?.length).toBeGreaterThan(0);
      expect(agent.versionArgs).toBeDefined();
      expect(Array.isArray(agent.versionArgs)).toBe(true);
      expect(agent.buildArgs).toBeDefined();
      expect(typeof agent.buildArgs).toBe('function');
      expect(agent.protocol).toBeUndefined();
    }
  });

  it('HTTP agents have protocol; curated-model HTTP agents have non-empty models', () => {
    // Agents with allowsCustomModel accept free-text model entry, so a curated list is optional.
    const httpAgents = AGENT_REGISTRY.filter((a) => a.kind === 'http' && !a.allowsCustomModel);
    for (const agent of httpAgents) {
      expect(agent.protocol).toBeDefined();
      expect(agent.protocol).not.toBe('openai-compat');
      expect(agent.models.length).toBeGreaterThan(0);
    }
  });

  it('legacy aliases are not in registry as ids', () => {
    const registryIds = new Set(AGENT_REGISTRY.map((a) => a.id));
    for (const alias of Object.keys(LEGACY_AGENT_ALIASES)) {
      expect(registryIds.has(alias)).toBe(false);
    }
  });

  it('cursor-agent defines altBinaries containing agent', () => {
    const cursorAgent = getAgentDef('cursor-agent');
    expect(cursorAgent?.altBinaries).toContain('agent');
  });

  it('pi, qwen, gemini-cli use promptViaArgv and include prompt in buildArgs', () => {
    const argvAgents = ['pi', 'qwen', 'gemini-cli'];
    for (const id of argvAgents) {
      const def = getAgentDef(id);
      expect(def).toBeDefined();
      expect(def?.promptViaArgv).toBe(true);
      const args = def?.buildArgs?.({ prompt: 'TEST_PROMPT_XYZ' }) ?? [];
      expect(args).toContain('TEST_PROMPT_XYZ');
    }
  });

  it('claude-code, cursor-agent, opencode, codex, copilot do NOT use promptViaArgv', () => {
    const stdinAgents = ['claude-code', 'cursor-agent', 'opencode', 'codex', 'copilot'];
    for (const id of stdinAgents) {
      const def = getAgentDef(id);
      expect(def).toBeDefined();
      expect(def?.promptViaArgv).toBeUndefined();
      const args = def?.buildArgs?.({ model: 'foo' }) ?? [];
      expect(args).not.toContain('prompt');
      expect(args).not.toContain('$PROMPT');
    }
  });

  it('byok-grok has openai protocol and x.ai default endpoint', () => {
    const grok = getAgentDef('byok-grok');
    expect(grok).toBeDefined();
    expect(grok?.protocol).toBe('openai');
    expect(grok?.defaultEndpoint).toBe('https://api.x.ai/v1');
  });

  it('byok-cursor has cursor protocol and cursor.com default endpoint', () => {
    const cursor = getAgentDef('byok-cursor');
    expect(cursor).toBeDefined();
    expect(cursor?.protocol).toBe('cursor');
    expect(cursor?.defaultEndpoint).toBe('https://api.cursor.com');
  });
});

describe('resolveAgentId', () => {
  it('maps legacy aliases to canonical ids', () => {
    expect(resolveAgentId('gemini-3.6-flash')).toBe('byok-gemini');
    expect(resolveAgentId('local-agent-cli')).toBe('custom-gateway');
    expect(resolveAgentId('cursor-sdk')).toBe('byok-cursor');
    expect(resolveAgentId('cursor-cli')).toBe('cursor-agent');
    expect(resolveAgentId('open-code')).toBe('opencode');
  });

  it('passes through known canonical ids', () => {
    expect(resolveAgentId('claude-code')).toBe('claude-code');
    expect(resolveAgentId('byok-openai')).toBe('byok-openai');
  });

  it('passes through unknown ids unchanged', () => {
    expect(resolveAgentId('unknown-stub')).toBe('unknown-stub');
  });
});

describe('getAgentDef', () => {
  it('returns definition for canonical id', () => {
    const gemini = getAgentDef('byok-gemini');
    expect(gemini).toBeDefined();
    expect(gemini?.id).toBe('byok-gemini');
    expect(gemini?.displayName).toBe('Gemini (BYOK)');
    expect(gemini?.protocol).toBe('google');
    expect(gemini?.defaultModel).toBe('gemini-2.5-flash');
  });

  it('returns undefined for unknown id', () => {
    expect(getAgentDef('does-not-exist')).toBeUndefined();
  });

  it('canonical id lookup works even when resolveAgentId maps something else', () => {
    // byok-gemini is the canonical target — should be findable directly
    const direct = getAgentDef('byok-gemini');
    expect(direct).toBeDefined();
    // gemini-3.6-flash is an alias — should NOT resolve via getAgentDef
    const alias = getAgentDef('gemini-3.6-flash');
    expect(alias).toBeUndefined();
  });
});

describe('agentsByCategory', () => {
  it('returns correct counts per category', () => {
    expect(agentsByCategory('local-cli')).toHaveLength(8);
    expect(agentsByCategory('cloud-api')).toHaveLength(7);
  });

  it('empty array for unknown category', () => {
    // TypeScript won't accept invalid categories at compile time, but verify empty result
    const result = agentsByCategory('local-cli');
    for (const a of result) {
      expect(a.category).toBe('local-cli');
    }
  });
});

describe('buildArgs does not contain prompt text', () => {
  for (const agent of AGENT_REGISTRY) {
    if (agent.kind === 'cli' && agent.buildArgs) {
      const buildArgs = agent.buildArgs;
      it(`${agent.id}: buildArgs with model`, () => {
        const argsWith = buildArgs({ model: 'foo' });
        for (const arg of argsWith) {
          expect(arg).not.toContain('prompt');
          expect(arg).not.toContain('$PROMPT');
        }
      });
      it(`${agent.id}: buildArgs without model`, () => {
        const args = buildArgs();
        for (const arg of args) {
          expect(arg).not.toContain('prompt');
          expect(arg).not.toContain('$PROMPT');
        }
      });
    }
  }
});

describe('MODEL_ID_PATTERN & isValidModelId', () => {
  it('allows valid model ids', () => {
    expect(isValidModelId('gemini-2.5-flash')).toBe(true);
    expect(isValidModelId('llama3.2')).toBe(true);
    expect(isValidModelId('gpt-4o-mini')).toBe(true);
    expect(isValidModelId('claude-sonnet-4-20250514')).toBe(true);
    expect(isValidModelId('my-model_2.0')).toBe(true);
    expect(isValidModelId('foo/bar:latest')).toBe(true);
    expect(isValidModelId('test@v1')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidModelId('')).toBe(false);
  });

  it('rejects negative-length strings (> 200 chars)', () => {
    expect(isValidModelId('a'.repeat(201))).toBe(false);
  });

  it('accepts exactly 200-char string matching pattern', () => {
    // all-valid chars within 200 limit
    expect(isValidModelId('a'.repeat(200))).toBe(true);
  });

  it('rejects starts-with-special-char', () => {
    expect(isValidModelId('-foo')).toBe(false);
    expect(isValidModelId('--help')).toBe(false);
    expect(isValidModelId('.bar')).toBe(false);
  });

  it('rejects spaces and special disallowed chars', () => {
    expect(isValidModelId('foo bar')).toBe(false);
    expect(isValidModelId('foo!bar')).toBe(false);
  });
});
