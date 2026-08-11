import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  FileCode,
  Layers,
  Terminal,
  Sparkles,
  BarChart3,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  MousePointer,
  Play,
  Pause,
  Copy,
  Check,
  Pencil,
  CircleDot,
  Pickaxe,
  Database,
  X,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';

import { RealBrowserView } from './RealBrowserView';
import { ElementInspector } from './ElementInspector';
import { StepTimeline } from './StepTimeline';

import { YamlEditor } from '../editor/YamlEditor';
import { VisualStepEditor } from '../editor/VisualStepEditor';
import { AiCopilot } from '../ai/AiCopilot';
import { TestReports } from '../reports/TestReports';
import { CliTerminal } from '../reports/CliTerminal';
import { FlowCategorySelector } from '../editor/FlowCategorySelector';

import type { InspectedElement, CommandType, FlowStep, MinedPageData } from '../../types/index';
import { getFlowCategory } from '../../utils/flowUtils';
import { minePlaywrightDom } from '../../utils/domMiner';

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

  const workspaceConfig = useSettingsStore((s) => s.workspaceConfig);
  const updateWorkspaceConfig = useSettingsStore((s) => s.updateWorkspaceConfig);
  const uiSettings = useSettingsStore((s) => s.uiSettings);

  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const [targetPath, setTargetPath] = useState<string>('/products');
  const [embedUrlInput, setEmbedUrlInput] = useState<string>(`${activeProject?.targetUrl || ''}${targetPath}`);
  const [yamlCopied, setYamlCopied] = useState<boolean>(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('gemini-2.5-flash');
  const [isEditingActiveFlowName, setIsEditingActiveFlowName] = useState<boolean>(false);
  const [activeFlowNameInput, setActiveFlowNameInput] = useState<string>('');

  // DOM Mining state
  const [showDomMiner, setShowDomMiner] = useState<boolean>(false);
  const [, setMinedDom] = useState<MinedPageData | null>(null);
  const [isMining, setIsMining] = useState<boolean>(false);
  const [mineToast, setMineToast] = useState<string | null>(null);

  const addDomSnapshot = useProjectStore((s) => s.addDomSnapshot);
  const getAllDomSnapshots = useProjectStore((s) => s.getAllDomSnapshots);
  const clearDomSnapshots = useProjectStore((s) => s.clearDomSnapshots);
  const domSnapshots = getAllDomSnapshots(activeProjectId);

  useEffect(() => {
    if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
      setEmbedUrlInput(targetPath);
    } else {
      const base = (activeProject?.targetUrl || '').replace(/\/$/, '');
      const path = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      setEmbedUrlInput(`${base}${path}`);
    }
  }, [activeProject?.targetUrl, targetPath]);

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

  const handleExplainFailureWithAi = () => {
    setActiveTab('ai');
  };

  const handleMineDOM = async () => {
    setIsMining(true);
    setMineToast('Mining DOM via Playwright...');
    
    try {
      const result = await tracyApi.getBrowserDomTree();
      if (!result || !result.domTree) {
        setMineToast('DOM mining failed: No tree returned.');
        setTimeout(() => setMineToast(null), 3000);
        setIsMining(false);
        return;
      }

      const mined = minePlaywrightDom(result.domTree, currentBrowserState.url || targetPath || '/', currentBrowserState.title || '');
      
      const snapshot: MinedPageData = {
        url: mined.url,
        path: targetPath || '/',
        timestamp: new Date().toISOString(),
        tree: mined.tree,
        stats: mined.stats,
      };

      setMinedDom(snapshot);
      addDomSnapshot(activeProjectId, targetPath || '/', snapshot);
      setMineToast(`Mined ${mined.stats.interactiveNodes} interactive elements from ${targetPath || '/'}`);
      setTimeout(() => setMineToast(null), 4000);
    } catch (err) {
      setMineToast('DOM mining failed. Try again.');
      setTimeout(() => setMineToast(null), 3000);
    }
    
    setIsMining(false);
  };

  const handleClearDomSnapshots = () => {
    clearDomSnapshots(activeProjectId);
    setMinedDom(null);
    setMineToast('All DOM snapshots cleared');
    setTimeout(() => setMineToast(null), 2000);
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
      {/* Left Column: Target Web Application Sandbox & Element Inspector */}
      <div className="flex-1 flex flex-col bg-stone-900 overflow-hidden relative">
        {/* Browser Navigation & Address Bar */}
        <div className="bg-stone-950 px-3 py-2 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 shrink-0 font-sans">
          <div className="flex items-center space-x-1 shrink-0 text-stone-400 bg-stone-900 border border-stone-800 rounded-[6px] p-0.5">
            <button
              onClick={() => setTargetPath('/')}
              className="p-1 hover:bg-stone-800 hover:text-stone-100 rounded-[4px] transition-all cursor-pointer"
              title="Back to root"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1 text-stone-600 cursor-not-allowed rounded-[4px]"
              title="Forward"
              disabled
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const cur = targetPath;
                setTargetPath('');
                setTimeout(() => setTargetPath(cur), 50);
              }}
              className="p-1 hover:bg-stone-800 hover:text-stone-100 rounded-[4px] transition-all cursor-pointer"
              title="Reload page"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!embedUrlInput.trim()) return;
              let raw = embedUrlInput.trim();
              if (raw.startsWith('http://') || raw.startsWith('https://')) {
                setTargetPath(raw);
              } else if ((raw.includes('.') || raw.includes('localhost')) && !raw.includes(' ') && !raw.startsWith('/')) {
                const url = raw.startsWith('localhost') || raw.startsWith('127.0.0.1')
                  ? `http://${raw}`
                  : `https://${raw}`;
                setTargetPath(url);
              } else {
                if (!raw.startsWith('/')) raw = '/' + raw;
                setTargetPath(raw);
              }
            }}
            className="flex-1 max-w-xl flex items-center space-x-1.5"
          >
            <div className="w-full bg-stone-900 border border-stone-800 focus-within:border-amber-600/80 rounded-[6px] px-2.5 py-1 flex items-center space-x-2 shadow-inner">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={embedUrlInput}
                onChange={(e) => setEmbedUrlInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Enter target URL or path e.g. google.com or /checkout"
                className="w-full bg-transparent text-amber-50 font-mono text-xs focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-2 py-0.5 bg-amber-800 hover:bg-amber-700 text-amber-100 font-mono text-[10px] font-bold rounded-[4px] border border-amber-600/80 shrink-0 cursor-pointer"
              >
                Go
              </button>
            </div>
          </form>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                toggleRecordMode();
                if (inspectMode) toggleInspectMode();
              }}
              title={recordMode ? 'Stop Recording User Interactions' : 'Record User Interactions on Website'}
              className={`px-2 py-1 rounded-[6px] text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer ${
                recordMode
                  ? 'bg-rose-950 text-rose-200 border-rose-600 ring-2 ring-rose-500/40 shadow-md'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-rose-300 border-stone-800'
              }`}
            >
              <CircleDot className={`w-3.5 h-3.5 ${recordMode ? 'text-rose-500 animate-ping' : 'text-rose-400'}`} />
              <span className="hidden sm:inline">{recordMode ? 'Recording...' : 'Record'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                toggleInspectMode();
                if (recordMode) toggleRecordMode();
              }}
              title={inspectMode ? 'Disable Inspect Mode' : 'Inspect DOM Elements'}
              className={`p-1.5 rounded-[6px] text-xs font-bold transition-all border cursor-pointer ${
                inspectMode
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/30 shadow-md'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800'
              }`}
            >
              <MousePointer className={`w-3.5 h-3.5 ${inspectMode ? 'text-amber-400 animate-pulse' : ''}`} />
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-stone-900 p-1 rounded-[6px] border border-stone-800 text-xs shrink-0">
            <button
              type="button"
              onClick={handleMineDOM}
              disabled={isMining}
              className={`p-1.5 rounded-[4px] transition-all relative cursor-pointer ${
                Object.keys(domSnapshots).length > 0
                  ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/60'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
              title="Mine DOM tree for AI context"
            >
              {isMining ? (
                <span className="w-3.5 h-3.5 block animate-spin">⛏</span>
              ) : (
                <Pickaxe className="w-3.5 h-3.5" />
              )}
              {Object.keys(domSnapshots).length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                  {Object.keys(domSnapshots).length}
                </span>
              )}
            </button>

            {Object.keys(domSnapshots).length > 0 && (
              <button
                type="button"
                onClick={() => setShowDomMiner(!showDomMiner)}
                className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                  showDomMiner
                    ? 'bg-cyan-800 text-cyan-100'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
                title="View DOM snapshots"
              >
                <Database className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setDevicePreset('Desktop 1440')}
              className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                devicePreset === 'Desktop 1440' ? 'bg-amber-800 text-amber-100' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
              title="Desktop 1440px"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDevicePreset('Laptop 1280')}
              className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                devicePreset === 'Laptop 1280' ? 'bg-amber-800 text-amber-100' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
              title="Laptop 1280px"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDevicePreset('Tablet iPad')}
              className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                devicePreset === 'Tablet iPad' ? 'bg-amber-800 text-amber-100' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
              title="Tablet 768px"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDevicePreset('Mobile iPhone 14')}
              className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                devicePreset === 'Mobile iPhone 14' ? 'bg-amber-800 text-amber-100' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
              title="Mobile 375px"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-stone-900 flex flex-col">
          <RealBrowserView
            targetUrl={activeProject?.targetUrl || ''}
            activePath={targetPath}
            viewportWidth={getViewportWidthPx()}
            onNavigate={setTargetPath}
            recordMode={recordMode}
            inspectMode={inspectMode}
            onElementInspected={setInspectedElement}
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

        {showDomMiner && (
          <div className="absolute inset-0 z-40 bg-stone-950/95 backdrop-blur-sm flex flex-col">
            <div className="px-4 py-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-cyan-100 text-sm">DOM Miner Snapshots</span>
                <span className="text-xs text-stone-400 font-mono">({Object.keys(domSnapshots).length} pages)</span>
              </div>
              <div className="flex items-center space-x-2">
                {Object.keys(domSnapshots).length > 0 && (
                  <button
                    onClick={handleClearDomSnapshots}
                    className="px-2 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-300 text-xs rounded border border-rose-700/60 flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  onClick={() => setShowDomMiner(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-100 rounded hover:bg-stone-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Object.keys(domSnapshots).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <Pickaxe className="w-12 h-12 text-stone-600" />
                  <h3 className="text-stone-300 font-bold text-sm">No DOM Snapshots Yet</h3>
                  <p className="text-stone-500 text-xs max-w-sm">
                    Click the pickaxe icon in the browser toolbar to mine the current page DOM.
                  </p>
                  <button
                    onClick={handleMineDOM}
                    disabled={isMining}
                    className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-cyan-50 text-xs font-bold rounded border border-cyan-600 flex items-center space-x-2 cursor-pointer"
                  >
                    <Pickaxe className="w-3.5 h-3.5" />
                    <span>Mine Current Page</span>
                  </button>
                </div>
              ) : (
                Object.entries(domSnapshots).map(([path, snap]) => (
                  <div key={path} className="bg-stone-900 border border-stone-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-mono text-xs text-cyan-300 font-bold">{path}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono">{new Date(snap.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] font-mono text-stone-400">
                      <span>{snap.stats.interactiveNodes} interactive</span>
                      <span>{snap.stats.textHolders} text</span>
                      <span>{snap.stats.visibleNodes} visible</span>
                    </div>
                    <pre className="p-2 bg-stone-950 rounded border border-stone-800 font-mono text-[10px] text-stone-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {snap.tree}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
        className={`w-1.5 bg-stone-800 hover:bg-amber-600 cursor-col-resize shrink-0 transition-colors flex items-center justify-center ${
          isDragging ? 'bg-amber-500' : ''
        }`}
      >
        <div className={`w-0.5 h-8 rounded-full ${isDragging ? 'bg-amber-300' : 'bg-stone-600'}`} />
      </div>

      {/* Side Panel */}
      <div
        className="h-full bg-stone-950 flex flex-col overflow-hidden shrink-0 border-l border-stone-800"
        style={{ width: `${sidePanelWidth}px` }}
      >
        {/* Flow Header */}
        <div className="bg-stone-950 px-3.5 py-2 border-b border-stone-800 flex items-center justify-between gap-2 shrink-0 font-sans">
          <div className="flex items-center space-x-2 truncate min-w-0">
            <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
            {isEditingActiveFlowName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (activeFlowNameInput.trim()) {
                    handleRenameFlow(activeFlow.id, activeFlowNameInput.trim());
                  }
                  setIsEditingActiveFlowName(false);
                }}
                className="flex items-center space-x-1"
              >
                <input
                  type="text"
                  value={activeFlowNameInput}
                  onChange={(e) => setActiveFlowNameInput(e.target.value)}
                  onBlur={() => {
                    if (activeFlowNameInput.trim()) {
                      handleRenameFlow(activeFlow.id, activeFlowNameInput.trim());
                    }
                    setIsEditingActiveFlowName(false);
                  }}
                  autoFocus
                  className="bg-stone-900 border border-amber-500 rounded px-2 py-0.5 text-xs font-mono text-stone-100 focus:outline-none"
                />
              </form>
            ) : (
              <div className="flex items-center space-x-1.5 min-w-0">
                <span
                  onClick={() => {
                    setActiveFlowNameInput(activeFlow.name);
                    setIsEditingActiveFlowName(true);
                  }}
                  className="font-mono font-bold text-stone-100 text-xs truncate cursor-pointer hover:text-amber-300 transition-colors"
                  title="Click to rename flow"
                >
                  {activeFlow.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFlowNameInput(activeFlow.name);
                    setIsEditingActiveFlowName(true);
                  }}
                  className="p-1 text-stone-500 hover:text-amber-400 rounded transition-colors cursor-pointer"
                  title="Rename flow"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <FlowCategorySelector
            category={getFlowCategory(activeFlow)}
            onChange={(cat) => handleFlowCategoryChange(activeFlow.id, cat)}
          />
        </div>

        {/* Side Tabs Header */}
        <div className="bg-stone-950 border-b border-stone-800 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('ai')}
              title="AI Copilot"
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              {activeTab === 'ai' && <span>AI Copilot</span>}
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              title="YAML Editor"
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
            >
              <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
              {activeTab === 'editor' && <span>YAML Editor</span>}
            </button>

            <button
              onClick={() => setActiveTab('steps')}
              title="Visual Blocks"
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'steps'
                  ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              {activeTab === 'steps' && <span>Visual Blocks</span>}
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              title="Runner Timeline"
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
            >
              <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
              {activeTab === 'timeline' && <span>Runner Timeline</span>}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              title="Test Reports"
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
              {activeTab === 'reports' && <span>Test Reports</span>}
            </button>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
            {!isExecuting ? (
              <button
                onClick={() => startExecution(activeFlow, activeProject?.targetUrl || '')}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] flex items-center space-x-1.5 shadow-md border border-amber-600 transition-all shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Flow</span>
              </button>
            ) : (
              <button
                onClick={pauseExecution}
                className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-amber-100 font-bold text-xs rounded-[6px] flex items-center space-x-1.5 shadow-md border border-stone-600 transition-all shrink-0 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleCopyYaml}
              title="Copy YAML Code"
              className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded-[6px] border border-stone-800 transition-all shrink-0 cursor-pointer"
            >
              {yamlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => resetExecution(activeFlow)}
              title="Reset steps"
              className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded-[6px] border border-stone-800 transition-all shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Tab Panel */}
        {activeTab === 'editor' && (
          <YamlEditor
            yamlContent={activeFlow.yamlContent}
            onChange={handleYamlChange}
            onRunFlow={() => startExecution(activeFlow, activeProject?.targetUrl || '')}
            isExecuting={isExecuting}
            flowCategory={getFlowCategory(activeFlow)}
            onCategoryChange={(cat) => handleFlowCategoryChange(activeFlow.id, cat)}
          />
        )}

        {activeTab === 'steps' && (
          <VisualStepEditor
            steps={activeFlow.steps}
            onStepsChange={handleStepsChange}
            onRunStep={() => {}}
            activeStepIndex={activeStepIndex}
          />
        )}

        {activeTab === 'timeline' && (
          <StepTimeline
            steps={activeFlow.steps}
            isExecuting={isExecuting}
            activeStepIndex={activeStepIndex}
            logs={executionLogs}
            onStartRun={() => startExecution(activeFlow, activeProject?.targetUrl || '')}
            onPauseRun={pauseExecution}
            onResetRun={() => resetExecution(activeFlow)}
            executionSpeed={executionSpeed}
            onSpeedChange={setExecutionSpeed}
            lastResult={lastResult}
            onExplainFailure={handleExplainFailureWithAi}
          />
        )}

        {activeTab === 'ai' && (
          <AiCopilot
            activeProject={activeProject}
            activeFlow={activeFlow}
            currentYaml={activeFlow.yamlContent}
            onApplyGeneratedYaml={(newYaml) => {
              handleYamlChange(newYaml);
              setActiveTab('editor');
            }}
            onBatchAddFlowsToProject={(flows) => batchAddFlows(flows)}
            targetUrl={activeProject?.targetUrl || ''}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            domContext={getMinedDomContext()}
          />
        )}

        {activeTab === 'reports' && (
          <TestReports lastResult={lastResult} />
        )}

        {activeTab === 'cli' && (
          <CliTerminal
            config={workspaceConfig}
            onConfigChange={updateWorkspaceConfig}
            activeFlowPath={activeFlow.path}
          />
        )}
      </div>
    </div>
  );
};
