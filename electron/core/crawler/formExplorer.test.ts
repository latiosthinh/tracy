import { describe, it, expect } from 'vitest';
import { generateSyntheticFormData, planFormInteractions, FormFieldDescriptor } from './formExplorer';
import { InteractiveElement } from './types';

describe('Safe Synthetic Form Explorer', () => {
  it('generates context-appropriate mock inputs based on input type, name, placeholder, role', () => {
    expect(generateSyntheticFormData({ type: 'email' })).toBe('crawl.tester+demo@proqa.local');
    expect(generateSyntheticFormData({ name: 'user_email' })).toBe('crawl.tester+demo@proqa.local');
    expect(generateSyntheticFormData({ placeholder: 'Search products...' })).toBe('sample search');
    expect(generateSyntheticFormData({ name: 'query' })).toBe('sample search');
    expect(generateSyntheticFormData({ type: 'tel' })).toBe('555-0100');
    expect(generateSyntheticFormData({ name: 'phone_number' })).toBe('555-0100');
    expect(generateSyntheticFormData({ name: 'zipcode' })).toBe('90210');
    expect(generateSyntheticFormData({ type: 'url' })).toBe('https://example.com');
    expect(generateSyntheticFormData({ type: 'date' })).toBe('2026-01-01');
    expect(generateSyntheticFormData({ type: 'number' })).toBe('1');
    expect(generateSyntheticFormData({ type: 'password' })).toBe('TestPassword123!');
    expect(generateSyntheticFormData({ type: 'checkbox' })).toBe(true);
    expect(generateSyntheticFormData({ name: 'first_name' })).toBe('Test Field');
  });

  it('selects valid option for dropdown select fields', () => {
    expect(generateSyntheticFormData({ type: 'select', options: ['Alpha', 'Beta', 'Gamma'] })).toBe('Alpha');
    expect(generateSyntheticFormData({ type: 'select', options: [] })).toBe('Option 1');
  });

  it('planFormInteractions returns ordered fill and click steps targeting safe submit button', () => {
    const fields: FormFieldDescriptor[] = [
      { name: 'username', selector: 'input[name="username"]', type: 'text' },
      { name: 'email', selector: 'input[name="email"]', type: 'email' },
      { name: 'terms', selector: 'input[name="terms"]', type: 'checkbox' }
    ];

    const submitBtn: InteractiveElement = {
      tagName: 'button',
      text: 'Submit Registration',
      selector: 'button#btn-submit',
      isSafe: true,
      isSubmit: true
    };

    const steps = planFormInteractions({
      selector: 'form#register',
      fields,
      submitButton: submitBtn
    });

    expect(steps.length).toBe(4);
    expect(steps[0]).toEqual({
      action: 'fill',
      selector: 'input[name="username"]',
      text: 'Test Field'
    });
    expect(steps[1]).toEqual({
      action: 'fill',
      selector: 'input[name="email"]',
      text: 'crawl.tester+demo@proqa.local'
    });
    expect(steps[2]).toEqual({
      action: 'leftClick',
      selector: 'input[name="terms"]'
    });
    expect(steps[3]).toEqual({
      action: 'leftClick',
      selector: 'button#btn-submit'
    });
  });

  it('planFormInteractions skips destructive submit buttons (e.g. Delete / Cancel)', () => {
    const fields: FormFieldDescriptor[] = [
      { name: 'reason', selector: 'input[name="reason"]', type: 'text' }
    ];

    const destructiveBtn: InteractiveElement = {
      tagName: 'button',
      text: 'Delete Account Permanently',
      selector: 'button#btn-delete',
      isSafe: false,
      isSubmit: true
    };

    const steps = planFormInteractions({
      selector: 'form#delete-form',
      fields,
      submitButton: destructiveBtn
    });

    expect(steps.length).toBe(1);
    expect(steps[0].action).toBe('fill');
    // submit step omitted because button is destructive
  });
});
