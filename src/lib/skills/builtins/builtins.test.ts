import { describe, it, expect } from 'vitest';
import { validateSkillDefinition } from '@/src/lib/skills/schema';
import {
  BUILTIN_SKILLS,
  SKILL_PRESETS,
  authSessionSkill,
  formValidationSkill,
  dataTablesSkill,
  shadowDomModalsSkill,
} from './index';

describe('Built-in QA Domain Skills Catalog', () => {
  it('validates all built-in skills against skillDefinitionSchema with zero errors', () => {
    expect(BUILTIN_SKILLS.length).toBeGreaterThanOrEqual(5);

    for (const skill of BUILTIN_SKILLS) {
      const validation = validateSkillDefinition(skill);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
      expect(validation.data?.id).toBe(skill.id);
    }
  });

  describe('authSessionSkill (DOMAIN-01)', () => {
    it('satisfies schema validation and contains essential auth heuristics', () => {
      const validation = validateSkillDefinition(authSessionSkill);
      expect(validation.valid).toBe(true);
      expect(authSessionSkill.id).toBe('auth-resilience');
      expect(authSessionSkill.domain).toBe('auth');

      const prompt = authSessionSkill.systemPromptInjection || '';
      // 2FA / MFA split inputs
      expect(prompt).toMatch(/one-time-code|digit|2fa|mfa/i);
      // Cookie & consent banners
      expect(prompt).toMatch(/cookie|consent|banner|accept/i);
      // Password & sensitive credential masking
      expect(prompt).toMatch(/mask|credential|password|secret/i);
      // Session timeout / redirect waits
      expect(prompt).toMatch(/redirect|timeout|session/i);
    });
  });

  describe('formValidationSkill (DOMAIN-02)', () => {
    it('satisfies schema validation and contains dynamic form heuristics', () => {
      const validation = validateSkillDefinition(formValidationSkill);
      expect(validation.valid).toBe(true);
      expect(formValidationSkill.id).toBe('form-validation');
      expect(formValidationSkill.domain).toBe('forms');

      const prompt = formValidationSkill.systemPromptInjection || '';
      // Blur / tab triggers
      expect(prompt).toMatch(/blur|tab/i);
      // aria-invalid & error container checks
      expect(prompt).toMatch(/aria-invalid|alert|error/i);
      // Custom dropdowns / datepickers / combobox
      expect(prompt).toMatch(/combobox|select|date|option/i);
    });
  });

  describe('dataTablesSkill (DOMAIN-03)', () => {
    it('satisfies schema validation and contains data tables & pagination heuristics', () => {
      const validation = validateSkillDefinition(dataTablesSkill);
      expect(validation.valid).toBe(true);
      expect(dataTablesSkill.id).toBe('table-pagination');
      expect(dataTablesSkill.domain).toBe('tables');

      const prompt = dataTablesSkill.systemPromptInjection || '';
      // Row / column scoping
      expect(prompt).toMatch(/row|column|tr|cell/i);
      // Sorting header triggers
      expect(prompt).toMatch(/sort|header/i);
      // Pagination controls
      expect(prompt).toMatch(/paginat|next|prev/i);
      // Skeleton loading spinners
      expect(prompt).toMatch(/skeleton|spinner|load/i);
    });
  });

  describe('shadowDomModalsSkill (DOMAIN-04)', () => {
    it('satisfies schema validation and contains shadow DOM & modal heuristics', () => {
      const validation = validateSkillDefinition(shadowDomModalsSkill);
      expect(validation.valid).toBe(true);
      expect(shadowDomModalsSkill.id).toBe('shadow-dom-modal');
      expect(shadowDomModalsSkill.domain).toBe('shadow-dom');

      const prompt = shadowDomModalsSkill.systemPromptInjection || '';
      // Shadow root penetration
      expect(prompt).toMatch(/shadow/i);
      // Iframe context boundaries
      expect(prompt).toMatch(/iframe|frame/i);
      // Modal backdrop & focus trap
      expect(prompt).toMatch(/modal|dialog|backdrop|focus/i);
      // CSS animations / transitions
      expect(prompt).toMatch(/animat|transition|state/i);
    });
  });

  describe('SKILL_PRESETS', () => {
    it('references only valid skill IDs present in BUILTIN_SKILLS', () => {
      const builtinIds = new Set(BUILTIN_SKILLS.map(s => s.id));
      expect(SKILL_PRESETS.length).toBeGreaterThan(0);

      for (const preset of SKILL_PRESETS) {
        expect(preset.skills.length).toBeGreaterThan(0);
        for (const skillId of preset.skills) {
          expect(builtinIds.has(skillId)).toBe(true);
        }
      }
    });

    it('has a default preset', () => {
      const defaultPreset = SKILL_PRESETS.find(p => p.isDefault);
      expect(defaultPreset).toBeDefined();
    });
  });
});
