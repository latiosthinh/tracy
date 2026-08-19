import type { SkillDefinition, SkillPreset } from '@/src/types/skills';

export const BUILTIN_SKILLS: SkillDefinition[] = [
  {
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
  },
  {
    id: 'auth-resilience',
    name: 'Auth & Session Resilience',
    description: 'Specialized handling for login flows, 2FA prompts, session token validation, and redirect timeouts.',
    version: '1.0.0',
    domain: 'auth',
    systemPromptInjection: `[Skill: auth-resilience]
- When generating authentication test flows, handle potential redirect delays with explicit waitFor steps.
- Mask sensitive credentials in step descriptions and assertions.
- Anticipate multi-step login flows (e.g. email then password on subsequent screen).`,
    tags: ['auth', 'login', 'security', 'session'],
  },
  {
    id: 'form-validation',
    name: 'Form & Input Validation Specialist',
    description: 'Deep testing patterns for complex forms, input masks, inline error validation, and multi-step wizards.',
    version: '1.0.0',
    domain: 'forms',
    systemPromptInjection: `[Skill: form-validation]
- Verify field blur and dirty states when testing client-side validation rules.
- Test both happy path entries and boundary invalid values (empty required fields, format mismatches).
- Ensure submission buttons are waited for enabled state before clicking.`,
    tags: ['forms', 'validation', 'inputs', 'wizards'],
  },
  {
    id: 'table-pagination',
    name: 'Data Table & Pagination Specialist',
    description: 'Patterns for testing grid tables, sorting, column filtering, pagination controls, and row selection.',
    version: '1.0.0',
    domain: 'tables',
    systemPromptInjection: `[Skill: table-pagination]
- Wait for table loading skeletons/spinners to disappear before asserting row counts or cell values.
- Test sorting by clicking column headers and asserting row text order changes.
- Handle pagination clicks with waitFor navigation or grid update assertions.`,
    tags: ['tables', 'grids', 'pagination', 'sorting'],
  },
  {
    id: 'shadow-dom-modal',
    name: 'Shadow DOM & Modals Specialist',
    description: 'Handling web components, shadow root penetration, modal dialogs, backdrops, and overlay focus traps.',
    version: '1.0.0',
    domain: 'shadow-dom',
    systemPromptInjection: `[Skill: shadow-dom-modal]
- Ensure modal open/close animations complete with waitFor before element interactions.
- Target dialog container roles and aria-modal attributes when scoping modal interactions.
- Check backdrop dismissal and Escape key press interactions.`,
    tags: ['shadow-dom', 'modals', 'dialogs', 'web-components'],
  },
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
