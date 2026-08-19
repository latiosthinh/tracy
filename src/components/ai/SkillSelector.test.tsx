import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillSelector } from './SkillSelector';
import { useAgentStore } from '@/src/stores/agentStore';
import { BUILTIN_SKILLS, SKILL_PRESETS } from '@/src/lib/skills/builtins';

describe('SkillSelector', () => {
  beforeEach(() => {
    // Reset agentStore to default preset
    const defaultPreset = SKILL_PRESETS.find((p) => p.isDefault) || SKILL_PRESETS[0];
    useAgentStore.setState({
      activeSkillIds: defaultPreset ? [...defaultPreset.skills] : [],
      customSkills: [],
      activePreset: defaultPreset ? defaultPreset.id : null,
      skillWarnings: [],
    });
  });

  it('renders all built-in skills with domain badges', () => {
    render(<SkillSelector />);

    for (const skill of BUILTIN_SKILLS) {
      expect(screen.getByText(skill.name)).toBeInTheDocument();
    }
    expect(screen.getByText(/skills active/i)).toBeInTheDocument();
  });

  it('renders preset buttons and indicates currently active preset', () => {
    render(<SkillSelector />);

    for (const preset of SKILL_PRESETS) {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
    }

    const standardQaBtn = screen.getByRole('button', { name: /Apply preset Standard QA/i });
    expect(standardQaBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggling a skill pill calls toggleSkill in agentStore', () => {
    render(<SkillSelector />);

    const authSkill = BUILTIN_SKILLS.find((s) => s.id === 'auth-resilience')!;
    const skillBtn = screen.getByRole('button', { name: new RegExp(`Toggle skill ${authSkill.name}`, 'i') });

    // Initially not active in Standard QA preset
    expect(skillBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(skillBtn);

    expect(useAgentStore.getState().activeSkillIds).toContain('auth-resilience');
    expect(skillBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking a preset calls setPreset in agentStore', () => {
    render(<SkillSelector />);

    const fullPowerBtn = screen.getByRole('button', { name: /Apply preset Full Power/i });
    fireEvent.click(fullPowerBtn);

    expect(useAgentStore.getState().activePreset).toBe('full-power');
    expect(useAgentStore.getState().activeSkillIds).toEqual(
      expect.arrayContaining(['generic-qa', 'auth-resilience', 'form-validation', 'table-pagination', 'shadow-dom-modal'])
    );
  });

  it('shows custom project skills and warning badges when present', () => {
    useAgentStore.setState({
      customSkills: [
        {
          id: 'custom-payment-skill',
          name: 'Stripe Payment Gateway',
          description: 'Handles 3D Secure and iframe test payments',
          version: '1.0.0',
          domain: 'forms',
          systemPromptInjection: 'Test Stripe flows with caution',
        },
      ],
      skillWarnings: ['Warning: invalid YAML syntax in custom-broken-skill.yaml'],
    });

    render(<SkillSelector />);

    expect(screen.getByText('Stripe Payment Gateway')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText(/invalid YAML syntax in custom-broken-skill.yaml/i)).toBeInTheDocument();
  });
});
