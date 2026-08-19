export type SkillDomain = 'auth' | 'forms' | 'tables' | 'shadow-dom' | 'generic';

export interface SkillParameterDef {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, SkillParameterDef>;
    required?: string[];
  };
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  domain: SkillDomain;
  systemPromptInjection?: string;
  tools?: ToolDefinition[];
  parameters?: Record<string, SkillParameterDef>;
  tags?: string[];
}

export interface SkillPreset {
  id: string;
  name: string;
  description: string;
  skills: string[]; // skill IDs included in preset
  isDefault?: boolean;
}

export interface SkillValidationResult {
  valid: boolean;
  errors?: string[];
  data?: SkillDefinition;
}
