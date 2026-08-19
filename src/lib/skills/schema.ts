import { z } from 'zod';
import type { SkillDefinition, SkillValidationResult } from '@/src/types/skills';

export const skillDomainSchema = z.enum(['auth', 'forms', 'tables', 'shadow-dom', 'generic']);

export const skillParameterDefSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  enum: z.array(z.string()).optional(),
});

export const toolDefinitionSchema = z.object({
  name: z.string().min(1, 'Tool name is required'),
  description: z.string().min(1, 'Tool description is required'),
  parameters: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), skillParameterDefSchema),
    required: z.array(z.string()).optional(),
  }),
});

export const skillDefinitionSchema = z.object({
  id: z.string().min(1, 'Skill id is required'),
  name: z.string().min(1, 'Skill name is required'),
  description: z.string().min(1, 'Skill description is required'),
  version: z.string().min(1, 'Skill version is required'),
  domain: skillDomainSchema,
  systemPromptInjection: z.string().optional(),
  tools: z.array(toolDefinitionSchema).optional(),
  parameters: z.record(z.string(), skillParameterDefSchema).optional(),
  tags: z.array(z.string()).optional(),
});

export function validateSkillDefinition(input: unknown): SkillValidationResult {
  const result = skillDefinitionSchema.safeParse(input);
  if (result.success) {
    return {
      valid: true,
      data: result.data as SkillDefinition,
    };
  }
  return {
    valid: false,
    errors: result.error.errors.map(err => `${err.path.join('.') || 'root'}: ${err.message}`),
  };
}
