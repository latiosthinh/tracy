import { create } from 'zustand';
import { DetectedAgent, tracyApi } from '@/src/lib/ipc';
import type { SkillDefinition, ToolDefinition } from '@/src/types/skills';
import { SKILL_PRESETS } from '@/src/lib/skills/builtins';
import { skillRegistry, compileSkillsPrompt, compileSkillsTools } from '@/src/lib/skills/registry';

interface AgentState {
  detectedAgents: DetectedAgent[];
  isScanning: boolean;
  scanAgents: () => Promise<void>;

  // Skill Management
  activeSkillIds: string[];
  customSkills: SkillDefinition[];
  activePreset: string | null;
  skillWarnings: string[];
  toggleSkill: (skillId: string) => void;
  setActiveSkills: (skillIds: string[]) => void;
  setPreset: (presetId: string) => void;
  loadCustomSkills: (saveLocation: string) => Promise<void>;
  getCompiledPrompt: () => string;
  getCompiledTools: () => ToolDefinition[];
}

const defaultPreset = SKILL_PRESETS.find((p) => p.isDefault) || SKILL_PRESETS[0];

export const useAgentStore = create<AgentState>((set, get) => ({
  detectedAgents: [],
  isScanning: false,

  activeSkillIds: defaultPreset ? [...defaultPreset.skills] : [],
  customSkills: [],
  activePreset: defaultPreset ? defaultPreset.id : null,
  skillWarnings: [],

  scanAgents: async () => {
    set({ isScanning: true });
    try {
      const agents = await tracyApi.scanAgents();
      set({ detectedAgents: agents, isScanning: false });
    } catch (err) {
      console.error('Failed to scan agent CLIs:', err);
      set({ isScanning: false });
    }
  },

  toggleSkill: (skillId: string) => {
    const current = get().activeSkillIds;
    const exists = current.includes(skillId);
    const updated = exists ? current.filter((id) => id !== skillId) : [...current, skillId];

    // Check if new list matches any preset
    const matchingPreset = SKILL_PRESETS.find(
      (preset) =>
        preset.skills.length === updated.length &&
        preset.skills.every((id) => updated.includes(id))
    );

    set({
      activeSkillIds: updated,
      activePreset: matchingPreset ? matchingPreset.id : null,
    });
  },

  setActiveSkills: (skillIds: string[]) => {
    const matchingPreset = SKILL_PRESETS.find(
      (preset) =>
        preset.skills.length === skillIds.length &&
        preset.skills.every((id) => skillIds.includes(id))
    );
    set({
      activeSkillIds: [...skillIds],
      activePreset: matchingPreset ? matchingPreset.id : null,
    });
  },

  setPreset: (presetId: string) => {
    const preset = SKILL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    set({
      activePreset: preset.id,
      activeSkillIds: [...preset.skills],
    });
  },

  loadCustomSkills: async (saveLocation: string) => {
    try {
      const { skills, warnings } = await tracyApi.loadProjectSkills(saveLocation);

      // Register or update custom skills in registry
      for (const skill of skills) {
        skillRegistry.registerSkill(skill);
      }

      set({
        customSkills: skills,
        skillWarnings: warnings || [],
      });
    } catch (err) {
      console.error('Failed to load project skills:', err);
      set({
        skillWarnings: [err instanceof Error ? err.message : String(err)],
      });
    }
  },

  getCompiledPrompt: () => {
    return compileSkillsPrompt(get().activeSkillIds, skillRegistry);
  },

  getCompiledTools: () => {
    return compileSkillsTools(get().activeSkillIds, skillRegistry);
  },
}));
