import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, CheckCircle2, AlertCircle, Wrench, Clock, Shield } from 'lucide-react';
import type { AgentToolTraceEvent } from '@/src/types/skills';
import { useTranslation } from '@/src/hooks/useTranslation';

interface TraceInspectorProps {
  traces: AgentToolTraceEvent[];
  isExecuting?: boolean;
}

export const TraceInspector: React.FC<TraceInspectorProps> = ({ traces, isExecuting = false }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({});

  if (!traces || traces.length === 0) {
    if (!isExecuting) return null;
    return (
      <div className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-lg p-3 my-2 text-xs text-muted-foreground flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span>{t('copilot.trace.listening') || 'Monitoring agent execution trace...'}</span>
      </div>
    );
  }

  const toggleTurn = (turn: number) => {
    setExpandedTurns(prev => ({
      ...prev,
      [turn]: prev[turn] === undefined ? false : !prev[turn],
    }));
  };

  return (
    <div
      className="border border-border/60 bg-card/80 backdrop-blur-sm rounded-lg my-2 overflow-hidden text-xs shadow-sm transition-all"
      aria-label={t('copilot.trace.ariaLabel')}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between bg-muted/30 hover:bg-muted/50 border-b border-border/40 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span>{t('copilot.trace.title')}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono font-semibold">
            {traces.length} {traces.length === 1 ? 'event' : 'events'}
          </span>
          {isExecuting && (
            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {t('copilot.trace.active')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span title={t('copilot.trace.redactedTitle')} className="inline-flex">
            <Shield className="w-3 h-3 text-emerald-500" />
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-2 space-y-2 max-h-64 overflow-y-auto font-mono text-[11px]">
          {traces.map((event, idx) => {
            const isExpanded = expandedTurns[event.turn] ?? true;
            const hasTool = !!event.toolCall;
            const isMatchSuccess = event.toolResult && typeof event.toolResult === 'object' && (event.toolResult as any).matchCount > 0;

            return (
              <div
                key={`${event.turn}-${event.timestamp}-${idx}`}
                className="border border-border/40 rounded bg-background/50 p-2 space-y-1.5"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between cursor-pointer select-none text-left bg-transparent border-0 p-0"
                  onClick={() => toggleTurn(event.turn)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] text-muted-foreground">
                      Turn {event.turn}
                    </span>
                    {hasTool && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 text-[10px] flex items-center gap-1">
                        <Wrench className="w-2.5 h-2.5" />
                        {event.toolCall?.name}
                      </span>
                    )}
                    {event.toolResult && (
                      <span className="flex items-center gap-1 text-[10px]">
                        {isMatchSuccess ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {event.durationMs && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {event.durationMs}ms
                      </span>
                    )}
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-1 pt-1 border-t border-border/20 text-muted-foreground">
                    {event.thought && (
                      <div className="text-foreground/90 italic bg-muted/20 rounded p-1.5 text-[10.5px]">
                        "{event.thought}"
                      </div>
                    )}
                    {event.toolCall && (
                      <div className="bg-muted/30 rounded p-1.5 overflow-x-auto text-[10px]">
                        <span className="text-primary font-semibold">{t('copilot.trace.args')}{' '}</span>
                        {JSON.stringify(event.toolCall.arguments, null, 2)}
                      </div>
                    )}
                    {event.toolResult && (
                      <div className="bg-muted/30 rounded p-1.5 overflow-x-auto text-[10px]">
                        <span className="text-emerald-500 font-semibold">{t('copilot.trace.result')}{' '}</span>
                        {JSON.stringify(event.toolResult, null, 2)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
