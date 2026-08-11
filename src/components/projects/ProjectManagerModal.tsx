import React from 'react';
import { ProjectManager } from './ProjectManager';
import type { Project } from '../../types/project';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  autoOpenCreateModal?: boolean;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  autoOpenCreateModal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-[12px] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800 bg-stone-950 shrink-0">
          <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
            <span>Project & Environment Manager</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-100 rounded-[6px] hover:bg-stone-800 transition-colors cursor-pointer"
            title="Close Modal"
          >
            <span className="text-lg">&times;</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-stone-950">
          <ProjectManager
            projects={projects}
            onSelectProject={(proj) => {
              onSelectProject(proj);
              onClose();
            }}
            onCreateProject={(proj) => {
              onCreateProject(proj);
              onClose();
            }}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            initialOpenCreateModal={autoOpenCreateModal}
            autoOpenCreateModal={autoOpenCreateModal}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
