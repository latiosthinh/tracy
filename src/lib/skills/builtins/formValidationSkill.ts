import type { SkillDefinition } from '@/src/types/skills';

export const formValidationSkill: SkillDefinition = {
  id: 'form-validation',
  name: 'Form & Input Validation Specialist',
  description:
    'Deep testing patterns for complex forms, custom select/combobox controls, datepickers, input masks, dirty/blur triggers, and aria-invalid error containers.',
  version: '1.0.0',
  domain: 'forms',
  systemPromptInjection: `[Skill: form-validation]
- Blur & Dirty State Triggers: Client-side validation often triggers on blur. Ensure field interaction emits blur events by pressing Tab (\`press: Tab\`) or focusing another element prior to asserting validation messages.
- Error State Assertions: Target accessible validation states such as \`[aria-invalid="true"]\`, \`[role="alert"]\`, \`.error-message\`, and form helper text containers to verify both required field errors and formatting mismatches.
- Custom Combobox & Dropdowns: For custom select controls, click the trigger button (\`[role="combobox"]\`), wait for the dropdown popup to become visible (\`[role="listbox"]\`), and select items via \`[role="option"]:has-text(...)\`.
- Date & Time Pickers: Prefer ISO/structured text entry or calendar popup navigation over fragile relative clicks. Verify parsed date output matches expected localization.
- Input Masks & Formatting: Test phone numbers, currency, and postal codes with and without formatting characters, validating that the input mask formats values deterministically.
- Submit Button Lifecycle: Assert that submit buttons transition from disabled to enabled state once all required valid inputs are satisfied.`,
  tags: ['forms', 'validation', 'inputs', 'combobox', 'datepicker', 'accessibility'],
};
