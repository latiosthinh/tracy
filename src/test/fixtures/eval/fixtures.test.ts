import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { JSDOM } from 'jsdom';

describe('Evaluation Fixtures & Ground-Truth Flows', () => {
  const fixturesDir = path.resolve(__dirname);
  const groundTruthDir = path.resolve(__dirname, 'ground-truth');

  const scenarios = [
    {
      name: 'auth-flow',
      htmlFile: 'auth-flow.html',
      yamlFile: 'auth-flow.yaml',
      expectedElements: [
        '#cookie-banner',
        'button[data-testid="accept-cookies"]',
        '#login-form',
        'input[name="email"]',
        'input[name="password"]',
        'button[type="submit"]',
        '#mfa-container',
        'input[data-testid="mfa-digit-1"]',
        'input[data-testid="mfa-digit-6"]',
      ],
    },
    {
      name: 'complex-form',
      htmlFile: 'complex-form.html',
      yamlFile: 'complex-form.yaml',
      expectedElements: [
        '#survey-form',
        'div[role="combobox"][data-testid="country-select"]',
        'ul[role="listbox"]',
        'li[role="option"][data-testid="country-option-us"]',
        'input[type="date"][data-testid="birthdate-input"]',
        'input[data-testid="terms-checkbox"]',
        'button[data-testid="submit-survey-btn"]',
        'div[role="alert"]',
      ],
    },
    {
      name: 'data-table',
      htmlFile: 'data-table.html',
      yamlFile: 'data-table.yaml',
      expectedElements: [
        '#users-table-container',
        'th button[data-testid="sort-name"]',
        'tr[data-testid="user-row-1"]',
        'tr[data-testid="user-row-3"]',
        'button[data-testid="edit-user-1"]',
        'button[data-testid="delete-user-1"]',
        'button[data-testid="pagination-next"]',
        'span[data-testid="pagination-page-indicator"]',
      ],
    },
    {
      name: 'modal-shadow',
      htmlFile: 'modal-shadow.html',
      yamlFile: 'modal-shadow.yaml',
      expectedElements: [
        'button[data-testid="open-modal-btn"]',
        '.modal-backdrop',
        'div[role="dialog"]',
        'button[data-testid="modal-close-btn"]',
        'user-profile-badge[data-testid="user-profile-badge"]',
      ],
    },
  ];

  it('verifies all 4 static HTML fixtures exist and contain expected DOM elements', () => {
    for (const scenario of scenarios) {
      const filePath = path.join(fixturesDir, scenario.htmlFile);
      expect(fs.existsSync(filePath), `HTML fixture file missing: ${scenario.htmlFile}`).toBe(true);

      const htmlContent = fs.readFileSync(filePath, 'utf-8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      for (const selector of scenario.expectedElements) {
        const el = document.querySelector(selector);
        expect(el, `Selector ${selector} not found in ${scenario.htmlFile}`).not.toBeNull();
      }
    }
  });

  it('verifies all 4 canonical ground-truth YAML files parse cleanly and conform to schema', () => {
    for (const scenario of scenarios) {
      const filePath = path.join(groundTruthDir, scenario.yamlFile);
      expect(fs.existsSync(filePath), `YAML flow file missing: ${scenario.yamlFile}`).toBe(true);

      const yamlContent = fs.readFileSync(filePath, 'utf-8');
      const docs = yaml.loadAll(yamlContent);

      expect(docs.length).toBeGreaterThanOrEqual(1);

      const frontmatter = (docs.length > 1 ? docs[0] : {}) as Record<string, unknown>;
      const steps = (docs.length > 1 ? docs[1] : docs[0]) as Array<Record<string, unknown>>;

      if (docs.length > 1) {
        expect(frontmatter).toHaveProperty('url');
        expect(frontmatter).toHaveProperty('tags');
      }

      expect(Array.isArray(steps), `Steps in ${scenario.yamlFile} must be an array`).toBe(true);
      expect(steps.length).toBeGreaterThan(0);

      for (const step of steps) {
        const command = Object.keys(step)[0];
        expect([
          'navigate',
          'leftClick',
          'rightClick',
          'hover',
          'scroll',
          'tap',
          'twoFingersTap',
          'press',
          'fill',
          'waitFor',
          'assertVisible',
          'assertNotVisible',
        ]).toContain(command);
      }
    }
  });

  it('verifies all selectors in ground-truth YAML flows resolve to elements in corresponding HTML fixtures', () => {
    for (const scenario of scenarios) {
      const htmlPath = path.join(fixturesDir, scenario.htmlFile);
      const yamlPath = path.join(groundTruthDir, scenario.yamlFile);

      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
      const docs = yaml.loadAll(yamlContent);
      const steps = (docs.length > 1 ? docs[1] : docs[0]) as Array<Record<string, unknown>>;

      for (const step of steps) {
        const command = Object.keys(step)[0];
        const stepDef = step[command];

        let selector: string | undefined;

        if (typeof stepDef === 'string') {
          if (stepDef.startsWith('#') || stepDef.startsWith('.') || stepDef.includes('[')) {
            selector = stepDef;
          }
        } else if (stepDef && typeof stepDef === 'object') {
          const obj = stepDef as Record<string, unknown>;
          if (typeof obj.selector === 'string') {
            selector = obj.selector;
          }
        }

        if (selector) {
          const match = document.querySelector(selector);
          expect(match, `Ground-truth selector "${selector}" in ${scenario.yamlFile} must exist in ${scenario.htmlFile}`).not.toBeNull();
        }
      }
    }
  });
});
