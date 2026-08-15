import React, { Suspense, useEffect, useState } from 'react';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useUiStore } from '@/src/stores/uiStore';
import { useAgentStore } from '@/src/stores/agentStore';
import { useAiConfigStore } from '@/src/stores/aiConfigStore';
import { useAutoSave } from '@/src/hooks/useAutoSave';
import { SplashScreen } from '@/src/components/shared/SplashScreen';

import { Header } from '@/src/components/layout/Header';
import { StudioView } from '@/src/components/studio/StudioView';
import { ErrorBoundary } from '@/src/components/shared/ErrorBoundary';

const ProjectManager = React.lazy(() => import('@/src/components/projects/ProjectManager').then(m => ({ default: m.ProjectManager })));
const ProjectManagerModal = React.lazy(() => import('@/src/components/projects/ProjectManagerModal').then(m => ({ default: m.ProjectManagerModal })));
const SettingsModal = React.lazy(() => import('@/src/components/settings/SettingsModal').then(m => ({ default: m.SettingsModal })));
const DocsModal = React.lazy(() => import('@/src/components/shared/DocsModal').then(m => ({ default: m.DocsModal })));
const CreateFlowModal = React.lazy(() => import('@/src/components/editor/CreateFlowModal').then(m => ({ default: m.CreateFlowModal })));
const WelcomeSetup = React.lazy(() => import('@/src/components/setup/WelcomeSetup').then(m => ({ default: m.WelcomeSetup })));

const ModalFallback = () => null;

export const AppShell: React.FC = () => {
  const [dataReady, setDataReady] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  const scanAgents = useAgentStore((s) => s.scanAgents);
  const setupEventListeners = useExecutionStore((s) => s.setupEventListeners);
  const loadProjectsFromIndexedDb = useProjectStore((s) => s.loadProjectsFromIndexedDb);

  // Auto-save hook
  useAutoSave(30);

  // Initial load sequence using real async tasks in background
  useEffect(() => {
    const loadApp = async () => {
      try {
        await loadProjectsFromIndexedDb();
        await scanAgents();
        await setupEventListeners();
      } catch (err) {
        console.error('Error during initial app boot:', err);
      } finally {
        setDataReady(true);
      }
    };

    loadApp();
  }, [scanAgents, setupEventListeners, loadProjectsFromIndexedDb]);

  const isLoading = !dataReady || !splashFinished;

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

  const selectedAgentId = useAiConfigStore((s) => s.selectedAgentId);
  const loadFromDisk = useAiConfigStore((s) => s.loadFromDisk);

  // Load AI config from disk once on app boot (Electron only; browser mode is memory-only).
  useEffect(() => {
    loadFromDisk();
  }, [loadFromDisk]);

  // Theme application
  const applyThemeCssVars = useSettingsStore((s) => s.applyThemeCssVars);
  useEffect(() => {
    applyThemeCssVars();
  }, [uiSettings, applyThemeCssVars]);

  return (
    <>
      <SplashScreen isLoading={!dataReady} onFinished={() => setSplashFinished(true)} />

      <div
        className={`flex flex-col h-screen w-screen bg-stone-950 overflow-hidden font-sans text-stone-100 transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {!isLoading && !selectedAgentId ? (
          <Suspense fallback={<ModalFallback />}>
            <WelcomeSetup />
          </Suspense>
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
              onResetRun={() => resetExecution()}
              inspectMode={inspectMode}
              onToggleInspectMode={toggleInspectMode}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              devicePreset={devicePreset}
              onDevicePresetChange={setDevicePreset}
              onOpenDocs={() => setDocsOpen(true)}
            />

            <div className="flex-1 flex overflow-hidden relative">
              <ErrorBoundary>
                {currentView === 'projects' ? (
                  <Suspense fallback={<ModalFallback />}>
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
                  </Suspense>
                ) : (
                  <StudioView />
                )}
              </ErrorBoundary>
            </div>

            <Suspense fallback={<ModalFallback />}>
              {isDocsOpen && <DocsModal isOpen={isDocsOpen} onClose={() => setDocsOpen(false)} />}

              {isSettingsOpen && (
                <SettingsModal
                  isOpen={isSettingsOpen}
                  onClose={() => setSettingsOpen(false)}
                  workspaceConfig={workspaceConfig}
                  onWorkspaceConfigChange={updateWorkspaceConfig}
                  uiSettings={uiSettings}
                  onUiSettingsChange={updateUiSettings}
                  activeFlowPath={activeFlow?.path || 'flows/checkout.yaml'}
                />
              )}

              {isCreateFlowModalOpen && (
                <CreateFlowModal
                  isOpen={isCreateFlowModalOpen}
                  onClose={() => setCreateFlowModalOpen(false)}
                  onCreateFlow={(name, category) => {
                    createFlow(name, category);
                    setCreateFlowModalOpen(false);
                  }}
                  existingFlowCount={activeProject?.flows?.length || 0}
                />
              )}

              {isProjectManagerModalOpen && (
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
              )}
            </Suspense>
          </>
        )}
      </div>
    </>
  );
};
