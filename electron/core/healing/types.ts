export const HEAL_CONFIDENCE_THRESHOLD = 0.75;

export type StepAction =
  | 'navigate'
  | 'leftClick'
  | 'rightClick'
  | 'hover'
  | 'scroll'
  | 'tap'
  | 'twoFingersTap'
  | 'press'
  | 'fill'
  | 'waitFor'
  | 'assert'
  | 'expect'
  | string;

export interface HealableStep {
  id?: string;
  type?: string;
  action?: StepAction;
  selector?: string;
  text?: string;
  key?: string;
  timeout?: number;
  url?: string;
  [key: string]: unknown;
}

export interface DOMCandidateElement {
  tagName: string;
  id?: string;
  testId?: string;
  ariaLabel?: string;
  role?: string;
  text?: string;
  selector?: string;
  path?: string;
  classes?: string[];
  attributes?: Record<string, string>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FailedStepContext {
  step: HealableStep;
  error: string;
  originalSelector: string;
  htmlSnapshot?: string;
  domCandidates?: DOMCandidateElement[];
  pageUrl?: string;
  timestamp?: number;
}

export interface HeuristicScoreResult {
  candidate: DOMCandidateElement;
  score: number;
  confidence: number;
  proposedSelector: string;
  invariantsPassed: boolean;
  rejectionReason?: string;
  matchBreakdown?: {
    testIdScore: number;
    ariaLabelScore: number;
    textScore: number;
    roleTagScore: number;
    proximityScore: number;
  };
}

export interface HealingResult {
  healed: boolean;
  strategy?: 'heuristic' | 'ai' | 'none';
  originalSelector: string;
  healedSelector?: string;
  confidence?: number;
  reason?: string;
  candidate?: DOMCandidateElement;
}
