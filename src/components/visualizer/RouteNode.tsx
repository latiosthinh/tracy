import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Globe, FileCode, CheckCircle2, AlertCircle, CircleDashed } from 'lucide-react';
import { useTranslation } from '@/src/hooks/useTranslation';
import type { VisualizerNodeData } from '@/src/types/crawler';

export const RouteNode: React.FC<NodeProps> = memo((props) => {
  const { t } = useTranslation();
  const data = (props.data || {}) as unknown as VisualizerNodeData;
  const isTarget = !!data.isCurrentCrawlTarget;
  const status = data.coverageStatus || 'unvisited';
  const flowCount = data.matchedFlowNames?.length || 0;

  const renderBadge = () => {
    switch (status) {
      case 'covered':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 border border-emerald-500/80 text-emerald-300">
            <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />
            <span>{`Covered (${flowCount} ${flowCount === 1 ? 'flow' : 'flows'})`}</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 border border-amber-500/80 text-amber-300">
            <AlertCircle className="w-2.5 h-2.5" aria-hidden="true" />
            <span>{`Partial (${flowCount} ${flowCount === 1 ? 'flow' : 'flows'})`}</span>
          </span>
        );
      case 'unvisited':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-950/80 border border-stone-700/80 text-stone-400">
            <CircleDashed className="w-2.5 h-2.5" aria-hidden="true" />
            <span>{t('visualizer.uncovered')}</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-lg border bg-stone-900 shadow-md p-3 min-w-[200px] max-w-[280px] font-mono text-xs transition-all relative ${
        isTarget
          ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-900/30 animate-pulse'
          : props.selected
          ? 'border-amber-500 ring-2 ring-amber-500/30'
          : 'border-stone-800 hover:border-stone-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-stone-500 border border-stone-800"
      />

      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center space-x-1 min-w-0">
          <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden="true" />
          <span
            className="font-bold text-stone-200 truncate"
            title={data.url || data.pathname}
          >
            {data.pathname || '/'}
          </span>
        </div>
        {renderBadge()}
      </div>

      {data.title && (
        <div className="text-[11px] text-stone-400 truncate mb-1" title={data.title}>
          {data.title}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-800/80">
        <span>{t('visualizer.interactivesCount', { count: data.interactiveCount ?? 0 })}</span>
        {data.skeletonHash && (
          <span className="inline-flex items-center space-x-0.5 text-stone-600">
            <FileCode className="w-2.5 h-2.5" aria-hidden="true" />
            <span className="truncate max-w-[60px]">{data.skeletonHash}</span>
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-stone-500 border border-stone-800"
      />
    </div>
  );
});

RouteNode.displayName = 'RouteNode';
