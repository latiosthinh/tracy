import type { SkillDefinition, SkillPreset } from '@/src/types/skills';
import { authSessionSkill } from './authSessionSkill';
import { formValidationSkill } from './formValidationSkill';
import { dataTablesSkill } from './dataTablesSkill';
import { shadowDomModalsSkill } from './shadowDomModalsSkill';

export { authSessionSkill } from './authSessionSkill';
export { formValidationSkill } from './formValidationSkill';
export { dataTablesSkill } from './dataTablesSkill';
export { shadowDomModalsSkill } from './shadowDomModalsSkill';

export const genericQaSkill: SkillDefinition = {
  id: 'generic-qa',
  name: 'Generic QA & Best Practices',
  description: 'Fundamental testing patterns, resilient selectors, and deterministic assertions.',
  version: '1.0.0',
  domain: 'generic',
  systemPromptInjection: `[Skill: generic-qa]
- Prioritize stable test IDs (data-testid, aria-label, role) over dynamic CSS classes.
- Ensure test flows are idempotent and self-contained with reasonable waitFor timeouts.
- Prefer user-visible actions (click, fill, press) over synthetic event triggers.`,
  tags: ['qa', 'baseline', 'resilience'],
};

export const BUILTIN_SKILLS: SkillDefinition[] = [
  genericQaSkill,
  authSessionSkill,
  formValidationSkill,
  dataTablesSkill,
  shadowDomModalsSkill,
];

export const SKILL_PRESETS: SkillPreset[] = [
  {
    id: 'standard-qa',
    name: 'Standard QA',
    description: 'Balanced baseline covering core testing standards, input validations, and modal handling.',
    skills: ['generic-qa', 'form-validation', 'shadow-dom-modal'],
    isDefault: true,
  },
  {
    id: 'form-specialist',
    name: 'Form Specialist',
    description: 'Optimized for form-heavy workflows, auth dialogs, input masks, and field validations.',
    skills: ['generic-qa', 'auth-resilience', 'form-validation'],
  },
  {
    id: 'table-deepdive',
    name: 'Data Table Deep-Dive',
    description: 'Tailored for data-dense portals, table filtering, pagination, and grid assertions.',
    skills: ['generic-qa', 'table-pagination', 'shadow-dom-modal'],
  },
  {
    id: 'full-power',
    name: 'Full Power',
    description: 'All built-in skills enabled for comprehensive E2E automation coverage.',
    skills: ['generic-qa', 'auth-resilience', 'form-validation', 'table-pagination', 'shadow-dom-modal'],
  },
];
