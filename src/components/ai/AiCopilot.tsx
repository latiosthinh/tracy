import React, { useState, useRef, useEffect } from 'react';
import { AiPromptInput, AttachedFile } from '@/src/components/ai/AiPromptInput';
import { QaRecipeSelector } from '@/src/components/ai/QaRecipeSelector';
import { AgentSelector } from '@/src/components/shared/AgentSelector';
import { AiDiffPreviewModal } from '@/src/components/ai/AiDiffPreviewModal';
import { appendStepsToYaml } from '@/src/utils/diffUtils';
import { QaRecipe } from '@/src/data/qaRecipes';
import {
  Send,
  Loader2,
  Check,
  AlertCircle,
  Wand2,
  ListChecks,
  Workflow,
  Zap,
  Bot,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  GitCompare,
  Gauge,
} from 'lucide-react';
import { Project, FlowFile } from '@/src/types/autoflow';
import { tracyApi, isElectronEnv } from '@/src/lib/ipc';
import { useAgentStore } from '@/src/stores/agentStore';
import { useAiConfigStore } from '@/src/stores/aiConfigStore';
import { getAgentDef, resolveAgentId } from '@/src/lib/aiRegistry';
import { useTranslation } from '@/src/hooks/useTranslation';

interface AiCopilotProps {
  activeProject: Project;
  activeFlow: FlowFile;
  currentYaml: string;
  onApplyGeneratedYaml: (yaml: string) => void;
  onBatchAddFlowsToProject?: (newFlows: { name: string; yaml: string; description?: string }[]) => void;
  targetUrl: string;
  domContext?: string;
}

