import { describe, it, expect, beforeEach } from 'vitest';
import {
  SkillRegistry,
  skillRegistry,
  compileSkillsPrompt,
  compileSkillsTools,
} from './registry';
import { BUILTIN_SKILLS, SKILL_PRESETS } from './builtins';
import type { SkillDefinition } from '@/src/types/skills';

describe('SkillRegistry and Built-in Skills', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  it('contains expected starter built-in skills', () => {
    expect(BUILTIN_SKILLS.length).toBeGreaterThanOrEqual(5);
    const ids = BUILTIN_SKILLS.map((s) => s.id);
    expect(ids).toContain('auth-resilience');
    expect(ids).toContain('form-validation');
    expect(ids).toContain('table-pagination');
    expect(ids).toContain('shadow-dom-modal');
    expect(ids).toContain('generic-qa');
  });

  it('defines standard skill presets', () => {
    expect(SKILL_PRESETS.length).toBeGreaterThanOrEqual(4);
    const presetIds = SKILL_PRESETS.map((p) => p.id);
    expect(presetIds).toContain('standard-qa');
    expect(presetIds).toContain('form-specialist');
    expect(presetIds).toContain('table-deepdive');
    expect(presetIds).toContain('full-power');

    const standard = SKILL_PRESETS.find((p) => p.id === 'standard-qa');
    expect(standard?.isDefault).toBe(true);
    expect(standard?.skills).toContain('generic-qa');
  });

  it('registers built-in skills on instantiation', () => {
    const all = registry.getAllSkills();
    expect(all.length).toBe(BUILTIN_SKILLS.length);
    expect(registry.getSkill('auth-resilience')).toBeDefined();
    expect(registry.getSkill('generic-qa')).toBeDefined();
  });

  it('registers and unregisters custom skills dynamically', () => {
    const customSkill: SkillDefinition = {
      id: 'custom-oauth',
      name: 'Custom OAuth Flow',
      description: 'Handles custom OAuth 2.0 PKCE flow in test steps',
      version: '1.0.0',
      domain: 'auth',
      systemPromptInjection: 'Always use OAuth PKCE code challenge verification.',
      tags: ['oauth', 'security'],
    };

    registry.registerSkill(customSkill);
    expect(registry.getSkill('custom-oauth')).toEqual(customSkill);
    expect(registry.getAllSkills().some((s) => s.id === 'custom-oauth')).toBe(true);

    registry.unregisterSkill('custom-oauth');
    expect(registry.getSkill('custom-oauth')).toBeUndefined();
  });

  it('queries skills by domain and tag', () => {
    const customFormSkill: SkillDefinition = {
      id: 'custom-billing-form',
      name: 'Billing Form',
      description: 'Handles billing form payment validation',
      version: '1.0.0',
      domain: 'forms',
      tags: ['billing', 'stripe'],
    };
    registry.registerSkill(customFormSkill);

    const formSkills = registry.getSkillsByDomain('forms');
    expect(formSkills.some((s) => s.id === 'form-validation')).toBe(true);
    expect(formSkills.some((s) => s.id === 'custom-billing-form')).toBe(true);
    expect(formSkills.every((s) => s.domain === 'forms')).toBe(true);

    const stripeSkills = registry.getSkillsByTag('stripe');
    expect(stripeSkills.length).toBe(1);
    expect(stripeSkills[0].id).toBe('custom-billing-form');
  });

  it('compiles system prompt from active skill IDs cleanly', () => {
    const prompt = registry.compilePrompt(['auth-resilience', 'form-validation']);
    expect(prompt).toContain('auth-resilience');
    expect(prompt).toContain('form-validation');

    // Test with helper function
    const helperPrompt = compileSkillsPrompt(['generic-qa'], registry);
    expect(helperPrompt).toContain('generic-qa');

    // Unknown IDs are gracefully ignored
    const emptyOrUnknown = registry.compilePrompt(['non-existent-skill']);
    expect(emptyOrUnknown.trim()).toBe('');
  });

  it('compiles tool definitions from active skills without duplication', () => {
    const customSkill1: SkillDefinition = {
      id: 'skill-with-tools-1',
      name: 'Skill 1',
      description: 'Skill with tool',
      version: '1.0.0',
      domain: 'generic',
      tools: [
        {
          name: 'inspect_network',
          description: 'Inspects network traffic',
          parameters: {
            type: 'object',
            properties: {
              filter: { type: 'string' },
            },
          },
        },
      ],
    };
    const customSkill2: SkillDefinition = {
      id: 'skill-with-tools-2',
      name: 'Skill 2',
      description: 'Skill with duplicate tool name',
      version: '1.0.0',
      domain: 'generic',
      tools: [
        {
          name: 'inspect_network',
          description: 'Duplicate inspect tool',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'extract_cookies',
          description: 'Extracts session cookies',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };

    registry.registerSkill(customSkill1);
    registry.registerSkill(customSkill2);

    const tools = registry.compileTools(['skill-with-tools-1', 'skill-with-tools-2']);
    expect(tools.length).toBe(2);
    expect(tools.map((t) => t.name)).toEqual(['inspect_network', 'extract_cookies']);

    const helperTools = compileSkillsTools(['skill-with-tools-2'], registry);
    expect(helperTools.length).toBe(2);
  });

  it('exports singleton skillRegistry instance with builtins initialized', () => {
    expect(skillRegistry).toBeInstanceOf(SkillRegistry);
    expect(skillRegistry.getSkill('generic-qa')).toBeDefined();
  });
});
