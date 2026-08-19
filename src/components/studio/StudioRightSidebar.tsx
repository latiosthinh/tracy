import React, { useRef, useEffect } from 'react';
import {
  RotateCcw,
  FileCode,
  Layers,
  Terminal,
  Sparkles,
  BarChart3,
  Play,
  Pause,
  Copy,
  Check,
  Pencil,
  Network,
  Globe,
  Gauge,
} from 'lucide-react';

import { YamlEditor } from '@/src/components/editor/YamlEditor';
import { VisualStepEditor } from '@/src/components/editor/VisualStepEditor';
import { AiCopilot } from '@/src/components/ai/AiCopilot';
import { TestReports } from '@/src/components/reports/TestReports';
import { CliTerminal } from '@/src/components/reports/CliTerminal';
import { FlowCategorySelector } from '@/src/components/editor/FlowCategorySelector';
import { StepTimeline } from '@/src/components/studio/StepTimeline';
import { RouteVisualizerView } from '@/src/components/visualizer/RouteVisualizerView';
import { NetworkMockInspector } from '@/src/components/network/NetworkMockInspector';
import { MatrixRunnerPanel } from '@/src/components/matrix/MatrixRunnerPanel';
import { PerfProfilerPanel } from '@/src/components/perf/PerfProfilerPanel';
import { getFlowCategory } from '@/src/utils/flowUtils';
import { useTranslation } from '@/src/hooks/useTranslation';

import type { FlowFile, Project, ActiveTab } from '@/src/types/index';

interface StudioRightSidebarProps {
  sidePanelWidth: number;
  sidePanelHeight?: number;
  splitOrientation?: 'vertical' | 'horizontal';
  activeFlow: FlowFile;
  activeProject: Project | undefined;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isExecuting: boolean;
  startExecution: (flow: FlowFile, url: string) => void;
  pauseExecution: () => void;
  resetExecution: (flow: FlowFile) => void;
  handleCopyYaml: () => void;
  yamlCopied: boolean;
  activeFlowNameInput: string;
  setActiveFlowNameInput: (name: string) => void;
  isEditingActiveFlowName: boolean;
  setIsEditingActiveFlowName: (editing: boolean) => void;
  handleRenameFlow: (id: string, name: string) => void;
  handleFlowCategoryChange: (id: string, cat: string) => void;
  handleYamlChange: (yaml: string) => void;
  handleStepsChange: (steps: any[]) => void;
  activeStepIndex: number;
  executionLogs: any[];
  executionSpeed: number;
  setExecutionSpeed: (speed: number) => void;
  lastResult: any;
  handleExplainFailureWithAi: () => void;
  batchAddFlows: (flows: any[]) => void;
  getMinedDomContext: () => string;
  workspaceConfig: any;
  updateWorkspaceConfig: (config: any) => void;
}

