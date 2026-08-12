import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useUiStore } from '@/src/stores/uiStore';
import { useAgentStore } from '@/src/stores/agentStore';
import { useAutoSave } from '@/src/hooks/useAutoSave';
import { SplashScreen } from '@/src/components/shared/SplashScreen';

import { Header } from '@/src/components/layout/Header';
import { StudioView } from '@/src/components/studio/StudioView';
import { ProjectManager } from '@/src/components/projects/ProjectManager';
import { ProjectManagerModal } from '@/src/components/projects/ProjectManagerModal';
import { SettingsModal } from '@/src/components/settings/SettingsModal';
import { DocsModal } from '@/src/components/shared/DocsModal';
import { CreateFlowModal } from '@/src/components/editor/CreateFlowModal';
import { WelcomeSetup } from '@/src/components/setup/WelcomeSetup';

export const AppShell: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>('init');

  // Auto-save hook
  useAutoSave(30);

  // Initial load sequence using real async tasks
  useEffect(() => {
    const loadApp = async () => {
      setLoadingStep('init');
      await scanAgents();
      setLoadingStep('projects');
      setupEventListeners();
      setLoadingStep('ready');
      setIsLoading(false);
    };

    loadApp();
  }, []);

  const scanAgents = useAgentStore((s) => s.scanAgents);
  const setupEventListeners = useExecutionStore((s) => s.setupEventListeners);

  // Project store state
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const openProjectIds = useProjectStore((s) => s.openProjectIds);
  const activeFlowId = useProjectStore((s) => s.activeFlowId);

  // Derived state
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const openProjects = projects.filter((p) => openProjectIds.includes(p.id));
  const activeFlow =
    activeProject?.flows.find((f) => f.id === activeFlowId) ||
    activeProject?.flows[0] || {
      id: 'empty',
      name: 'empty.yaml',
      path: 'flows/empty.yaml',
      tags: [],
      metadata: { url: activeProject?.targetUrl },
      yamlContent: `# Empty Flow\nurl: ${activeProject?.targetUrl}\n---\n- navigate: /`,
      steps: [],
    };

  // Actions
  const selectProject = useProjectStore((s) => s.selectProject);
  const closeProjectTab = useProjectStore((s) => s.closeProjectTab);
  const createProject = useProjectStore((s) => s.createProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const updateTargetUrl = useProjectStore((s) => s.updateTargetUrl);

  const selectFlow = useProjectStore((s) => s.selectFlow);
  const closeFlowTab = useProjectStore((s) => s.closeFlowTab);
  const createFlow = useProjectStore((s) => s.createFlow);
  const renameFlow = useProjectStore((s) => s.renameFlow);
  const updateFlowCategory = useProjectStore((s) => s.updateFlowCategory);

  // Execution store
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const pauseExecution = useExecutionStore((s) => s.pauseExecution);
  const resetExecution = useExecutionStore((s) => s.resetExecution);

  // UI store
  const currentView = useUiStore((s) => s.currentView);
  const setCurrentView = useUiStore((s) => s.setCurrentView);
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const devicePreset = useUiStore((s) => s.devicePreset);
  const setDevicePreset = useUiStore((s) => s.setDevicePreset);
  const inspectMode = useUiStore((s) => s.inspectMode);
  const toggleInspectMode = useUiStore((s) => s.toggleInspectMode);

  const isDocsOpen = useUiStore((s) => s.isDocsOpen);
  const setDocsOpen = useUiStore((s) => s.setDocsOpen);
  const isSettingsOpen = useUiStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const isProjectManagerModalOpen = useUiStore((s) => s.isProjectManagerModalOpen);
  const setProjectManagerModalOpen = useUiStore((s) => s.setProjectManagerModalOpen);
  const isCreateFlowModalOpen = useUiStore((s) => s.isCreateFlowModalOpen);
  const setCreateFlowModalOpen = useUiStore((s) => s.setCreateFlowModalOpen);
  const autoOpenCreateModal = useUiStore((s) => s.autoOpenCreateModal);
  const setAutoOpenCreateModal = useUiStore((s) => s.setAutoOpenCreateModal);

  // Settings store
  const uiSettings = useSettingsStore((s) => s.uiSettings);
  const updateUiSettings = useSettingsStore((s) => s.updateUiSettings);
  const workspaceConfig = useSettingsStore((s) => s.workspaceConfig);
  const updateWorkspaceConfig = useSettingsStore((s) => s.updateWorkspaceConfig);

  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);

  // Theme application
  const applyThemeCssVars = useSettingsStore((s) => s.applyThemeCssVars);
  useEffect(() => {
    applyThemeCssVars();
  }, [uiSettings, applyThemeCssVars]);

  return (
    <>
      <SplashScreen isLoading={isLoading} currentStep={loadingStep} />

      <div
        className={`flex flex-col h-screen w-screen bg-stone-950 overflow-hidden font-sans text-stone-100 transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {!isLoading && !selectedAgentId ? (
          <WelcomeSetup />
        ) : (
          <>
            <Header
              openProjects={openProjects}
              allProjects={projects}
              activeProject={activeProject}
              onSelectProject={(id) => {
                selectProject(id);
                setCurrentView('studio');
          }}
          onCloseProjectTab={closeProjectTab}
          onOpenProjectsManager={() => {
            setAutoOpenCreateModal(false);
            setProjectManagerModalOpen(true);
          }}
          onOpenCreateProject={() => {
            setAutoOpenCreateModal(true);
            setProjectManagerModalOpen(true);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          targetUrl={activeProject?.targetUrl || 'http://localhost:3000'}
          onUpdateTargetUrl={updateTargetUrl}
          flows={activeProject?.flows || []}
          activeFlow={activeFlow}
          onSelectFlow={selectFlow}
          onCloseFlowTab={closeFlowTab}
          onCreateNewFlow={() => setCreateFlowModalOpen(true)}
          onRenameFlow={renameFlow}
          onUpdateFlowCategory={updateFlowCategory}
          isExecuting={isExecuting}
          onStartRun={() => startExecution(activeFlow, activeProject?.targetUrl || '')}
          onPauseRun={pauseExecution}
          onResetRun={() => resetExecution(activeFlow)}
          inspectMode={inspectMode}
          onToggleInspectMode={toggleInspectMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          devicePreset={devicePreset}
          onDevicePresetChange={setDevicePreset}
          onOpenDocs={() => setDocsOpen(true)}
        />

        <div className="flex-1 flex overflow-hidden relative">
          {currentView === 'projects' ? (
            <ProjectManager
              projects={projects}
              onSelectProject={(proj) => {
                selectProject(proj.id);
                setCurrentView('studio');
              }}
              onCreateProject={(proj) => {
                createProject(proj);
                setCurrentView('studio');
              }}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              initialOpenCreateModal={autoOpenCreateModal}
            />
          ) : (
            <StudioView />
          )}
        </div>

        <DocsModal isOpen={isDocsOpen} onClose={() => setDocsOpen(false)} />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setSettingsOpen(false)}
          workspaceConfig={workspaceConfig}
          onWorkspaceConfigChange={updateWorkspaceConfig}
          uiSettings={uiSettings}
          onUiSettingsChange={updateUiSettings}
          activeFlowPath={activeFlow?.path || 'flows/checkout.yaml'}
        />

        <CreateFlowModal
          isOpen={isCreateFlowModalOpen}
          onClose={() => setCreateFlowModalOpen(false)}
          onCreateFlow={(name, category) => {
            createFlow(name, category);
            setCreateFlowModalOpen(false);
          }}
          existingFlowCount={activeProject?.flows?.length || 0}
        />

        <ProjectManagerModal
          isOpen={isProjectManagerModalOpen}
          onClose={() => setProjectManagerModalOpen(false)}
          projects={projects}
          onSelectProject={(proj) => {
            selectProject(proj.id);
            setCurrentView('studio');
          }}
          onCreateProject={(proj) => {
            createProject(proj);
            setCurrentView('studio');
          }}
          onUpdateProject={updateProject}
          onDeleteProject={deleteProject}
          autoOpenCreateModal={autoOpenCreateModal}
        />
          </>
        )}
      </div>
    </>
  );
};
