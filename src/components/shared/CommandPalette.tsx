import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Play,
  Square,
  RotateCcw,
  Plus,
  Crosshair,
  Radio,
  FileCode,
  Layers,
  Sparkles,
  Activity,
  FileText,
  Terminal,
  Settings,
  BookOpen,
  FolderOpen,
  Monitor,
  FolderPlus,
  Compass,
} from 'lucide-react';
import { useUiStore } from '@/src/stores/uiStore';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import type { ActiveTab } from '@/src/types/ui';

interface CommandItem {
  id: string;
  category: 'actions' | 'flows' | 'projects' | 'navigation';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const { t } = useTranslation();
  const isOpen = useUiStore((s) => s.isCommandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // UI state & actions
  const setCurrentView = useUiStore((s) => s.setCurrentView);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setDocsOpen = useUiStore((s) => s.setDocsOpen);
  const setProjectManagerModalOpen = useUiStore((s) => s.setProjectManagerModalOpen);
  const setCreateFlowModalOpen = useUiStore((s) => s.setCreateFlowModalOpen);
  const setAutoOpenCreateModal = useUiStore((s) => s.setAutoOpenCreateModal);
  const toggleInspectMode = useUiStore((s) => s.toggleInspectMode);
  const toggleRecordMode = useUiStore((s) => s.toggleRecordMode);

  // Project state & actions
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const selectProject = useProjectStore((s) => s.selectProject);
  const selectFlow = useProjectStore((s) => s.selectFlow);
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeFlow = activeProject?.flows.find((f) => f.id === useProjectStore.getState().activeFlowId) || activeProject?.flows[0];

  // Execution state & actions
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const pauseExecution = useExecutionStore((s) => s.pauseExecution);
  const resetExecution = useExecutionStore((s) => s.resetExecution);

  // Focus restoration
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    } else {
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    }
  }, [isOpen]);

  const allCommands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // --- Actions ---
    if (activeFlow && activeProject) {
      if (!isExecuting) {
        items.push({
          id: 'action-run-flow',
          category: 'actions',
          title: t('palette.actions.runFlow'),
          subtitle: activeFlow.name,
          icon: <Play className="w-4 h-4 text-emerald-400" />,
          action: () => startExecution(activeFlow, activeProject.targetUrl || ''),
        });
      } else {
        items.push({
          id: 'action-stop-flow',
          category: 'actions',
          title: t('palette.actions.stopFlow'),
          icon: <Square className="w-4 h-4 text-rose-400" />,
          action: () => pauseExecution(),
        });
      }

      items.push({
        id: 'action-reset-execution',
        category: 'actions',
        title: t('palette.actions.resetExecution'),
        icon: <RotateCcw className="w-4 h-4 text-amber-400" />,
        action: () => resetExecution(),
      });
    }

    items.push(
      {
        id: 'action-new-flow',
        category: 'actions',
        title: t('palette.actions.newFlow'),
        icon: <Plus className="w-4 h-4 text-amber-400" />,
        action: () => setCreateFlowModalOpen(true),
      },
      {
        id: 'action-new-project',
        category: 'actions',
        title: t('palette.actions.newProject'),
        icon: <FolderPlus className="w-4 h-4 text-sky-400" />,
        action: () => {
          setAutoOpenCreateModal(true);
          setProjectManagerModalOpen(true);
        },
      },
      {
        id: 'action-toggle-inspect',
        category: 'actions',
        title: t('palette.actions.toggleInspect'),
        icon: <Crosshair className="w-4 h-4 text-purple-400" />,
        action: () => toggleInspectMode(),
      },
      {
        id: 'action-toggle-record',
        category: 'actions',
        title: t('palette.actions.toggleRecord'),
        icon: <Radio className="w-4 h-4 text-rose-400" />,
        action: () => toggleRecordMode(),
      },
      {
        id: 'action-open-settings',
        category: 'actions',
        title: t('palette.actions.openSettings'),
        icon: <Settings className="w-4 h-4 text-stone-400" />,
        action: () => setSettingsOpen(true),
      },
      {
        id: 'action-open-docs',
        category: 'actions',
        title: t('palette.actions.openDocs'),
        icon: <BookOpen className="w-4 h-4 text-teal-400" />,
        action: () => setDocsOpen(true),
      },
      {
        id: 'action-open-projects-view',
        category: 'actions',
        title: t('palette.actions.openProjects'),
        icon: <FolderOpen className="w-4 h-4 text-amber-400" />,
        action: () => setCurrentView('projects'),
      },
      {
        id: 'action-open-studio-view',
        category: 'actions',
        title: t('palette.actions.openStudio'),
        icon: <Monitor className="w-4 h-4 text-emerald-400" />,
        action: () => setCurrentView('studio'),
      }
    );

    // --- Navigation Tabs ---
    const tabs: { id: ActiveTab; labelKey: string; icon: React.ReactNode }[] = [
      { id: 'editor', labelKey: 'palette.navigation.tabEditor', icon: <FileCode className="w-4 h-4 text-amber-400" /> },
      { id: 'steps', labelKey: 'palette.navigation.tabSteps', icon: <Layers className="w-4 h-4 text-blue-400" /> },
      { id: 'ai', labelKey: 'palette.navigation.tabAi', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
      { id: 'timeline', labelKey: 'palette.navigation.tabTimeline', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
      { id: 'reports', labelKey: 'palette.navigation.tabReports', icon: <FileText className="w-4 h-4 text-cyan-400" /> },
      { id: 'cli', labelKey: 'palette.navigation.tabCli', icon: <Terminal className="w-4 h-4 text-stone-400" /> },
      { id: 'config', labelKey: 'palette.navigation.tabConfig', icon: <Settings className="w-4 h-4 text-stone-400" /> },
    ];

    tabs.forEach((tab) => {
      items.push({
        id: `nav-tab-${tab.id}`,
        category: 'navigation',
        title: t(tab.labelKey),
        icon: tab.icon,
        action: () => {
          setCurrentView('studio');
          setActiveTab(tab.id);
        },
      });
    });

    // --- Flows in Active Project ---
    if (activeProject?.flows) {
      activeProject.flows.forEach((flow) => {
        items.push({
          id: `flow-${flow.id}`,
          category: 'flows',
          title: flow.name,
          subtitle: `${activeProject.name} • ${flow.category || 'E2E'}`,
          icon: <FileCode className="w-4 h-4 text-amber-400" />,
          action: () => {
            selectFlow(flow.id);
            setCurrentView('studio');
          },
        });
      });
    }

    // --- Projects ---
    projects.forEach((proj) => {
      items.push({
        id: `project-${proj.id}`,
        category: 'projects',
        title: proj.name,
        subtitle: proj.targetUrl || t('common.all'),
        icon: <Compass className="w-4 h-4 text-sky-400" />,
        action: () => {
          selectProject(proj.id);
          setCurrentView('studio');
        },
      });
    });

    return items;
  }, [
    activeFlow,
    activeProject,
    isExecuting,
    projects,
    t,
    startExecution,
    pauseExecution,
    resetExecution,
    setCreateFlowModalOpen,
    setAutoOpenCreateModal,
    setProjectManagerModalOpen,
    toggleInspectMode,
    toggleRecordMode,
    setSettingsOpen,
    setDocsOpen,
    setCurrentView,
    setActiveTab,
    selectFlow,
    selectProject,
  ]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const cleanQuery = query.toLowerCase().trim();
    return allCommands.filter((cmd) => {
      return (
        cmd.title.toLowerCase().includes(cleanQuery) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(cleanQuery)) ||
        cmd.category.toLowerCase().includes(cleanQuery)
      );
    });
  }, [allCommands, query]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle item scroll into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleExecute = (item: CommandItem) => {
    setOpen(false);
    item.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length === 0 ? 0 : (prev + 1) % filteredCommands.length));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length === 0 ? 0 : (prev - 1 + filteredCommands.length) % filteredCommands.length));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleExecute(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={t('palette.dialogAria')}
    >
      {/* Backdrop overlay button */}
      <button
        type="button"
        className="fixed inset-0 bg-transparent border-0 cursor-default"
        onClick={() => setOpen(false)}
        tabIndex={-1}
        aria-label={t('common.close')}
      />

      <div
        className="relative z-10 w-full max-w-xl bg-stone-900 border border-stone-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-stone-800 bg-stone-950/40">
          <Search className="w-5 h-5 text-stone-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-label={t('palette.searchAria')}
            placeholder={t('palette.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-stone-100 placeholder-stone-500 focus:outline-hidden text-sm"
          />
          <kbd className="px-2 py-0.5 text-xs text-stone-400 bg-stone-800 border border-stone-700 rounded-sm font-mono shrink-0 ml-2">
            {t('palette.footer.escKey')}
          </kbd>
        </div>

        {/* Command Items List */}
        <div
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-stone-800/40"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-stone-500">
              {t('palette.noResults')}
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  type="button"
                  key={item.id}
                  data-index={index}
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => handleExecute(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors text-left focus:outline-hidden ${
                    isSelected ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30' : 'text-stone-300 hover:bg-stone-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="shrink-0 p-1.5 bg-stone-800/80 rounded-md border border-stone-700/50">
                      {item.icon}
                    </span>
                    <div className="flex flex-col truncate">
                      <span className="font-medium truncate">{item.title}</span>
                      {item.subtitle && <span className="text-xs text-stone-500 truncate">{item.subtitle}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 ml-4">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-stone-800 text-stone-400 border border-stone-700/60">
                      {t(`palette.categories.${item.category}` as any)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-stone-950/80 border-t border-stone-800 text-[11px] text-stone-500">
          <div className="flex items-center space-x-3">
            <span>{t('palette.footer.navigate')}</span>
            <span>{t('palette.footer.select')}</span>
            <span>{t('palette.footer.close')}</span>
          </div>
          <span>{t('palette.footer.branding')}</span>
        </div>
      </div>
    </div>
  );
};
