import React from 'react';
import {
  Code,
  ListOrdered,
  Activity,
  Bot,
  BarChart3,
  Terminal,
  Sliders,
  Network,
  Globe,
  Layers,
  Gauge,
} from 'lucide-react';
import type { ActiveTab } from '@/src/types/ui';
import { useTranslation } from '@/src/hooks/useTranslation';

interface StudioTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const StudioTabs: React.FC<StudioTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();

  const TABS: { id: ActiveTab; labelKey: string; icon: React.FC<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }[] = [
    { id: 'visualizer', labelKey: 'studio.tabVisualizer', icon: Network },
    { id: 'editor', labelKey: 'studio.tabYaml', icon: Code },
    { id: 'steps', labelKey: 'studio.tabSteps', icon: ListOrdered },
    { id: 'timeline', labelKey: 'studio.tabTimeline', icon: Activity },
    { id: 'network', labelKey: 'studio.tabNetwork', icon: Globe },
    { id: 'matrix', labelKey: 'studio.tabMatrix', icon: Layers },
    { id: 'perf', labelKey: 'studio.tabPerf', icon: Gauge },
    { id: 'ai', labelKey: 'studio.tabAi', icon: Bot },
    { id: 'reports', labelKey: 'studio.tabReports', icon: BarChart3 },
    { id: 'cli', labelKey: 'studio.tabCli', icon: Terminal },
    { id: 'config', labelKey: 'studio.tabConfig', icon: Sliders },
  ];

  return (
    <div className="bg-stone-950 border-b border-stone-900 px-3 py-1 flex items-center space-x-1 shrink-0 select-none overflow-x-auto no-scrollbar" role="tablist">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const label = t(tab.labelKey);

        return (
          <button
            type="button"
            role="tab"
            aria-selected={isActive}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isActive
                ? 'bg-amber-950/80 border border-amber-600/80 text-amber-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 border border-transparent'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