export const StudioRightSidebar: React.FC<StudioRightSidebarProps> = ({
  sidePanelWidth,
  sidePanelHeight = 360,
  splitOrientation = 'vertical',
  activeFlow,
  activeProject,
  activeTab,
  setActiveTab,
  isExecuting,
  startExecution,
  pauseExecution,
  resetExecution,
  handleCopyYaml,
  yamlCopied,
  activeFlowNameInput,
  setActiveFlowNameInput,
  isEditingActiveFlowName,
  setIsEditingActiveFlowName,
  handleRenameFlow,
  handleFlowCategoryChange,
  handleYamlChange,
  handleStepsChange,
  activeStepIndex,
  executionLogs,
  executionSpeed,
  setExecutionSpeed,
  lastResult,
  handleExplainFailureWithAi,
  batchAddFlows,
  getMinedDomContext,
  workspaceConfig,
  updateWorkspaceConfig
}) => {
  const { t } = useTranslation();
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingActiveFlowName && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [isEditingActiveFlowName]);

  return (
    <div
      className={`bg-stone-950 flex flex-col overflow-hidden shrink-0 ${
        splitOrientation === 'horizontal' ? 'w-full border-t border-stone-800' : 'h-full border-l border-stone-800'
      }`}
      style={
        splitOrientation === 'horizontal'
          ? { height: `${sidePanelHeight}px` }
          : { width: `${sidePanelWidth}px` }
      }
    >
      {/* Flow Header */}
      <div className="bg-stone-950 px-3.5 py-2 border-b border-stone-800 flex items-center justify-between gap-2 shrink-0 font-sans">
        <div className="flex items-center space-x-2 truncate min-w-0">
          <FileCode className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
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
                ref={renameInputRef}
                type="text"
                aria-label={t('studio.renameFlow')}
                value={activeFlowNameInput}
                onChange={(e) => setActiveFlowNameInput(e.target.value)}
                onBlur={() => {
                  if (activeFlowNameInput.trim()) {
                    handleRenameFlow(activeFlow.id, activeFlowNameInput.trim());
                  }
                  setIsEditingActiveFlowName(false);
                }}
                className="bg-stone-900 border border-amber-500 rounded px-2 py-0.5 text-xs font-mono text-stone-100 focus:outline-none"
              />
            </form>
          ) : (
            <div className="flex items-center space-x-1.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveFlowNameInput(activeFlow.name);
                  setIsEditingActiveFlowName(true);
                }}
                className="font-mono font-bold text-stone-100 text-xs truncate cursor-pointer hover:text-amber-300 transition-colors bg-transparent border-none p-0 text-left"
                title={t('studio.clickToRename')}
              >
                {activeFlow.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFlowNameInput(activeFlow.name);
                  setIsEditingActiveFlowName(true);
                }}
                className="p-1 text-stone-500 hover:text-amber-400 rounded transition-colors cursor-pointer"
                title={t('studio.renameFlow')}
                aria-label={t('studio.renameFlow')}
              >
                <Pencil className="w-3 h-3" aria-hidden="true" />
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
      <div className="bg-stone-950 border-b border-stone-800 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0" role="tablist">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'visualizer'}
            onClick={() => setActiveTab('visualizer')}
            title={t('studio.tabVisualizer') || 'Visualizer'}
            aria-label={t('studio.tabVisualizer') || 'Visualizer'}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'visualizer'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <Network className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'visualizer' && <span>{t('studio.tabVisualizer') || 'Visualizer'}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'network'}
            onClick={() => setActiveTab('network')}
            title={t('studio.tabNetwork') || 'Network'}
            aria-label={t('studio.tabNetwork') || 'Network'}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'network'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <Globe className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'network' && <span>{t('studio.tabNetwork') || 'Network'}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'matrix'}
            onClick={() => setActiveTab('matrix')}
            title={t('studio.tabMatrix') || 'Matrix'}
            aria-label={t('studio.tabMatrix') || 'Matrix'}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'matrix'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <Layers className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'matrix' && <span>{t('studio.tabMatrix') || 'Matrix'}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'perf'}
            onClick={() => setActiveTab('perf')}
            title={t('studio.tabPerf') || 'Profiler'}
            aria-label={t('studio.tabPerf') || 'Profiler'}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'perf'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <Gauge className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'perf' && <span>{t('studio.tabPerf') || 'Profiler'}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ai'}
            onClick={() => setActiveTab('ai')}
            title={t('studio.aiCopilot')}
            aria-label={t('studio.aiCopilot')}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'ai'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'ai' && <span>{t('studio.aiCopilot')}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'editor'}
            onClick={() => setActiveTab('editor')}
            title={t('studio.yamlEditor')}
            aria-label={t('studio.yamlEditor')}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'editor'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <FileCode className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'editor' && <span>{t('studio.yamlEditor')}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'steps'}
            onClick={() => setActiveTab('steps')}
            title={t('studio.visualBlocks')}
            aria-label={t('studio.visualBlocks')}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'steps'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <Layers className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'steps' && <span>{t('studio.visualBlocks')}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
            title={t('studio.runnerTimeline')}
            aria-label={t('studio.runnerTimeline')}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'timeline'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <Terminal className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'timeline' && <span>{t('studio.runnerTimeline')}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            title={t('studio.testReports')}
            aria-label={t('studio.testReports')}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'reports'
              ? 'bg-amber-800 text-amber-100 border border-amber-600/80 shadow-xs'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
              }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTab === 'reports' && <span>{t('studio.testReports')}</span>}
          </button>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
          {!isExecuting ? (
            <button
              type="button"
              onClick={() => startExecution(activeFlow, activeProject?.targetUrl || '')}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] flex items-center space-x-1.5 shadow-md border border-amber-600 transition-all shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>{t('studio.run')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={pauseExecution}
              className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-amber-100 font-bold text-xs rounded-[6px] flex items-center space-x-1.5 shadow-md border border-stone-600 transition-all shrink-0 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>{t('studio.pause')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyYaml}
            title={t('studio.copyYaml')}
            aria-label={t('studio.copyYaml')}
            className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded-[6px] border border-stone-800 transition-all shrink-0 cursor-pointer"
          >
            {yamlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={() => resetExecution(activeFlow)}
            title={t('studio.resetSteps')}
            aria-label={t('studio.resetSteps')}
            className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded-[6px] border border-stone-800 transition-all shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
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
          savedBaselineYaml={activeProject?.flows?.find((f) => f.id === activeFlow.id)?.yamlContent}
          flow={activeFlow}
          targetUrl={activeProject?.targetUrl}
        />
      )}

      {activeTab === 'steps' && (
        <VisualStepEditor
          steps={activeFlow.steps}
          onStepsChange={handleStepsChange}
          onRunStep={() => { }}
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
          activeProject={activeProject as Project}
          activeFlow={activeFlow}
          currentYaml={activeFlow.yamlContent}
          onApplyGeneratedYaml={(newYaml) => {
            handleYamlChange(newYaml);
            setActiveTab('editor');
          }}
          onBatchAddFlowsToProject={(flows) => batchAddFlows(flows)}
          targetUrl={activeProject?.targetUrl || ''}
          domContext={getMinedDomContext()}
        />
      )}

      {activeTab === 'reports' && (
        <TestReports lastResult={lastResult} />
      )}

      {activeTab === 'visualizer' && (
        <RouteVisualizerView />
      )}

      {activeTab === 'network' && (
        <NetworkMockInspector />
      )}

      {activeTab === 'matrix' && (
        <MatrixRunnerPanel />
      )}

      {activeTab === 'perf' && (
        <PerfProfilerPanel />
      )}

      {activeTab === 'cli' && (
        <CliTerminal
          config={workspaceConfig}
          onConfigChange={updateWorkspaceConfig}
          activeFlowPath={activeFlow.path}
        />
      )}
    </div>
  );
};
