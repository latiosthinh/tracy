import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, X } from 'lucide-react';
import type { Project } from '../../types/project';

interface ProjectTabsProps {
  openProjects: Project[];
  allProjects: Project[];
  activeProject: Project;
  isExecuting: boolean;
  onSelectProject: (projectId: string) => void;
  onCloseProjectTab?: (projectId: string) => void;
  onOpenProjectsManager: () => void;
  onOpenCreateProject?: () => void;
}

export const ProjectTabs: React.FC<ProjectTabsProps> = ({
  openProjects,
  allProjects,
  activeProject,
  isExecuting,
  onSelectProject,
  onCloseProjectTab,
  onOpenProjectsManager,
  onOpenCreateProject,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEnvBadgeDot = (env: string) => {
    switch (env) {
      case 'production':
        return 'bg-rose-500';
      case 'staging':
        return 'bg-amber-500';
      case 'local':
        return 'bg-emerald-500';
      default:
        return 'bg-amber-600';
    }
  };

  const getProjectDotClass = (proj: Project) => {
    const isActive = proj.id === activeProject.id;
    if (isActive && isExecuting) {
      return 'bg-amber-400 animate-pulse ring-2 ring-amber-400/60 shadow-xs shadow-amber-400';
    }
    return getEnvBadgeDot(proj.environment);
  };

  return (
    <div className="flex items-center space-x-1 flex-1 min-w-0">
      <div className="flex items-center space-x-1 flex-1 min-w-0 overflow-x-auto no-scrollbar">
        {openProjects.map((proj) => {
          const isActive = proj.id === activeProject.id;
          const isProcessing = isActive && isExecuting;

          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj.id)}
              title={`${proj.name} (${proj.environment})${isProcessing ? ' - Flow processing in progress' : ''}`}
              className={`group flex-1 min-w-[50px] max-w-[200px] shrink px-2 sm:px-2.5 py-1.5 rounded-t-[6px] text-xs font-bold flex items-center justify-between space-x-1 border-t border-x cursor-pointer transition-all overflow-hidden ${
                isActive
                  ? 'bg-stone-900 border-amber-600/80 text-amber-100 shadow-xs'
                  : 'bg-stone-950/70 border-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
              }`}
            >
              <div className="flex items-center space-x-1.5 min-w-0 overflow-hidden">
                <span className={`w-2 h-2 rounded-full shrink-0 transition-all ${getProjectDotClass(proj)}`} />
                <span className="truncate min-w-0 font-medium">{proj.name}</span>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <span className="hidden xl:inline-block text-[9px] uppercase font-mono px-1 py-0.2 rounded-xs bg-stone-950/80 text-stone-400 border border-stone-800/80">
                  {proj.environment}
                </span>

                {openProjects.length > 1 && onCloseProjectTab && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseProjectTab(proj.id);
                    }}
                    className="p-0.5 text-stone-500 hover:text-stone-100 rounded-[4px] hover:bg-stone-800/80 opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Close project tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-[6px] border border-stone-800 flex items-center space-x-1 cursor-pointer"
          title="Open another project tab"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <ChevronDown className={`w-3 h-3 text-stone-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full right-0 mt-1 w-64 max-w-[calc(100vw-2rem)] bg-stone-900 border border-stone-800 rounded-[8px] shadow-2xl z-50 p-2 space-y-1">
            <div className="text-[10px] font-mono text-stone-400 uppercase px-2 py-1 font-bold border-b border-stone-800 flex justify-between items-center">
              <span>Open Project in Tab</span>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onOpenProjectsManager();
                }}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                Manage All
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {allProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p.id);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-stone-800 rounded-[6px] text-xs font-semibold text-stone-200 flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-stone-400">{p.environment}</span>
                </button>
              ))}
            </div>

            <div className="pt-1.5 border-t border-stone-800">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  if (onOpenCreateProject) onOpenCreateProject();
                  else onOpenProjectsManager();
                }}
                className="w-full py-1.5 bg-amber-800 hover:bg-amber-700 text-amber-50 font-bold text-xs rounded-[6px] flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" />
                <span>+ Create New Project</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
