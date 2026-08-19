import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  EdgeProps,
} from '@xyflow/react';
import { MousePointer, Compass, Send } from 'lucide-react';
import type { VisualizerEdgeData } from '@/src/types/crawler';

export const RouteEdge: React.FC<EdgeProps> = memo((props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
  } = props;

  const edgeData = (data || {}) as unknown as VisualizerEdgeData;
  const actionType = edgeData.actionType || 'navigate';
  const label = edgeData.triggerText || actionType;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const getActionBadge = () => {
    switch (actionType) {
      case 'click':
        return {
          icon: MousePointer,
          classes: 'bg-amber-950/90 border-amber-500/80 text-amber-300',
        };
      case 'fill_submit':
        return {
          icon: Send,
          classes: 'bg-purple-950/90 border-purple-500/80 text-purple-300',
        };
      case 'navigate':
      default:
        return {
          icon: Compass,
          classes: 'bg-cyan-950/90 border-cyan-500/80 text-cyan-300',
        };
    }
  };

  const badge = getActionBadge();
  const Icon = badge.icon;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#57534e',
          strokeWidth: 1.5,
          ...style,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <span
            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium shadow-sm truncate max-w-[120px] ${badge.classes}`}
            title={label}
          >
            <Icon className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

RouteEdge.displayName = 'RouteEdge';
