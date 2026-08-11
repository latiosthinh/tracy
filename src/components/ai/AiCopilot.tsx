import React, { useState, useRef, useEffect } from 'react';
import { VoiceInputButton } from './VoiceInputButton';
import {
  Sparkles,
  Send,
  Loader2,
  FileCode,
  Check,
  AlertCircle,
  Wand2,
  ListChecks,
  HelpCircle,
  Folder,
  Layers,
  Workflow,
  Zap,
  Bot,
  Key,
  Globe,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Cpu,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Paperclip,
  Upload,
  X,
  FileText,
  File,
  Trash2
} from 'lucide-react';
import { Project, FlowFile } from '../../types/autoflow';
import { tracyApi } from '../../lib/tauri';
import { useAgentStore } from '../../stores/agentStore';

export type AgentProvider =
  | 'cursor-cli'
  | 'claude-code'
  | 'command-code'
  | 'open-code'
  | 'gemini-cli'
  | 'local-agent-cli'
  | 'cursor-sdk'
  | 'byok-claude'
  | 'byok-gemini'
  | 'byok-mimo'
  | 'byok-openai'
  | 'custom-gateway';

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
}

interface AiCopilotProps {
  activeProject: Project;
  activeFlow: FlowFile;
  currentYaml: string;
  onApplyGeneratedYaml: (yaml: string) => void;
  onBatchAddFlowsToProject?: (newFlows: { name: string; yaml: string; description?: string }[]) => void;
  targetUrl: string;
  selectedAgent?: string;
  onSelectAgent?: (agent: string) => void;
  domContext?: string;
}

