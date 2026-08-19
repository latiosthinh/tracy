import type { SkillDefinition, SkillDomain, ToolDefinition } from '@/src/types/skills';
import { BUILTIN_SKILLS } from './builtins';

export class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  constructor(initialSkills: SkillDefinition[] = BUILTIN_SKILLS) {
    for (const skill of initialSkills) {
      this.registerSkill(skill);
    }
  }

  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  unregisterSkill(skillId: string): boolean {
    return this.skills.delete(skillId);
  }

  getSkill(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId);
  }

  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  getSkillsByDomain(domain: SkillDomain): SkillDefinition[] {
    return this.getAllSkills().filter((skill) => skill.domain === domain);
  }

  getSkillsByTag(tag: string): SkillDefinition[] {
    return this.getAllSkills().filter((skill) => skill.tags?.includes(tag));
  }

  compilePrompt(activeSkillIds: string[]): string {
    const promptParts: string[] = [];

    for (const id of activeSkillIds) {
      const skill = this.skills.get(id);
      if (skill?.systemPromptInjection && skill.systemPromptInjection.trim()) {
        promptParts.push(skill.systemPromptInjection.trim());
      }
    }

    return promptParts.join('\n\n');
  }

  compileTools(activeSkillIds: string[]): ToolDefinition[] {
    const toolMap = new Map<string, ToolDefinition>();

    for (const id of activeSkillIds) {
      const skill = this.skills.get(id);
      if (skill?.tools && Array.isArray(skill.tools)) {
        for (const tool of skill.tools) {
          if (!toolMap.has(tool.name)) {
            toolMap.set(tool.name, tool);
          }
        }
      }
    }

    return Array.from(toolMap.values());
  }

  clear(): void {
    this.skills.clear();
  }
}

export const skillRegistry = new SkillRegistry();

export function compileSkillsPrompt(activeSkillIds: string[], registry: SkillRegistry = skillRegistry): string {
  return registry.compilePrompt(activeSkillIds);
}

export function compileSkillsTools(activeSkillIds: string[], registry: SkillRegistry = skillRegistry): ToolDefinition[] {
  return registry.compileTools(activeSkillIds);
}
