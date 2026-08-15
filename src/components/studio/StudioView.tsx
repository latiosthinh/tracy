import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
} from 'lucide-react';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useUiStore } from '@/src/stores/uiStore';

import { RealBrowserView } from '@/src/components/studio/RealBrowserView';
import { ElementInspector } from '@/src/components/studio/ElementInspector';
import { BatchMinerModal, BatchTarget } from '@/src/components/studio/BatchMinerModal';
import { StudioToolbar } from '@/src/components/studio/StudioToolbar';
import { DomMinerPanel } from '@/src/components/studio/DomMinerPanel';
import { StudioRightSidebar } from '@/src/components/studio/StudioRightSidebar';

import type { InspectedElement, CommandType, FlowStep, MinedPageData } from '@/src/types/index';

import { tracyApi } from '@/src/lib/ipc';

export const StudioView: React.FC = () => {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeFlowId = useProjectStore((s) => s.activeFlowId);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
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

  const updateYamlContent = useProjectStore((s) => s.updateYamlContent);
  const updateFlowSteps = useProjectStore((s) => s.updateFlowSteps);
  const updateFlowCategory = useProjectStore((s) => s.updateFlowCategory);
  const batchAddFlows = useProjectStore((s) => s.batchAddFlows);
  const renameFlow = useProjectStore((s) => s.renameFlow);

  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const activeStepIndex = useExecutionStore((s) => s.activeStepIndex);
  const executionLogs = useExecutionStore((s) => s.executionLogs);
  const lastResult = useExecutionStore((s) => s.lastResult);
  const executionSpeed = useExecutionStore((s) => s.executionSpeed);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const pauseExecution = useExecutionStore((s) => s.pauseExecution);
  const resetExecution = useExecutionStore((s) => s.resetExecution);
  const setExecutionSpeed = useExecutionStore((s) => s.setExecutionSpeed);

  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const inspectMode = useUiStore((s) => s.inspectMode);
  const toggleInspectMode = useUiStore((s) => s.toggleInspectMode);
  const recordMode = useUiStore((s) => s.recordMode);
  const toggleRecordMode = useUiStore((s) => s.toggleRecordMode);
  const devicePreset = useUiStore((s) => s.devicePreset);
  const setDevicePreset = useUiStore((s) => s.setDevicePreset);

  const isDocsOpen = useUiStore((s) => s.isDocsOpen);
  const isSettingsOpen = useUiStore((s) => s.isSettingsOpen);
  const isProjectManagerModalOpen = useUiStore((s) => s.isProjectManagerModalOpen);
  const isCreateFlowModalOpen = useUiStore((s) => s.isCreateFlowModalOpen);

  const workspaceConfig = useSettingsStore((s) => s.workspaceConfig);
  const updateWorkspaceConfig = useSettingsStore((s) => s.updateWorkspaceConfig);
  const uiSettings = useSettingsStore((s) => s.uiSettings);

  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const browserPaths = useProjectStore((s) => s.browserPaths);
  const setBrowserPath = useProjectStore((s) => s.setBrowserPath);
  const targetPath = browserPaths[activeProjectId] || '/';
  const setTargetPath = useCallback((path: string) => setBrowserPath(activeProjectId, path), [activeProjectId, setBrowserPath]);
  const [embedUrlInput, setEmbedUrlInput] = useState<string>(`${activeProject?.targetUrl || ''}${targetPath}`);
  const [yamlCopied, setYamlCopied] = useState<boolean>(false);
  const [isEditingActiveFlowName, setIsEditingActiveFlowName] = useState<boolean>(false);
  const [activeFlowNameInput, setActiveFlowNameInput] = useState<string>('');

  // DOM Mining state
  const [showDomMiner, setShowDomMiner] = useState(false);
  const [showBatchMiner, setShowBatchMiner] = useState(false);
  const [, setMinedDom] = useState<MinedPageData | null>(null);
  const [isMining, setIsMining] = useState<boolean>(false);
  const [mineToast, setMineToast] = useState<string | null>(null);
  const [mineProgressMessage, setMineProgressMessage] = useState<string | null>(null);
  const [selectedSnapshotPath, setSelectedSnapshotPath] = useState<string | null>(null);

  const addDomSnapshot = useProjectStore((s) => s.addDomSnapshot);
  const getAllDomSnapshots = useProjectStore((s) => s.getAllDomSnapshots);
  const domSnapshots = getAllDomSnapshots(activeProjectId);
  
  const isAnyModalOpen = isDocsOpen || isSettingsOpen || isProjectManagerModalOpen || isCreateFlowModalOpen || showBatchMiner;
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
      setEmbedUrlInput(targetPath);
    } else {
      const base = (activeProject?.targetUrl || '').replace(/\/$/, '');
      const path = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      setEmbedUrlInput(`${base}${path}`);
    }
  }, [activeProject?.targetUrl, targetPath]);

  useEffect(() => {
    const handleBrowserEvent = (payload: { type: string; data: any }) => {
      console.log('Browser event:', payload.type, payload.data);
      if (payload.type === 'page-navigated') {
        setTargetPath(payload.data.url);
        if (inputRef.current) {
          inputRef.current.value = payload.data.url;
        }
      }
    };

    let unlistenBrowser: (() => void) | undefined;
    let unlistenMine: (() => void) | undefined;

    tracyApi.onBrowserEvent(handleBrowserEvent).then(fn => { unlistenBrowser = fn; });
    tracyApi.onMineProgress((msg) => { setMineProgressMessage(msg); }).then(fn => { unlistenMine = fn; });

    return () => {
      if (unlistenBrowser) unlistenBrowser();
      if (unlistenMine) unlistenMine();
    };
  }, [activeProjectId, setTargetPath]);

  // Resizable split panel state
  const [sidePanelWidth, setSidePanelWidth] = useState(520);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidePanelWidth;
  }, [sidePanelWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.min(Math.max(dragStartWidth.current + delta, 320), window.innerWidth - 400);
      setSidePanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleYamlChange = (newYaml: string) => {
    updateYamlContent(newYaml);
  };

  const handleStepsChange = (newSteps: FlowStep[]) => {
    updateFlowSteps(newSteps);
  };

  const handleFlowCategoryChange = (flowId: string, category: any) => {
    updateFlowCategory(flowId, category);
  };

  const handleRenameFlow = (flowId: string, newName: string) => {
    renameFlow(flowId, newName);
  };

  const handleCopyYaml = () => {
    if (activeFlow?.yamlContent) {
      navigator.clipboard.writeText(activeFlow.yamlContent);
      setYamlCopied(true);
      setTimeout(() => setYamlCopied(false), 2000);
    }
  };

  const handleInsertStepFromInspector = (command: CommandType, target: any, value?: string) => {
    const newStep: FlowStep = {
      id: `step-${Date.now()}`,
      command,
      target,
      value,
      status: 'pending',
    };
    const updatedSteps = [...activeFlow.steps, newStep];
    handleStepsChange(updatedSteps);

    let yamlSnippet = `\n- ${command}:`;
    if (typeof target === 'string') {
      yamlSnippet += ` "${target}"`;
    } else if (target && typeof target === 'object') {
      yamlSnippet += `\n    selector:\n      ${target.type}: "${target.value}"`;
    }
    if (value) {
      yamlSnippet += `\n    value: "${value}"`;
    }
    handleYamlChange(activeFlow.yamlContent + yamlSnippet);
  };

  const handleInspected = (element: any) => {
    setInspectedElement(element);

    if (recordMode && element) {
      let selector = '';
      if (element.testId) {
        selector = `[data-testid="${element.testId}"]`;
      } else if (element.id) {
        selector = `#${element.id}`;
      } else if (element.role && element.label) {
        selector = `[role="${element.role}"][aria-label="${element.label}"]`;
      } else if (element.text) {
        selector = `text="${element.text}"`;
      } else if (element.suggestedSelectors && element.suggestedSelectors.length > 0) {
        selector = element.suggestedSelectors[0].value;
      }

      if (selector) {
        handleInsertStepFromInspector('leftClick', { type: 'css', value: selector });
      }
      setInspectedElement(null);
    }
  };

  const handleMineDOM = async () => {
    setIsMining(true);
    setMineToast('Mining DOM via Playwright...');

    try {
      const result = await tracyApi.getBrowserDomTree();
      if (!result || !result.tree) {
        setMineToast('DOM mining failed: No tree returned.');
        setTimeout(() => setMineToast(null), 3000);
        setIsMining(false);
        return;
      }

      const snapshot: MinedPageData = {
        url: result.url,
        path: targetPath || '/',
        timestamp: new Date().toISOString(),
        tree: result.tree,
        stats: result.stats,
      };

      setMinedDom(snapshot);
      addDomSnapshot(activeProjectId, targetPath || '/', snapshot);
      setMineToast(`Mined ${result.stats.interactiveNodes} interactive elements from ${targetPath || '/'}`);
      setTimeout(() => setMineToast(null), 4000);
    } catch (err) {
      setMineToast('DOM mining failed. Try again.');
      setTimeout(() => setMineToast(null), 3000);
    }

    setIsMining(false);
  };

  const handleBatchMineSubmit = async (targets: BatchTarget[]) => {
    setShowBatchMiner(false);
    setIsMining(true);
    setMineProgressMessage('Starting batch mining...');
    
    try {
      const results = await tracyApi.mineBatchUrls(targets, embedUrlInput);
      if (!results || results.length === 0) {
        setMineToast('Batch mining failed or returned no results.');
        setTimeout(() => setMineToast(null), 3000);
        setIsMining(false);
        setMineProgressMessage(null);
        return;
      }
      
      let count = 0;
      for (const res of results) {
        let path = '/';
        try {
          const urlObj = new URL(res.url);
          path = urlObj.pathname + urlObj.search;
        } catch(e) {}
        const snapshot: MinedPageData = {
          url: res.url,
          path,
          timestamp: new Date().toISOString(),
          tree: res.tree,
          stats: res.stats,
        };
        addDomSnapshot(activeProjectId, path, snapshot);
        count++;
      }
      
      setMineToast(`Mined ${count} pages from batch!`);
      setTimeout(() => setMineToast(null), 4000);
    } catch (err) {
      setMineToast('Batch mining failed.');
      setTimeout(() => setMineToast(null), 3000);
    }
    
    setIsMining(false);
    setMineProgressMessage(null);
  };

  const handleExplainFailureWithAi = () => {
    setActiveTab('ai');
  };

  const getMinedDomContext = (): string => {
    const snapshots = Object.values(domSnapshots);
    if (snapshots.length === 0) return '';

    let context = `## Mined DOM Snapshots (${snapshots.length} pages)\n`;
    context += `These are pre-calculated DOM maps for token-efficient AI flow generation.\n\n`;
    for (const snap of snapshots) {
      context += `### Page: ${snap.path}\n`;
      context += `URL: ${snap.url}\n`;
      context += `Interactive elements: ${snap.stats.interactiveNodes}, Text holders: ${snap.stats.textHolders}\n\n`;
      context += snap.tree + '\n\n';
    }
    return context;
  };

  const getViewportWidthPx = () => {
    switch (devicePreset) {
      case 'Desktop 1440': return 1440;
      case 'Laptop 1280': return 1280;
      case 'Tablet iPad': return 768;
      case 'Mobile iPhone 14':
      case 'Mobile Pixel 7': return 375;
      default: return 1280;
    }
  };

  return (
    <div className={`flex-1 flex flex-col ${uiSettings.yamlPosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} overflow-hidden relative`}>
      <div className="flex-1 flex flex-col bg-stone-900 overflow-hidden relative">
        <StudioToolbar
          targetPath={targetPath}
          setTargetPath={setTargetPath}
          embedUrlInput={embedUrlInput}
          setEmbedUrlInput={setEmbedUrlInput}
          recordMode={recordMode}
          toggleRecordMode={toggleRecordMode}
          inspectMode={inspectMode}
          toggleInspectMode={toggleInspectMode}
          devicePreset={devicePreset}
          setDevicePreset={setDevicePreset}
          isMining={isMining}
          handleMineDOM={handleMineDOM}
          setShowBatchMiner={setShowBatchMiner}
          domSnapshotsCount={Object.keys(domSnapshots).length}
          showDomMiner={showDomMiner}
          setShowDomMiner={setShowDomMiner}
          mineProgressMessage={mineProgressMessage}
        />

        {/* Main Content Split: Browser (Top) + DOM Miner (Bottom) */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Main Browser Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto bg-stone-900 flex flex-col">
              <RealBrowserView
                key={activeProjectId}
                projectId={activeProjectId}
                targetUrl={activeProject?.targetUrl || ''}
                activePath={targetPath}
                viewportWidth={getViewportWidthPx()}
                onNavigate={setTargetPath}
                recordMode={recordMode}
                inspectMode={inspectMode}
                onElementInspected={handleInspected}
                hideWebview={isAnyModalOpen}
              />
            </div>

            {inspectMode && (
              <div className="p-3 bg-stone-950 border-t border-stone-800 shrink-0">
                <ElementInspector
                  element={inspectedElement}
                  onInsertStep={handleInsertStepFromInspector}
                  onClose={() => toggleInspectMode()}
                />
              </div>
            )}
          </div>

          {/* Bottom Split: DOM Miner DevTools Panel */}
          {showDomMiner && (
            <DomMinerPanel
              domSnapshots={domSnapshots}
              selectedSnapshotPath={selectedSnapshotPath}
              setSelectedSnapshotPath={setSelectedSnapshotPath}
              setShowDomMiner={setShowDomMiner}
              setShowBatchMiner={setShowBatchMiner}
            />
          )}
        </div>

        {mineToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-cyan-300 px-4 py-2 rounded border border-cyan-500/80 shadow-2xl font-mono text-xs font-bold flex items-center space-x-2">
            {isMining ? <span className="animate-spin">⛏</span> : <Database className="w-3.5 h-3.5" />}
            <span>{mineToast}</span>
          </div>
        )}
      </div>

      {/* Resizable Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1.5 bg-stone-800 hover:bg-amber-600 cursor-col-resize shrink-0 transition-colors flex items-center justify-center ${isDragging ? 'bg-amber-500' : ''
          }`}
      >
        <div className={`w-0.5 h-8 rounded-full ${isDragging ? 'bg-amber-300' : 'bg-stone-600'}`} />
      </div>

      {/* Side Panel */}
      <StudioRightSidebar
        sidePanelWidth={sidePanelWidth}
        activeFlow={activeFlow}
        activeProject={activeProject}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isExecuting={isExecuting}
        startExecution={startExecution}
        pauseExecution={pauseExecution}
        resetExecution={resetExecution}
        handleCopyYaml={handleCopyYaml}
        yamlCopied={yamlCopied}
        activeFlowNameInput={activeFlowNameInput}
        setActiveFlowNameInput={setActiveFlowNameInput}
        isEditingActiveFlowName={isEditingActiveFlowName}
        setIsEditingActiveFlowName={setIsEditingActiveFlowName}
        handleRenameFlow={handleRenameFlow}
        handleFlowCategoryChange={handleFlowCategoryChange}
        handleYamlChange={handleYamlChange}
        handleStepsChange={handleStepsChange}
        activeStepIndex={activeStepIndex}
        executionLogs={executionLogs}
        executionSpeed={executionSpeed}
        setExecutionSpeed={setExecutionSpeed}
        lastResult={lastResult}
        handleExplainFailureWithAi={handleExplainFailureWithAi}
        batchAddFlows={batchAddFlows}
        getMinedDomContext={getMinedDomContext}
        workspaceConfig={workspaceConfig}
        updateWorkspaceConfig={updateWorkspaceConfig}
      />

      <BatchMinerModal 
        isOpen={showBatchMiner} 
        onClose={() => setShowBatchMiner(false)} 
        onSubmit={handleBatchMineSubmit} 
      />
    </div>
  );
};
