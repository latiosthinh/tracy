import React from 'react';
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
  Pencil
} from 'lucide-react';

import { YamlEditor } from '@/src/components/editor/YamlEditor';
import { VisualStepEditor } from '@/src/components/editor/VisualStepEditor';
import { AiCopilot } from '@/src/components/ai/AiCopilot';
import { TestReports } from '@/src/components/reports/TestReports';
import { CliTerminal } from '@/src/components/reports/CliTerminal';
import { FlowCategorySelector } from '@/src/components/editor/FlowCategorySelector';
import { StepTimeline } from '@/src/components/studio/StepTimeline';
import { getFlowCategory } from '@/src/utils/flowUtils';

import type { FlowFile, Project, ActiveTab } from '@/src/types/index';

interface StudioRightSidebarProps {
  sidePanelWidth: number;
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
  selectedAgent: string;
  setSelectedAgent: (agent: string) => void;
  getMinedDomContext: () => string;
  workspaceConfig: any;
  updateWorkspaceConfig: (config: any) => void;
}

export const StudioRightSidebar: React.FC<StudioRightSidebarProps> = ({
  sidePanelWidth,
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
  selectedAgent,
  setSelectedAgent,
  getMinedDomContext,
  workspaceConfig,
  updateWorkspaceConfig
}) => {
  return (
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
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'ai'
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
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'editor'
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
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'steps'
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
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'timeline'
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
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-[6px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${activeTab === 'reports'
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
  );
};