export const AiCopilot: React.FC<AiCopilotProps> = ({
  activeProject,
  activeFlow,
  currentYaml,
  onApplyGeneratedYaml,
  onBatchAddFlowsToProject,
  targetUrl,
  domContext,
}) => {
  const { t } = useTranslation();
  // Scope State: 'project' | 'flow'
  const [copilotScope, setCopilotScope] = useState<'project' | 'flow'>('project');
  const detectedAgents = useAgentStore((s) => s.detectedAgents);

  // Provider panel visibility (local UI state)
  const [showProviderPanel, setShowProviderPanel] = useState(false);

  // Read from aiConfigStore — all writes handled by AgentSelector component
  const selectedAgentId = useAiConfigStore((s) => s.selectedAgentId);
  const agentCredentials = useAiConfigStore((s) => s.agentCredentials);
  const agentModels = useAiConfigStore((s) => s.agentModels);
  const loadFromDisk = useAiConfigStore((s) => s.loadFromDisk);

  const displayName = getAgentDef(resolveAgentId(selectedAgentId))?.displayName ?? selectedAgentId;

  const providerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setShowProviderPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stream accumulation for incremental display
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedYaml, setGeneratedYaml] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [autoSuiteResult, setAutoSuiteResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [batchImported, setBatchImported] = useState(false);
  const generatingFlag = useRef(false);

  // Telemetry metrics state
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationDuration, setGenerationDuration] = useState<number>(0);
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [tokenSpeed, setTokenSpeed] = useState<number>(0);

  // Subscribe to stream chunks during generation
  useEffect(() => {
    if (!isGenerating || !generatingFlag.current) return;
    const unlisten = tracyApi.onAgentStreamChunk((payload) => {
      setStreamingText((prev) => {
        const next = prev + payload.delta;
        const tokens = Math.max(1, Math.round(next.length / 4));
        setTokenCount(tokens);
        if (generationStartTime) {
          const elapsedSec = Math.max(0.1, (Date.now() - generationStartTime) / 1000);
          setGenerationDuration(Number(elapsedSec.toFixed(1)));
          setTokenSpeed(Number((tokens / elapsedSec).toFixed(1)));
        }
        return next;
      });
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [isGenerating, generationStartTime]);

  // Form State & Attached Files State
  const [prompt, setPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [diffPreviewYaml, setDiffPreviewYaml] = useState<string | null>(null);

  // File processing logic moved to AiPromptInput

  const handleGenerateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && attachedFiles.length === 0) return;

    const startTime = Date.now();
    setGenerationStartTime(startTime);
    setGenerationDuration(0);
    setTokenCount(0);
    setTokenSpeed(0);

    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedYaml(null);
    setStreamingText('');
    setBatchImported(false);
    generatingFlag.current = true;

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

    const model = agentModels[selectedAgentId];

    try {
      if (isElectronEnv()) {
        const streamYaml = await tracyApi.runAgentStream(
          selectedAgentId,
          finalPrompt,
          undefined,
          model,
        );
        generatingFlag.current = false;
        if (streamYaml) {
          setGeneratedYaml(streamYaml);
          const totalTokens = Math.max(1, Math.round(streamYaml.length / 4));
          const totalSec = Math.max(0.1, (Date.now() - startTime) / 1000);
          setTokenCount(totalTokens);
          setGenerationDuration(Number(totalSec.toFixed(1)));
          setTokenSpeed(Number((totalTokens / totalSec).toFixed(1)));
        } else {
          setErrorMessage(t('copilot.emptyAgentResponse'));
        }
      } else {
        // Browser fallback
        const cred = agentCredentials[selectedAgentId] || {};
        const res = await fetch('/api/gemini/generate-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            targetUrl: targetUrl || activeProject.targetUrl,
            copilotScope,
            projectName: activeProject.name,
            projectFlows: activeProject.flows,
            agentProvider: selectedAgentId,
            apiKey: cred.apiKey,
            customEndpoint: cred.customEndpoint,
            selectedModel: model,
          }),
        });

        const data = await res.json();
        generatingFlag.current = false;
        if (res.ok && data.yaml) {
          setGeneratedYaml(data.yaml);
          const totalTokens = Math.max(1, Math.round(data.yaml.length / 4));
          const totalSec = Math.max(0.1, (Date.now() - startTime) / 1000);
          setTokenCount(totalTokens);
          setGenerationDuration(Number(totalSec.toFixed(1)));
          setTokenSpeed(Number((totalTokens / totalSec).toFixed(1)));
        } else {
          setErrorMessage(data.error || t('copilot.failedGenerateYaml'));
        }
      }
    } catch (err: any) {
      generatingFlag.current = false;
      setErrorMessage(err.message || t('copilot.serverErrorCopilot'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoSuite = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setAutoSuiteResult(null);
    setBatchImported(false);
    generatingFlag.current = true;

    try {
      const model = agentModels[selectedAgentId];
      const cred = agentCredentials[selectedAgentId] || {};
      const res = await fetch('/api/gemini/auto-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageName: activeProject.name,
          url: targetUrl || activeProject.targetUrl,
          projectName: activeProject.name,
          agentProvider: selectedAgentId,
          apiKey: cred.apiKey,
          customEndpoint: cred.customEndpoint,
          selectedModel: model,
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
      generatingFlag.current = false;
      if (res.ok && data.flows) {
        setAutoSuiteResult(data);
      } else {
        setErrorMessage(data.error || t('copilot.failedGenerateSuite'));
      }
    } catch (err: any) {
      generatingFlag.current = false;
      setErrorMessage(err.message || t('copilot.serverErrorAgent'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportAllSuiteFlows = () => {
    if (!autoSuiteResult || !autoSuiteResult.flows || !onBatchAddFlowsToProject) return;
    onBatchAddFlowsToProject(autoSuiteResult.flows);
    setBatchImported(true);
  };

  // Ensure store is loaded before first render
  useEffect(() => {
    loadFromDisk();
  }, [loadFromDisk]);

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
            <span>{t('copilot.fullFlow')}</span>
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
            <span>{t('copilot.singleFlow')}</span>
          </button>
        </div>

        {/* QA Recipe Presets Selector */}
        <QaRecipeSelector
          disabled={isGenerating}
          onSelectRecipe={(recipe: QaRecipe) => {
            setPrompt(recipe.promptTemplate);
          }}
        />

        {/* Prompt Form with Long Text Support & File Drag & Drop / Upload */}
        <form onSubmit={handleGenerateFlow} className="space-y-3">
          <div>
            <AiPromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              attachedFiles={attachedFiles}
              setAttachedFiles={setAttachedFiles}
              domContext={domContext || null}
              copilotScope={copilotScope}
              activeProject={activeProject}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleAutoSuite}
              disabled={isGenerating}
              className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-[6px] font-semibold text-xs flex items-center space-x-1.5 border border-stone-800 transition-all shrink-0 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('copilot.autoSuite')}</span>
            </button>

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-amber-50 font-bold text-xs rounded-[6px] flex items-center space-x-1.5 border border-amber-600 shadow-md transition-all shrink-0 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>
                {isGenerating
                  ? t('copilot.generating')
                  : copilotScope === 'project'
                    ? t('copilot.generateProjectSteps')
                    : t('copilot.generateFlowSteps')}
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

        {/* Streaming / Generated YAML Result */}
        {(generatedYaml || streamingText) && (
          <div className="bg-stone-900 border border-stone-800 rounded-[6px] p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <span className="font-bold text-emerald-400 text-xs flex items-center space-x-1.5">
                  {generatedYaml ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{generatedYaml ? t('copilot.generatedYaml') : t('copilot.generatedYamlStreaming')}</span>
                </span>

                {/* Live / Finished Generation Telemetry Chip */}
                {(isGenerating || generatedYaml) && tokenCount > 0 && (
                  <div
                    data-testid="copilot-telemetry-chip"
                    className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-stone-950/90 border border-amber-800/60 text-amber-300 font-mono text-[11px]"
                  >
                    <Gauge className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>
                      {generatedYaml
                        ? t('copilot.telemetry.completedStats', {
                            tokens: tokenCount,
                            duration: generationDuration,
                            speed: tokenSpeed,
                          })
                        : t('copilot.telemetry.stats', {
                            tokens: tokenCount,
                            speed: tokenSpeed,
                            duration: generationDuration,
                          })}
                    </span>
                  </div>
                )}
              </div>

              {generatedYaml && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDiffPreviewYaml(generatedYaml)}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs rounded-[6px] border border-stone-700 flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('copilot.diffPreview.previewButton')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyGeneratedYaml(generatedYaml)}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] border border-amber-600 shadow-xs transition-all cursor-pointer"
                  >
                    {t('copilot.applyToActiveEditor', { name: activeFlow.name })}
                  </button>
                </div>
              )}
            </div>

            <pre
              aria-live="polite"
              className="p-3 bg-stone-950 rounded-[6px] border border-stone-800 font-mono text-xs text-amber-200 overflow-x-auto max-h-64"
            >
              {generatedYaml || streamingText || t('copilot.waitingResponse')}
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
                  {t('copilot.generatedSuite', { count: autoSuiteResult.flows?.length || 0 })}
                </span>
              </h4>

              {onBatchAddFlowsToProject && (
                <button
                  onClick={handleImportAllSuiteFlows}
                  disabled={batchImported}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-emerald-50 font-bold text-xs rounded-[6px] border border-emerald-600 flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  {batchImported ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{batchImported ? t('copilot.allFlowsImported') : t('copilot.importAllSuite')}</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {autoSuiteResult.flows?.map((flowItem: any, idx: number) => (
                <div key={idx} className="p-3 bg-stone-950 rounded-[6px] border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs">{flowItem.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDiffPreviewYaml(flowItem.yaml)}
                        className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 text-[10px] font-bold rounded-[6px] border border-stone-800 flex items-center space-x-1 cursor-pointer"
                      >
                        <GitCompare className="w-3 h-3 text-amber-400" />
                        <span>{t('copilot.diffPreview.previewButton')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyGeneratedYaml(flowItem.yaml)}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-amber-700 text-stone-200 text-[10px] font-bold rounded-[6px] border border-stone-700 cursor-pointer"
                      >
                        {t('copilot.loadIntoEditor')}
                      </button>
                    </div>
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
        <div className="flex items-center space-x-2 truncate min-w-0">
          <Bot className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-mono text-amber-300 font-bold text-xs bg-stone-950 px-2 py-0.5 rounded border border-stone-800 truncate">
            {displayName}
          </span>
        </div>

        <div className="relative" ref={providerRef}>
          <button
            type="button"
            onClick={() => setShowProviderPanel(!showProviderPanel)}
            className="px-2.5 py-1.5 bg-stone-950 hover:bg-stone-800 text-amber-300 font-sans font-bold text-xs rounded-[6px] border border-stone-700/80 hover:border-amber-500 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('copilot.switchAgent')}</span>
            <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${showProviderPanel ? 'rotate-180' : ''}`} />
          </button>

          {/* Provider Selection Panel Popover */}
          {showProviderPanel && (
            <div className="absolute bottom-full right-0 mb-2 w-[320px] sm:w-[420px] bg-stone-900 border border-amber-800/60 rounded-[8px] p-3.5 shadow-2xl z-50 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="font-bold text-amber-300 text-xs flex items-center space-x-1.5">
                  <Bot className="w-4 h-4" />
                  <span>{t('copilot.providerSelection')}</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">{t('copilot.providerSubtext')}</span>
              </div>

              <AgentSelector
                detectedAgents={detectedAgents}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Diff Preview Modal */}
      {diffPreviewYaml && (
        <AiDiffPreviewModal
          isOpen={!!diffPreviewYaml}
          onClose={() => setDiffPreviewYaml(null)}
          originalYaml={currentYaml || activeFlow.yamlContent || ''}
          generatedYaml={diffPreviewYaml}
          onReplace={() => {
            onApplyGeneratedYaml(diffPreviewYaml);
            setDiffPreviewYaml(null);
          }}
          onAppend={() => {
            const updated = appendStepsToYaml(currentYaml || activeFlow.yamlContent || '', diffPreviewYaml);
            onApplyGeneratedYaml(updated);
            setDiffPreviewYaml(null);
          }}
        />
      )}
    </div>
  );
};
