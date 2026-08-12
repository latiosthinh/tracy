import React from 'react';
import {
  Code,
  ListOrdered,
  Activity,
  Bot,
  BarChart3,
  Terminal,
  Sliders,
} from 'lucide-react';
import type { ActiveTab } from '@/src/types/ui';

interface StudioTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const TABS: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'editor', label: 'YAML Editor', icon: Code },
  { id: 'steps', label: 'Visual Steps', icon: ListOrdered },
  { id: 'timeline', label: 'Execution', icon: Activity },
  { id: 'ai', label: 'AI Copilot', icon: Bot },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'cli', label: 'CLI Agents', icon: Terminal },
  { id: 'config', label: 'Config', icon: Sliders },
];

export const StudioTabs: React.FC<StudioTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-stone-950 border-b border-stone-900 px-3 py-1 flex items-center space-x-1 shrink-0 select-none overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isActive
                ? 'bg-amber-950/80 border border-amber-600/80 text-amber-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 border border-transparent'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
