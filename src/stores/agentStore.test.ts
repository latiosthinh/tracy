import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAgentStore } from './agentStore';
import { tracyApi } from '@/src/lib/ipc';
import { skillRegistry } from '@/src/lib/skills/registry';
import type { SkillDefinition } from '@/src/types/skills';

describe('useAgentStore - Skills Runtime & Presets Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgentStore.setState({
      activeSkillIds: ['generic-qa', 'form-validation', 'shadow-dom-modal'],
      customSkills: [],
      activePreset: 'standard-qa',
      skillWarnings: [],
      detectedAgents: [],
      isScanning: false,
    });
  });

  it('initializes with Standard QA default skills preset', () => {
    const state = useAgentStore.getState();
    expect(state.activePreset).toBe('standard-qa');
    expect(state.activeSkillIds).toEqual(['generic-qa', 'form-validation', 'shadow-dom-modal']);
    expect(state.customSkills).toEqual([]);
  });

  it('toggles skills individually and updates preset state', () => {
    const { toggleSkill } = useAgentStore.getState();

    // Toggle off 'form-validation'
    toggleSkill('form-validation');
    expect(useAgentStore.getState().activeSkillIds).toEqual(['generic-qa', 'shadow-dom-modal']);
    expect(useAgentStore.getState().activePreset).toBeNull(); // Custom combination

    // Toggle on 'auth-resilience'
    toggleSkill('auth-resilience');
    expect(useAgentStore.getState().activeSkillIds).toContain('auth-resilience');
  });

  it('switches preset packs and applies preset skill lists', () => {
    const { setPreset } = useAgentStore.getState();

    setPreset('full-power');
    expect(useAgentStore.getState().activePreset).toBe('full-power');
    expect(useAgentStore.getState().activeSkillIds).toEqual([
      'generic-qa',
      'auth-resilience',
      'form-validation',
      'table-pagination',
      'shadow-dom-modal',
    ]);

    setPreset('form-specialist');
    expect(useAgentStore.getState().activePreset).toBe('form-specialist');
    expect(useAgentStore.getState().activeSkillIds).toEqual([
      'generic-qa',
      'auth-resilience',
      'form-validation',
    ]);
  });

  it('loads custom skills from project via IPC and updates registry', async () => {
    const mockCustomSkill: SkillDefinition = {
      id: 'project-custom-skill',
      name: 'Project Custom',
      description: 'Project-specific testing rules',
      version: '1.0.0',
      domain: 'generic',
      systemPromptInjection: 'Project custom rule injected',
    };

    const spy = vi.spyOn(tracyApi, 'loadProjectSkills').mockResolvedValueOnce({
      skills: [mockCustomSkill],
      warnings: ['Warning: minor schema mismatch in unused-skill.yaml'],
    });

    await useAgentStore.getState().loadCustomSkills('/mock/project/path');

    expect(spy).toHaveBeenCalledWith('/mock/project/path');
    expect(useAgentStore.getState().customSkills).toEqual([mockCustomSkill]);
    expect(useAgentStore.getState().skillWarnings).toEqual([
      'Warning: minor schema mismatch in unused-skill.yaml',
    ]);

    // Check that skill is registered in singleton registry
    expect(skillRegistry.getSkill('project-custom-skill')).toEqual(mockCustomSkill);
  });

  it('compiles system prompt and tools based on active skills', () => {
    const { setPreset, getCompiledPrompt, getCompiledTools } = useAgentStore.getState();

    setPreset('standard-qa');
    const prompt = getCompiledPrompt();
    expect(prompt).toContain('generic-qa');
    expect(prompt).toContain('form-validation');
    expect(prompt).toContain('shadow-dom-modal');

    const tools = getCompiledTools();
    expect(Array.isArray(tools)).toBe(true);
  });
});
