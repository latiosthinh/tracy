import * as yaml from 'js-yaml';
import type { SkillDefinition } from '@/src/types/skills';
import { validateSkillDefinition } from './schema';

export type SkillFileFormat = 'json' | 'yaml';

export interface ParseSkillResult {
  skill: SkillDefinition | null;
  errors?: string[];
}

export function serializeSkill(skill: SkillDefinition, format: SkillFileFormat): string {
  if (format === 'json') {
    return JSON.stringify(skill, null, 2);
  }
  return yaml.dump(skill, {
    indent: 2,
    noRefs: true,
    lineWidth: -1,
  });
}

export function parseSkill(content: string, format?: SkillFileFormat): ParseSkillResult {
  if (!content || !content.trim()) {
    return {
      skill: null,
      errors: ['Skill definition content cannot be empty'],
    };
  }

  const trimmed = content.trim();
  const detectedFormat = format || (trimmed.startsWith('{') ? 'json' : 'yaml');

  let parsedObject: unknown;

  try {
    if (detectedFormat === 'json') {
      parsedObject = JSON.parse(trimmed);
    } else {
      parsedObject = yaml.load(trimmed, {
        schema: yaml.JSON_SCHEMA,
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      skill: null,
      errors: [`Failed to parse ${detectedFormat.toUpperCase()} content: ${errorMsg}`],
    };
  }

  const validation = validateSkillDefinition(parsedObject);
  if (!validation.valid || !validation.data) {
    return {
      skill: null,
      errors: validation.errors || ['Invalid skill structure'],
    };
  }

  return {
    skill: validation.data,
  };
}
