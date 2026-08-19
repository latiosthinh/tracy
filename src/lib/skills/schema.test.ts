import { describe, it, expect } from 'vitest';
import {
  skillDefinitionSchema,
  toolDefinitionSchema,
  validateSkillDefinition,
} from './schema';
import type { SkillDefinition } from '@/src/types/skills';

describe('Skill Zod Schema & Validation', () => {
  const validSkill: SkillDefinition = {
    id: 'auth-login-helper',
    name: 'Authentication Login Helper',
    description: 'Handles standard login sequences and 2FA input screens',
    version: '1.0.0',
    domain: 'auth',
    systemPromptInjection: 'Focus on identifying username, password, and submit elements.',
    tags: ['auth', 'security', 'login'],
    tools: [
      {
        name: 'fill_login_credentials',
        description: 'Fills user credentials into identified inputs',
        parameters: {
          type: 'object',
          properties: {
            usernameSelector: { type: 'string', description: 'CSS selector for username' },
            passwordSelector: { type: 'string', description: 'CSS selector for password' },
          },
          required: ['usernameSelector', 'passwordSelector'],
        },
      },
    ],
    parameters: {
      timeoutMs: {
        type: 'number',
        description: 'Wait timeout in ms',
        required: false,
        default: 5000,
      },
    },
  };

  it('validates a complete valid skill definition', () => {
    const result = validateSkillDefinition(validSkill);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe('auth-login-helper');
    expect(result.errors).toBeUndefined();
  });

  it('validates a minimal valid skill definition with defaults', () => {
    const minimal = {
      id: 'minimal-skill',
      name: 'Minimal Skill',
      description: 'A minimal skill description',
      version: '0.1.0',
      domain: 'generic',
    };
    const result = validateSkillDefinition(minimal);
    expect(result.valid).toBe(true);
    expect(result.data?.domain).toBe('generic');
  });

  it('rejects skill with missing required fields (id, name, description)', () => {
    const invalid = {
      name: 'No ID Skill',
      description: 'Missing ID',
      version: '1.0.0',
      domain: 'auth',
    };
    const result = validateSkillDefinition(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.some(e => e.includes('id'))).toBe(true);
  });

  it('rejects skill with invalid domain', () => {
    const invalid = {
      id: 'invalid-domain-skill',
      name: 'Invalid Domain',
      description: 'Testing invalid domain',
      version: '1.0.0',
      domain: 'unsupported-domain',
    };
    const result = validateSkillDefinition(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors?.some(e => e.includes('domain'))).toBe(true);
  });

  it('validates tool definitions schema independently', () => {
    const validTool = {
      name: 'extract_table_rows',
      description: 'Extracts data rows from a target HTML table',
      parameters: {
        type: 'object' as const,
        properties: {
          tableSelector: { type: 'string' as const, description: 'Table selector' },
          maxRows: { type: 'number' as const, default: 10 },
        },
        required: ['tableSelector'],
      },
    };
    const parsed = toolDefinitionSchema.safeParse(validTool);
    expect(parsed.success).toBe(true);
  });

  it('rejects tool definition without required name or invalid parameter schema', () => {
    const invalidTool = {
      description: 'Missing tool name',
      parameters: {
        type: 'object',
        properties: {},
      },
    };
    const parsed = toolDefinitionSchema.safeParse(invalidTool);
    expect(parsed.success).toBe(false);
  });

  it('handles null, undefined, or primitive input gracefully', () => {
    expect(validateSkillDefinition(null).valid).toBe(false);
    expect(validateSkillDefinition(undefined).valid).toBe(false);
    expect(validateSkillDefinition('invalid string').valid).toBe(false);
    expect(validateSkillDefinition(12345).valid).toBe(false);
  });
});
