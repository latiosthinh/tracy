import { YamlStep } from '@/src/types/flow';
import { InteractiveElement } from './types';
import { isDestructiveAction } from './safetyFilter';

export interface FormFieldDescriptor {
  name?: string;
  type?: string;
  placeholder?: string;
  role?: string;
  selector: string;
  options?: string[];
}

export interface FormPlanContext {
  id?: string;
  selector: string;
  fields: FormFieldDescriptor[];
  submitButton?: InteractiveElement;
}

/**
 * Generates safe synthetic mock values for typical form fields based on contextual metadata.
 */
export function generateSyntheticFormData(field: {
  name?: string;
  type?: string;
  placeholder?: string;
  role?: string;
  options?: string[];
}): string | boolean {
  const type = (field.type || '').toLowerCase();
  const name = (field.name || '').toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const context = `${name} ${placeholder} ${field.role || ''}`.toLowerCase();

  if (type === 'checkbox' || type === 'radio') {
    return true;
  }

  if (type === 'select' || field.options !== undefined) {
    if (field.options && field.options.length > 0) {
      return field.options[0];
    }
    return 'Option 1';
  }

  if (type === 'email' || context.includes('email') || context.includes('mail')) {
    return 'crawl.tester+demo@proqa.local';
  }

  if (
    context.includes('search') ||
    context.includes('query') ||
    name === 'q' ||
    name === 'keyword'
  ) {
    return 'sample search';
  }

  if (
    type === 'tel' ||
    context.includes('phone') ||
    context.includes('mobile') ||
    context.includes('tel')
  ) {
    return '555-0100';
  }

  if (context.includes('zip') || context.includes('postal')) {
    return '90210';
  }

  if (type === 'url' || context.includes('website') || context.includes('url')) {
    return 'https://example.com';
  }

  if (type === 'date' || context.includes('date') || context.includes('dob')) {
    return '2026-01-01';
  }

  if (type === 'number' || context.includes('age') || context.includes('count') || context.includes('quantity')) {
    return '1';
  }

  if (type === 'password' || context.includes('pass') || context.includes('secret')) {
    return 'TestPassword123!';
  }

  return 'Test Field';
}

/**
 * Plans ordered Playwright YamlSteps for filling out and submitting a form safely.
 */
export function planFormInteractions(formContext: FormPlanContext): YamlStep[] {
  const steps: YamlStep[] = [];

  for (const field of formContext.fields) {
    const value = generateSyntheticFormData(field);

    if (typeof value === 'boolean') {
      if (value) {
        steps.push({
          action: 'leftClick',
          selector: field.selector
        });
      }
    } else {
      steps.push({
        action: 'fill',
        selector: field.selector,
        text: value
      });
    }
  }

  // Check and append submit action if submit button exists and is safe
  if (formContext.submitButton) {
    const safety = isDestructiveAction(formContext.submitButton);
    if (safety.isSafe) {
      steps.push({
        action: 'leftClick',
        selector: formContext.submitButton.selector
      });
    }
  }

  return steps;
}
