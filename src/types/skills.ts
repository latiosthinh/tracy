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

export type SelectorType = 'css' | 'xpath' | 'text' | 'aria' | 'auto';

export interface SelectorValidationPayload {
  projectId: string;
  selector: string;
  selectorType?: SelectorType;
  timeoutMs?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DomElementProbeMatch {
  tagName: string;
  textPreview?: string;
  role?: string;
  testId?: string;
  boundingBox?: BoundingBox;
  isVisible: boolean;
  isClickable: boolean;
  isInShadowRoot: boolean;
}

export interface SelectorValidationResult {
  valid: boolean;
  selector: string;
  selectorType: SelectorType;
  matchCount: number;
  visibleCount: number;
  matches: DomElementProbeMatch[];
  error?: string;
  durationMs: number;
}

