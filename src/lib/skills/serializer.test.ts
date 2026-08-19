import { describe, it, expect } from 'vitest';
import { serializeSkill, parseSkill } from './serializer';
import type { SkillDefinition } from '@/src/types/skills';

describe('Skill Serializer & Parser (.skill.json & .skill.yaml)', () => {
  const sampleSkill: SkillDefinition = {
    id: 'table-grid-skill',
    name: 'Data Table & Grid Skill',
    description: 'Specialized for navigating and asserting grid components',
    version: '1.2.0',
    domain: 'tables',
    systemPromptInjection: 'Extract column headers and row indexes when selecting grid cells.',
    tags: ['tables', 'grid', 'ag-grid'],
    tools: [
      {
        name: 'click_cell',
        description: 'Clicks a specific cell by row and column index',
        parameters: {
          type: 'object',
          properties: {
            rowIndex: { type: 'number', description: 'Row index (0-based)' },
            colKey: { type: 'string', description: 'Column accessor key' },
          },
          required: ['rowIndex', 'colKey'],
        },
      },
    ],
    parameters: {
      virtualized: {
        type: 'boolean',
        description: 'Whether table uses virtual scroll rendering',
        default: false,
      },
    },
  };

  it('serializes skill to JSON string and parses it back', () => {
    const jsonStr = serializeSkill(sampleSkill, 'json');
    expect(jsonStr).toContain('"id": "table-grid-skill"');
    
    const parseRes = parseSkill(jsonStr, 'json');
    expect(parseRes.errors).toBeUndefined();
    expect(parseRes.skill).toEqual(sampleSkill);
  });

  it('serializes skill to YAML string and parses it back', () => {
    const yamlStr = serializeSkill(sampleSkill, 'yaml');
    expect(yamlStr).toContain('id: table-grid-skill');
    expect(yamlStr).toContain('domain: tables');

    const parseRes = parseSkill(yamlStr, 'yaml');
    expect(parseRes.errors).toBeUndefined();
    expect(parseRes.skill).toEqual(sampleSkill);
  });

  it('auto-detects JSON vs YAML content when format is omitted', () => {
    const jsonStr = serializeSkill(sampleSkill, 'json');
    const yamlStr = serializeSkill(sampleSkill, 'yaml');

    const parsedJson = parseSkill(jsonStr);
    expect(parsedJson.skill?.id).toBe(sampleSkill.id);

    const parsedYaml = parseSkill(yamlStr);
    expect(parsedYaml.skill?.id).toBe(sampleSkill.id);
  });

  it('returns descriptive error when payload fails schema validation', () => {
    const invalidJson = JSON.stringify({
      id: 'invalid-skill',
      // missing name, description, version, domain
    });

    const parseRes = parseSkill(invalidJson);
    expect(parseRes.skill).toBeNull();
    expect(parseRes.errors).toBeDefined();
    expect(parseRes.errors?.length).toBeGreaterThan(0);
  });

  it('returns descriptive error when parsing malformed syntax', () => {
    const corruptedYaml = 'id: broken\n  bad-indentation: [unclosed';
    const parseRes = parseSkill(corruptedYaml, 'yaml');
    expect(parseRes.skill).toBeNull();
    expect(parseRes.errors?.[0]).toMatch(/Failed to parse YAML content/i);
  });

  it('handles empty or whitespace-only input cleanly', () => {
    const parseRes = parseSkill('   ');
    expect(parseRes.skill).toBeNull();
    expect(parseRes.errors).toBeDefined();
  });
});
