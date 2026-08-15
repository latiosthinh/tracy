import React from 'react';
import { Globe, FolderKanban, Sliders, Server, Cloud, BookOpen } from 'lucide-react';
import type { FlowFile, FlowCategory } from '@/src/types/flow';
import type { Project } from '@/src/types/project';
import type { ActiveTab, DevicePreset } from '@/src/types/ui';
import { ProjectTabs } from '@/src/components/header/ProjectTabs';
import { FlowTabs } from '@/src/components/header/FlowTabs';
import { useEnvironment } from '@/src/hooks/useEnvironment';
import { useTranslation } from '@/src/hooks/useTranslation';

interface HeaderProps {
  openProjects: Project[];
  allProjects: Project[];
  activeProject: Project;
  onSelectProject: (projectId: string) => void;
  onCloseProjectTab?: (projectId: string) => void;
  onOpenProjectsManager: () => void;
  onOpenCreateProject?: () => void;
  onOpenSettings: () => void;
  targetUrl: string;
  onUpdateTargetUrl: (newUrl: string) => void;
  flows: FlowFile[];
  activeFlow: FlowFile;
  onSelectFlow: (flowId: string) => void;
  onCloseFlowTab?: (flowId: string) => void;
  onCreateNewFlow: () => void;
  onRenameFlow?: (flowId: string, newName: string) => void;
  onUpdateFlowCategory?: (flowId: string, category: FlowCategory) => void;
  isExecuting: boolean;
  onStartRun: () => void;
  onPauseRun: () => void;
  onResetRun: () => void;
  inspectMode: boolean;
  onToggleInspectMode: () => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  devicePreset: DevicePreset;
  onDevicePresetChange: (preset: DevicePreset) => void;
  onOpenDocs: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  openProjects,
  allProjects,
  activeProject,
  onSelectProject,
  onCloseProjectTab,
  onOpenProjectsManager,
  onOpenCreateProject,
  onOpenSettings,
  flows,
  activeFlow,
  onSelectFlow,
  onCloseFlowTab,
  onCreateNewFlow,
  onRenameFlow,
  onUpdateFlowCategory,
  isExecuting,
  onOpenDocs,
}) => {
  const { isWeb } = useEnvironment();
  const { t } = useTranslation();

  return (
    <header className="bg-stone-950 text-stone-100 border-b border-stone-800 shrink-0 select-none font-sans">
      {/* ROW 1: Working Project Tabs Bar & Settings Triggers */}
      <div className="bg-stone-950 px-3 py-1 flex items-center justify-between border-b border-stone-900 gap-2">
        <div className="flex items-center space-x-1.5 flex-1 min-w-0 py-0.5">
          <button
            type="button"
            onClick={onOpenProjectsManager}
            className="p-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 hover:text-amber-300 rounded-[6px] border border-stone-800 transition-all active:scale-95 cursor-pointer shrink-0 mr-2"
            title={t('header.openProjects')}
            aria-label={t('header.openProjects')}
          >
            <FolderKanban className="w-4 h-4" aria-hidden="true" />
          </button>
          <ProjectTabs
            openProjects={openProjects}
            allProjects={allProjects}
            activeProject={activeProject}
            isExecuting={isExecuting}
            onSelectProject={onSelectProject}
            onCloseProjectTab={onCloseProjectTab}
            onOpenProjectsManager={onOpenProjectsManager}
            onOpenCreateProject={onOpenCreateProject}
          />
        </div>

        {/* Top Right Utilities */}
        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {isWeb && (
            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-sky-950/80 border border-sky-800/50 rounded-[6px] text-[11px] font-mono text-sky-300">
              <Cloud className="w-3 h-3 text-sky-400" aria-hidden="true" />
              <span>{t('header.webMode')}</span>
            </div>
          )}
          <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-stone-900 border border-stone-800 rounded-[6px] text-[11px] font-mono text-emerald-400">
            <Globe className="w-3 h-3 text-emerald-400" aria-hidden="true" />
            <span>{t('header.chromium')}</span>
          </div>

          <button
            type="button"
            onClick={onOpenDocs}
            className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 rounded-[6px] border border-stone-800 transition-all active:scale-95 cursor-pointer"
            title={t('header.openDocs')}
            aria-label={t('header.openDocs')}
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 rounded-[6px] border border-amber-700/50 shadow-xs transition-all active:scale-95 cursor-pointer"
            title={t('header.openSettings')}
            aria-label={t('header.openSettings')}
          >
            <Sliders className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ROW 2: Active Project Tag & Flow Tabs */}
      <div className="px-3 py-1 flex items-center justify-between gap-2 bg-stone-950">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="flex items-center space-x-1 bg-stone-900 border border-stone-800 rounded-[6px] px-2.5 py-1 shrink-0">
            <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span className="text-amber-100 font-extrabold text-xs max-w-[120px] truncate">
              {activeProject.name}
            </span>
          </div>

          <FlowTabs
            flows={flows}
            activeFlow={activeFlow}
            isExecuting={isExecuting}
            onSelectFlow={onSelectFlow}
            onCloseFlowTab={onCloseFlowTab}
            onCreateNewFlow={onCreateNewFlow}
            onRenameFlow={onRenameFlow}
            onUpdateFlowCategory={onUpdateFlowCategory}
          />
        </div>
      </div>
    </header>
  );
};
