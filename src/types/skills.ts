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

export type ProbeSelectorType = 'css' | 'xpath' | 'text' | 'aria' | 'auto';

export interface SelectorValidationPayload {
  projectId: string;
  selector: string;
  selectorType?: ProbeSelectorType;
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
  selectorType: ProbeSelectorType;
  matchCount: number;
  visibleCount: number;
  matches: DomElementProbeMatch[];
  error?: string;
  durationMs: number;
}

export type SelectorPresenceStatus =
  | 'UniquePresent'
  | 'AmbiguousMultiple'
  | 'NotPresent'
  | 'DeferredDynamic';

export type SelectorResilienceTier =
  | 'TestId'
  | 'AriaRole'
  | 'VisibleText'
  | 'StandardCss'
  | 'DeepXPath';

export interface SelectorScoreReport {
  selector: string;
  score: number; // 0 to 100
  tier: SelectorResilienceTier;
  status: SelectorPresenceStatus;
  isReliable: boolean;
  warnings: string[];
  suggestions?: string[];
  details: {
    matchCount: number;
    visibleCount: number;
    isClickable?: boolean;
    isInShadowRoot?: boolean;
    isDynamicDeferred?: boolean;
  };
}

export interface PrecedingStepContext {
  action: string;
  selector?: string;
  targetUrl?: string;
}

export interface AgentToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentToolResult {
  valid: boolean;
  matchCount: number;
  details?: unknown;
  error?: string;
}

export interface AgentToolTraceEvent {
  turn: number;
  thought?: string;
  toolCall?: AgentToolCall;
  toolResult?: AgentToolResult;
  timestamp: string;
}