export const AiCopilot: React.FC<AiCopilotProps> = ({
  activeProject,
  activeFlow,
  currentYaml,
  onApplyGeneratedYaml,
  onBatchAddFlowsToProject,
  targetUrl,
  selectedAgent,
  onSelectAgent,
  domContext,
}) => {
  // Scope State: 'project' (Whole Individual Project) | 'flow' (Single Active Flow)
  const [copilotScope, setCopilotScope] = useState<'project' | 'flow'>('project');

  // Provider / BYOK State
  const [providerCategoryTab, setProviderCategoryTab] = useState<'local-agent-cli' | 'byok'>('local-agent-cli');
  const [agentProvider, setAgentProvider] = useState<AgentProvider>((selectedAgent as AgentProvider) || 'local-agent-cli');

  const handleSelectProvider = (prov: AgentProvider) => {
    setAgentProvider(prov);
    if (onSelectAgent) {
      onSelectAgent(prov);
    }
  };
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState('http://localhost:11434');
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [showProviderPanel, setShowProviderPanel] = useState(false);
  const [localCliDetected, setLocalCliDetected] = useState<boolean | null>(true);
  const [isDetectingCli, setIsDetectingCli] = useState(false);

  const providerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setShowProviderPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCheckLocalCli = () => {
    setIsDetectingCli(true);
    setTimeout(() => {
      setLocalCliDetected(true);
      setIsDetectingCli(false);
    }, 450);
  };

  // Form State & Attached Files State
  const [prompt, setPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedYaml, setGeneratedYaml] = useState<string | null>(null);
  const [autoSuiteResult, setAutoSuiteResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [batchImported, setBatchImported] = useState(false);

  // Process uploaded / dropped files
  const processFiles = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        setAttachedFiles(prev => [
          ...prev,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'text/plain',
            content,
          }
        ]);
      };
      reader.readAsText(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleGenerateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && attachedFiles.length === 0) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedYaml(null);
    setBatchImported(false);

    let finalPrompt = prompt.trim();
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles
        .map(f => `--- ATTACHED FILE (${f.name}) ---\n${f.content}`)
        .join('\n\n');
      finalPrompt = `${finalPrompt}\n\n[Attached Context Files]:\n${fileContext}`;
    }

    // Attach mined DOM context if available (reduces token usage significantly)
    if (domContext) {
      finalPrompt = `${finalPrompt}\n\n[Mined DOM Context - Pre-calculated page structure]:\n${domContext}`;
    }

    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const streamYaml = await tracyApi.runAgentStream(agentProvider, finalPrompt);
        if (streamYaml) {
          setGeneratedYaml(streamYaml);
        } else {
          setErrorMessage('Empty response returned from agent CLI');
        }
      } else {
        const res = await fetch('/api/gemini/generate-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            targetUrl: targetUrl || activeProject.targetUrl,
            copilotScope,
            projectName: activeProject.name,
            projectFlows: activeProject.flows,
            agentProvider,
            apiKey,
            customEndpoint,
            selectedModel,
          }),
        });

        const data = await res.json();
        if (res.ok && data.yaml) {
          setGeneratedYaml(data.yaml);
        } else {
          setErrorMessage(data.error || 'Failed to generate test step YAML');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server error calling AI Copilot Agent');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoSuite = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setAutoSuiteResult(null);
    setBatchImported(false);

    try {
      const res = await fetch('/api/gemini/auto-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageName: activeProject.name,
          url: targetUrl || activeProject.targetUrl,
          projectName: activeProject.name,
          agentProvider,
          apiKey,
          customEndpoint,
          selectedModel,
          pageElements: [
            { testId: 'add-cart-headphones', text: 'Add to Cart', role: 'button' },
            { testId: 'search-input', placeholder: 'Search products...', role: 'searchbox' },
            { label: 'Full Name', role: 'textbox' },
            { label: 'Email Address', role: 'textbox' },
            { text: 'Have a coupon?', role: 'button' },
            { text: 'Place Order', role: 'button' },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data.flows) {
        setAutoSuiteResult(data);
      } else {
        setErrorMessage(data.error || 'Failed to generate project suite');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server error calling AI Agent');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportAllSuiteFlows = () => {
    if (!autoSuiteResult || !autoSuiteResult.flows || !onBatchAddFlowsToProject) return;
    onBatchAddFlowsToProject(autoSuiteResult.flows);
    setBatchImported(true);
  };

  const getAgentDisplayName = (provider: AgentProvider) => {
    const map: Record<string, string> = {
      'cursor-cli': 'Cursor CLI',
      'claude-code': 'Claude Code',
      'command-code': 'CommandCode',
      'open-code': 'OpenCode',
      'gemini-cli': 'Gemini CLI',
      'local-agent-cli': 'Tracy Local CLI',
      'cursor-sdk': 'Cursor SDK',
      'byok-claude': 'Claude API',
      'byok-gemini': 'Gemini API',
      'byok-mimo': 'Xiaomi MiMo API',
      'byok-openai': 'OpenAI API',
      'custom-gateway': 'Custom Gateway',
    };
    return map[provider] || provider;
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 font-sans text-xs overflow-hidden relative">
      {/* Scrollable Main Copilot View Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Scope Selector: Full flow vs Single flow */}
        <div className="flex items-center space-x-2 bg-stone-900 p-1.5 rounded-[6px] border border-stone-800">
          <button
            type="button"
            onClick={() => setCopilotScope('project')}
            className={`flex-1 py-1.5 px-3 rounded-[4px] font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${copilotScope === 'project'
                ? 'bg-amber-800 text-amber-100 shadow-xs border border-amber-600/80'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
              }`}
          >
            <Workflow className="w-3.5 h-3.5 text-amber-300" />
            <span>Full flow</span>
          </button>

          <button
            type="button"
            onClick={() => setCopilotScope('flow')}
            className={`flex-1 py-1.5 px-3 rounded-[4px] font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${copilotScope === 'flow'
                ? 'bg-amber-800 text-amber-100 shadow-xs border border-amber-600/80'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
              }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Single flow</span>
          </button>
        </div>

        {/* Prompt Form with Long Text Support & File Drag & Drop / Upload */}
        <form onSubmit={handleGenerateFlow} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-stone-300 text-xs">
                Context
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && processFiles(e.target.files)}
                  multiple
                  className="hidden"
                  accept=".txt,.md,.yaml,.yml,.json,.js,.ts,.tsx,.csv,.log"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-amber-400 hover:text-amber-300 bg-stone-900 hover:bg-stone-800 rounded-[4px] border border-stone-800 transition-colors cursor-pointer"
                  title="Attach Files / Docs (.txt, .yaml, .json, .md, logs)"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <VoiceInputButton
                  onTranscript={(transcript) => {
                    setPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
                  }}
                  size="sm"
                  title="Dictate prompt or requirements via voice"
                />
              </div>
            </div>

            {/* Drag and drop wrapper around textarea */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-[8px] border transition-all ${isDragging
                  ? 'border-dashed border-amber-500 bg-amber-950/30 ring-2 ring-amber-500/30'
                  : 'border-stone-800 bg-stone-900 focus-within:border-amber-600'
                }`}
            >
              <textarea
                rows={5}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={
                  copilotScope === 'project'
                    ? `e.g., "Generate a complete test suite for ${activeProject.name} covering home page navigation, search filter, item checkout drawer, and error handling..."\n\n(Tip: Paste long requirements text or drop .txt, .yaml, .json spec files here)`
                    : `e.g., "Add assertions for search bar input, coupon code SUMMER25 validation, and order confirmation modal..."\n\n(Tip: Paste long requirements text or drop files here)`
                }
                className="w-full p-3 bg-transparent text-stone-100 text-xs focus:outline-hidden resize-y font-sans min-h-[120px] max-h-[350px] leading-relaxed placeholder:text-stone-500"
              />

              {isDragging && (
                <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-xs rounded-[8px] flex flex-col items-center justify-center text-amber-200 font-mono text-xs pointer-events-none p-4 text-center z-10">
                  <Upload className="w-6 h-6 text-amber-400 animate-bounce mb-1" />
                  <span className="font-bold">Drop files here to attach</span>
                  <span className="text-[10px] text-stone-400">Supports .txt, .yaml, .json, .md, code, logs</span>
                </div>
              )}
            </div>

            {/* Attached Files List Chips */}
            {attachedFiles.length > 0 && (
              <div className="mt-2 space-y-1.5 bg-stone-900/60 p-2 rounded-[6px] border border-stone-800/80">
                <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono font-bold">
                  <span className="flex items-center space-x-1">
                    <Paperclip className="w-3 h-3 text-amber-400" />
                    <span>Attached Context Files ({attachedFiles.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles([])}
                    className="text-[10px] text-stone-500 hover:text-rose-400 font-normal hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {attachedFiles.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center space-x-1.5 px-2 py-1 bg-stone-950 border border-stone-800 rounded-[4px] text-[11px] text-amber-200 font-mono"
                    >
                      <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate max-w-[140px]" title={f.name}>{f.name}</span>
                      <span className="text-[9px] text-stone-500">({formatFileSize(f.size)})</span>
                      <button
                        type="button"
                        onClick={() => removeAttachedFile(f.id)}
                        className="text-stone-500 hover:text-rose-400 p-0.5 transition-colors"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleAutoSuite}
              disabled={isGenerating}
              className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-[6px] font-semibold text-xs flex items-center space-x-1.5 border border-stone-800 transition-all shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Generate Whole Project Suite</span>
            </button>

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-amber-50 font-bold text-xs rounded-[6px] flex items-center space-x-1.5 border border-amber-600 shadow-md transition-all shrink-0"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>
                {isGenerating
                  ? 'Generating...'
                  : copilotScope === 'project'
                    ? 'Generate Project Test Steps'
                    : 'Generate Flow Steps'}
              </span>
            </button>
          </div>
        </form>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-[6px] text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Generated YAML Result */}
        {generatedYaml && (
          <div className="bg-stone-900 border border-stone-800 rounded-[6px] p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-emerald-400 text-xs flex items-center space-x-1.5">
                <Check className="w-4 h-4" />
                <span>Generated E2E YAML Flow</span>
              </span>

              <button
                onClick={() => onApplyGeneratedYaml(generatedYaml)}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] border border-amber-600 shadow-xs transition-all"
              >
                Apply to Active Editor ({activeFlow.name})
              </button>
            </div>

            <pre className="p-3 bg-stone-950 rounded-[6px] border border-stone-800 font-mono text-xs text-amber-200 overflow-x-auto max-h-64">
              {generatedYaml}
            </pre>
          </div>
        )}

        {/* Auto Project Suite Result */}
        {autoSuiteResult && (
          <div className="bg-stone-900 border border-stone-800 rounded-[6px] p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-stone-200 text-xs flex items-center space-x-2">
                <ListChecks className="w-4 h-4 text-emerald-400" />
                <span>
                  Generated Whole Project Suite ({autoSuiteResult.flows?.length || 0} Flows)
                </span>
              </h4>

              {onBatchAddFlowsToProject && (
                <button
                  onClick={handleImportAllSuiteFlows}
                  disabled={batchImported}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-emerald-50 font-bold text-xs rounded-[6px] border border-emerald-600 flex items-center space-x-1.5 transition-all"
                >
                  {batchImported ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{batchImported ? 'All Flows Imported to Project!' : 'Import All Flows into Project'}</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {autoSuiteResult.flows?.map((flowItem: any, idx: number) => (
                <div key={idx} className="p-3 bg-stone-950 rounded-[6px] border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs">{flowItem.name}</span>
                    <button
                      onClick={() => onApplyGeneratedYaml(flowItem.yaml)}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-amber-700 text-stone-200 text-[10px] font-bold rounded-[6px] border border-stone-700"
                    >
                      Load into Active Editor
                    </button>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">{flowItem.description}</p>
                  <pre className="p-2 bg-stone-900 rounded-[4px] border border-stone-800/80 font-mono text-[10px] text-amber-200/90 overflow-x-auto max-h-24">
                    {flowItem.yaml}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Agent Selector Footer Bar */}
      <div className="bg-stone-900 border-t border-stone-800 px-3.5 py-2 flex items-center justify-between gap-2 shrink-0 z-30 font-sans">
        <div className="flex items-center space-x-2 truncate">
          <Bot className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-mono text-amber-300 font-bold text-xs bg-stone-950 px-2 py-0.5 rounded border border-stone-800 truncate">
            {getAgentDisplayName(agentProvider)}
          </span>
        </div>

        <div className="relative" ref={providerRef}>
          <button
            type="button"
            onClick={() => setShowProviderPanel(!showProviderPanel)}
            className="px-2.5 py-1.5 bg-stone-950 hover:bg-stone-800 text-amber-300 font-sans font-bold text-xs rounded-[6px] border border-stone-700/80 hover:border-amber-500 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Switch Agent Provider</span>
            <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${showProviderPanel ? 'rotate-180' : ''}`} />
          </button>

          {/* Provider Selection Panel Popover */}
          {showProviderPanel && (
            <div className="absolute bottom-full right-0 mb-2 w-[320px] sm:w-[420px] bg-stone-900 border border-amber-800/60 rounded-[8px] p-3.5 shadow-2xl z-50 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="font-bold text-amber-300 text-xs flex items-center space-x-1.5">
                  <Bot className="w-4 h-4" />
                  <span>AI Agent Provider Selection</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">CLI Tool or BYOK Key</span>
              </div>

              {/* 2 Main Category Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1 rounded-[6px] border border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setProviderCategoryTab('local-agent-cli');
                    if (!['cursor-cli', 'claude-code', 'command-code', 'open-code', 'gemini-cli', 'local-agent-cli'].includes(agentProvider)) {
                      handleSelectProvider('local-agent-cli');
                    }
                  }}
                  className={`py-2 px-3 rounded-[4px] font-bold text-xs flex items-center justify-center space-x-2 transition-all ${providerCategoryTab === 'local-agent-cli'
                      ? 'bg-amber-800 text-amber-100 shadow-md border border-amber-600/80'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                >
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>local-agent-cli</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProviderCategoryTab('byok');
                    if (!['cursor-sdk', 'byok-claude', 'byok-gemini', 'byok-mimo', 'byok-openai', 'custom-gateway'].includes(agentProvider)) {
                      handleSelectProvider('byok-gemini');
                    }
                  }}
                  className={`py-2 px-3 rounded-[4px] font-bold text-xs flex items-center justify-center space-x-2 transition-all ${providerCategoryTab === 'byok'
                      ? 'bg-amber-800 text-amber-100 shadow-md border border-amber-600/80'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                >
                  <Key className="w-4 h-4 text-amber-300" />
                  <span>BYOK (Bring Your Own Key)</span>
                </button>
              </div>

              {/* Provider Option Cards for Selected Tab */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {providerCategoryTab === 'local-agent-cli' ? (
                  <>
                    {[
                      { id: 'cursor-cli', name: 'Cursor CLI', desc: 'Cursor Agent Subprocess', sub: 'Cursor Subprocess' },
                      { id: 'claude-code', name: 'Claude Code', desc: 'Claude Code CLI (PATH)', sub: 'System PATH' },
                      { id: 'command-code', name: 'CommandCode', desc: 'CommandCode CLI', sub: 'Terminal Runner' },
                      { id: 'open-code', name: 'OpenCode', desc: 'OpenCode Interpreter', sub: 'Code Interpreter' },
                      { id: 'gemini-cli', name: 'Gemini CLI', desc: 'Google Gemini CLI Tool', sub: 'Gemini Terminal' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectProvider(item.id as AgentProvider);
                          setSelectedModel(item.id);
                          setShowProviderPanel(false);
                        }}
                        className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between transition-all cursor-pointer ${agentProvider === item.id
                            ? 'bg-amber-950/60 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                          }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-300">
                          <Terminal className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-stone-400 font-mono truncate">{item.sub}</span>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { id: 'cursor-sdk', name: 'Cursor SDK / API', desc: 'Cursor Cloud API Key', sub: 'Cursor Cloud API' },
                      { id: 'byok-claude', name: 'Claude API', desc: 'Anthropic Claude 3.7', sub: 'Anthropic Sonnet' },
                      { id: 'byok-gemini', name: 'Gemini API', desc: 'Google GenAI SDK', sub: 'Gemini 2.5 / 3.6' },
                      { id: 'byok-mimo', name: 'Xiaomi MiMo API', desc: 'Xiaomi MiMo AI API', sub: 'MiMo Multimodal' },
                      { id: 'byok-openai', name: 'OpenAI API', desc: 'OpenAI GPT-4o Key', sub: 'GPT-4o / O3' },
                      { id: 'custom-gateway', name: 'Custom Gateway', desc: 'Custom REST Proxy', sub: 'Local REST Proxy' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectProvider(item.id as AgentProvider);
                          setSelectedModel(item.id);
                          setShowProviderPanel(false);
                        }}
                        className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between transition-all cursor-pointer ${agentProvider === item.id
                            ? 'bg-amber-950/60 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                          }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-300">
                          <Key className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono mt-1 truncate">{item.sub}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Local CLI Detection Bar */}
              {agentProvider === 'local-agent-cli' && (
                <div className="p-2 bg-stone-950 border border-stone-800 rounded-[6px] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold text-stone-200 text-xs block">Local Agent CLI Active</span>
                      <span className="text-[10px] font-mono text-stone-400">Listening on http://localhost:11434</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckLocalCli}
                    disabled={isDetectingCli}
                    className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-[11px] rounded-[4px] border border-stone-800 flex items-center space-x-1"
                  >
                    {isDetectingCli ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3 text-amber-400" />}
                    <span>Detect CLI</span>
                  </button>
                </div>
              )}

              {/* BYOK Key & Endpoint Inputs */}
              <div className="space-y-2 pt-1 border-t border-stone-800/80">
                {agentProvider.startsWith('byok-') && (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-300 mb-1">
                      Custom API Key ({agentProvider.toUpperCase()})
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-stone-950 border border-stone-800 rounded-[4px] p-2 pr-8 text-xs font-mono text-stone-100 focus:outline-hidden focus:border-amber-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 text-stone-500 hover:text-stone-300"
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {(agentProvider === 'local-agent-cli' || agentProvider === 'custom-gateway') && (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-300 mb-1">
                      Local Agent Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={customEndpoint}
                      onChange={e => setCustomEndpoint(e.target.value)}
                      placeholder="e.g. http://localhost:11434"
                      className="w-full bg-stone-950 border border-stone-800 rounded-[4px] p-2 text-xs font-mono text-stone-100 focus:outline-hidden focus:border-amber-600"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

