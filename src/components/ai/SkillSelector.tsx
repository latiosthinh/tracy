import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  FileCheck,
  Table,
  Layers,
  Sliders,
  AlertTriangle,
  Wrench,
  LucideIcon,
} from 'lucide-react';
import { useAgentStore } from '@/src/stores/agentStore';
import { BUILTIN_SKILLS, SKILL_PRESETS } from '@/src/lib/skills/builtins';
import { SkillDomain } from '@/src/types/skills';
import { useTranslation } from '@/src/hooks/useTranslation';

const DOMAIN_ICON_MAP: Record<SkillDomain, LucideIcon> = {
  auth: ShieldCheck,
  forms: FileCheck,
  tables: Table,
  'shadow-dom': Layers,
  generic: Sparkles,
};

interface SkillSelectorProps {
  disabled?: boolean;
}

export const SkillSelector: React.FC<SkillSelectorProps> = ({ disabled = false }) => {
  const { t } = useTranslation();
  const activeSkillIds = useAgentStore((s) => s.activeSkillIds);
  const customSkills = useAgentStore((s) => s.customSkills);
  const activePreset = useAgentStore((s) => s.activePreset);
  const skillWarnings = useAgentStore((s) => s.skillWarnings);
  const toggleSkill = useAgentStore((s) => s.toggleSkill);
  const setPreset = useAgentStore((s) => s.setPreset);

  // Combine built-in and custom skills deduplicated by ID
  const allSkills = React.useMemo(() => {
    const map = new Map<string, (typeof BUILTIN_SKILLS)[0]>();
    for (const skill of BUILTIN_SKILLS) {
      map.set(skill.id, skill);
    }
    for (const skill of customSkills) {
      map.set(skill.id, skill);
    }
    return Array.from(map.values());
  }, [customSkills]);

  return (
    <div className="space-y-2 bg-stone-900/60 p-2.5 rounded-[6px] border border-stone-800">
      {/* Header & Active Counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-stone-300">
            {t('copilot.skills.title')}
          </span>
        </div>
        <span className="text-[10px] text-stone-400 font-mono">
          {t('copilot.skills.activeSkillsCount', {
            active: activeSkillIds.length,
            total: allSkills.length,
          })}
        </span>
      </div>

      {/* Preset Quick Buttons */}
      <div
        className="flex items-center space-x-1 overflow-x-auto pb-1 custom-scrollbar"
        role="group"
        aria-label={t('copilot.skills.presets')}
      >
        {SKILL_PRESETS.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => setPreset(preset.id)}
              title={preset.description}
              aria-pressed={isActive}
              aria-label={t('copilot.skills.selectPresetAria', { name: preset.name })}
              className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-amber-700/80 text-amber-100 border border-amber-500 shadow-xs'
                  : 'bg-stone-950/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      {/* Skill Toggle Pills */}
      <div
        className="flex flex-wrap gap-1.5 pt-0.5"
        role="group"
        aria-label={t('copilot.skills.title')}
      >
        {allSkills.length === 0 ? (
          <span className="text-[11px] text-stone-500 italic">
            {t('copilot.skills.noSkillsAvailable')}
          </span>
        ) : (
          allSkills.map((skill) => {
            const isActive = activeSkillIds.includes(skill.id);
            const isCustom = !BUILTIN_SKILLS.some((b) => b.id === skill.id);
            const IconComponent = DOMAIN_ICON_MAP[skill.domain] || Sparkles;
            const toolCount = skill.tools?.length || 0;

            return (
              <button
                key={skill.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleSkill(skill.id)}
                title={`${skill.name} — ${skill.description}`}
                aria-pressed={isActive}
                aria-label={t('copilot.skills.toggleSkillAria', { name: skill.name })}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded-[5px] text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group border ${
                  isActive
                    ? 'bg-amber-800/80 border-amber-500 text-amber-100 shadow-xs'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <IconComponent
                  className={`w-3 h-3 shrink-0 ${
                    isActive ? 'text-amber-300' : 'text-stone-500 group-hover:text-stone-400'
                  }`}
                />
                <span className="truncate max-w-[140px]">{skill.name}</span>

                {/* Custom Skill Badge */}
                {isCustom && (
                  <span className="px-1 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-800/80 rounded text-[9px] font-mono">
                    {t('copilot.skills.customSkillsBadge')}
                  </span>
                )}

                {/* Tools Count Indicator */}
                {toolCount > 0 && (
                  <span
                    title={`${toolCount} tool(s) registered`}
                    className="flex items-center space-x-0.5 px-1 py-0.2 bg-stone-900 border border-stone-700 text-stone-300 rounded text-[9px] font-mono"
                  >
                    <Wrench className="w-2.5 h-2.5 text-stone-400" />
                    <span>{toolCount}</span>
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Skill Load Warnings */}
      {skillWarnings.length > 0 && (
        <div className="mt-1 p-1.5 bg-amber-950/40 border border-amber-800/60 rounded-[4px] text-[10px] text-amber-300 space-y-0.5">
          {skillWarnings.map((w, idx) => (
            <div key={idx} className="flex items-start space-x-1">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <span className="break-all">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
