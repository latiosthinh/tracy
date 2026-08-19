import React, { useState } from 'react';
import {
  X,
  Play,
  Sparkles,
  CheckCircle2,
  FileCode,
  Globe,
  MousePointer,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useCrawlerStore } from '@/src/stores/crawlerStore';
import { useProjectStore } from '@/src/stores/projectStore';
import { useExecutionStore } from '@/src/stores/executionStore';
import { useUiStore } from '@/src/stores/uiStore';
import { useTranslation } from '@/src/hooks/useTranslation';

export const NodeActionModal: React.FC = () => {
  const { t } = useTranslation();
  const selectedNodeId = useCrawlerStore((s) => s.selectedNodeId);
  const setSelectedNode = useCrawlerStore((s) => s.setSelectedNode);
  const nodes = useCrawlerStore((s) => s.nodes);
  const generateFlowsForRoute = useCrawlerStore((s) => s.generateFlowsForRoute);

  const activeProject = useProjectStore((s) => s.getActiveProject());
  const batchAddFlows = useProjectStore((s) => s.batchAddFlows);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  const [isGenerating, setIsGenerating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!selectedNodeId) return null;

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const matchedFlows = (activeProject?.flows || []).filter((flow) => {
    if (flow.metadata?.url && flow.metadata.url.includes(node.pathname)) return true;
    return flow.steps?.some(
      (s) => s.value === node.pathname || (typeof s.target === 'string' && s.target === node.pathname)
    );
  });

  const handleRunFlow = (flow: typeof activeProject.flows[0]) => {
    startExecution(flow, activeProject?.targetUrl || '');
    setActiveTab('timeline');
    setSelectedNode(null);
  };

  const handleGenerateJourney = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateFlowsForRoute(node.id);
      if (generated && generated.length > 0) {
        batchAddFlows(
          generated.map((gf) => ({
            name: `${gf.title || 'Journey'}-${Date.now().toString(36)}`,
            yaml: gf.yamlContent,
            description: `Auto-generated test flow for route ${node.pathname}`,
          }))
        );
        setSuccessToast(t('visualizer.flowGeneratedSuccess', { count: generated.length }) || `Generated ${generated.length} E2E flows!`);
        setTimeout(() => {
          setActiveTab('editor');
          setSelectedNode(null);
        }, 600);
      } else {
        // Fallback default generated flow
        const cleanSlug = node.pathname.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+/, '') || 'home';
        const defaultYaml = `# Auto-Generated Journey for ${node.pathname}\nurl: ${node.url}\ntags:\n  - crawler-discovered\n---\n- navigate: ${node.pathname}\n- assertVisible: body\n`;
        batchAddFlows([
          {
            name: `crawl-${cleanSlug}-${Date.now().toString(36)}`,
            yaml: defaultYaml,
            description: `Exploration journey for ${node.pathname}`,
          },
        ]);
        setSuccessToast(t('visualizer.flowGeneratedSuccess', { count: 1 }) || 'Generated 1 E2E flow!');
        setTimeout(() => {
          setActiveTab('editor');
          setSelectedNode(null);
        }, 600);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="absolute right-4 top-16 bottom-4 w-96 z-30 bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-lg shadow-2xl flex flex-col font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
        <div className="flex items-center space-x-2 min-w-0">
          <Globe className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="font-bold text-stone-100 truncate" title={node.pathname}>
            {node.pathname}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedNode(null)}
          className="p-1 text-stone-500 hover:text-stone-300 rounded transition-colors cursor-pointer"
          aria-label={t('common.close') || 'Close'}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-3 flex-1 overflow-y-auto space-y-4">
        {/* Route Details */}
        <div className="space-y-1.5 text-stone-300">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            {t('visualizer.nodeDetails')}
          </div>
          {node.title && (
            <div className="text-stone-200 font-sans font-medium">{node.title}</div>
          )}
          <div className="text-[11px] text-stone-500 truncate" title={node.url}>
            {node.url}
          </div>
          {node.skeletonHash && (
            <div className="flex items-center space-x-1 text-[11px] text-stone-400">
              <FileCode className="w-3 h-3 text-stone-500" aria-hidden="true" />
              <span>{t('visualizer.skeletonHashLabel')}: {node.skeletonHash}</span>
            </div>
          )}
        </div>

        {/* Existing Matched Flows */}
        <div className="space-y-2 pt-2 border-t border-stone-800">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('visualizer.matchedFlows', { count: matchedFlows.length }) || `Matched Flows (${matchedFlows.length})`}</span>
          </div>

          {matchedFlows.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {matchedFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="p-2 bg-stone-950 border border-stone-800 rounded flex items-center justify-between gap-2"
                >
                  <div className="truncate font-sans font-medium text-stone-200">
                    {flow.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunFlow(flow)}
                    className="px-2 py-1 bg-amber-700 hover:bg-amber-600 text-amber-50 rounded text-[10px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
                    <span>Run Flow</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-stone-500 italic p-2 bg-stone-950/40 rounded border border-stone-800/40">
              No existing E2E test flows cover this specific route yet.
            </div>
          )}
        </div>

        {/* Discovered Interactive Elements */}
        <div className="space-y-2 pt-2 border-t border-stone-800">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
            <span>
              {t('visualizer.interactiveElements', { count: node.interactiveElements?.length || 0 }) ||
                `Interactive Elements (${node.interactiveElements?.length || 0})`}
            </span>
          </div>

          {node.interactiveElements && node.interactiveElements.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {node.interactiveElements.map((el, idx) => (
                <div
                  key={idx}
                  className="p-1.5 bg-stone-950 border border-stone-800 rounded text-[11px] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <MousePointer className="w-3 h-3 text-cyan-400 shrink-0" aria-hidden="true" />
                    <span className="text-stone-300 truncate">{el.text || el.selector}</span>
                  </div>
                  <span className="text-[10px] text-stone-500 px-1 py-0.5 bg-stone-900 rounded">
                    {el.actionType || el.tagName}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-stone-500 italic p-2 bg-stone-950/40 rounded border border-stone-800/40">
              {t('visualizer.noInteractiveElements')}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-stone-800 bg-stone-950/80 space-y-2">
        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerateJourney}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-emerald-50 rounded font-bold flex items-center justify-center space-x-2 shadow transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {isGenerating ? t('visualizer.generatingFlows') : t('visualizer.generateFlowForNode')}
          </span>
        </button>

        {successToast && (
          <div className="text-center text-emerald-400 text-[11px] flex items-center justify-center space-x-1 font-bold">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            <span>{successToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
