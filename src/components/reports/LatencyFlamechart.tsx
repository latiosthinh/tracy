import React from 'react';
import { Clock, AlertTriangle, AlertCircle, Zap } from 'lucide-react';
import { TestRunResult } from '@/src/types/execution';
import { FlowStep } from '@/src/types/flow';
import { useTranslation } from '@/src/hooks/useTranslation';

interface LatencyFlamechartProps {
  result: TestRunResult;
}

export const LatencyFlamechart: React.FC<LatencyFlamechartProps> = ({ result }) => {
  const { t } = useTranslation();

  const steps = result.steps || [];
  const totalDuration = result.durationMs || steps.reduce((sum, s) => sum + (s.durationMs || 0), 0) || 1;

  // Calculate stats
  let maxDuration = 0;
  let slowestStep: FlowStep | null = null;
  let bottleneckCount = 0;
  let sumDuration = 0;
  let stepsWithDuration = 0;

  // Calculate cumulative start times for waterfall offset
  let currentOffset = 0;
  const waterfallSteps = steps.map((step, idx) => {
    const duration = step.durationMs ?? 0;
    const startMs = currentOffset;
    currentOffset += duration;

    if (duration > maxDuration) {
      maxDuration = duration;
      slowestStep = step;
    }
    if (duration > 800) {
      bottleneckCount++;
    }
    if (duration > 0) {
      sumDuration += duration;
      stepsWithDuration++;
    }

    const startPercent = Math.min(100, (startMs / totalDuration) * 100);
    const widthPercent = Math.max(1, Math.min(100 - startPercent, (duration / totalDuration) * 100));

    return {
      step,
      index: idx + 1,
      startMs,
      duration,
      startPercent,
      widthPercent,
      isSlow: duration > 800 && duration <= 1500,
      isCritical: duration > 1500,
    };
  });

  const avgLatency = stepsWithDuration > 0 ? Math.round(sumDuration / stepsWithDuration) : 0;

  if (steps.length === 0) {
    return (
      <div className="p-8 text-center text-stone-500 font-mono text-xs">
        {t('reports.flamechart.noSteps')}
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-stone-950 p-2.5 rounded-[6px] border border-stone-800 flex items-center space-x-2.5">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-[4px]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">
              {t('reports.flamechart.totalDuration')}
            </span>
            <span className="text-sm font-bold text-amber-400">
              {(totalDuration / 1000).toFixed(2)}s
            </span>
          </div>
        </div>

        <div className="bg-stone-950 p-2.5 rounded-[6px] border border-stone-800 flex items-center space-x-2.5">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-[4px]">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">
              {t('reports.flamechart.bottlenecks')}
            </span>
            <span className={`text-sm font-bold ${bottleneckCount > 0 ? 'text-rose-400' : 'text-stone-400'}`}>
              {bottleneckCount}
            </span>
          </div>
        </div>

        <div className="bg-stone-950 p-2.5 rounded-[6px] border border-stone-800 flex items-center space-x-2.5">
          <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-[4px]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">
              {t('reports.flamechart.avgLatency')}
            </span>
            <span className="text-sm font-bold text-sky-400">
              {avgLatency}ms
            </span>
          </div>
        </div>

        <div className="bg-stone-950 p-2.5 rounded-[6px] border border-stone-800 flex items-center space-x-2.5">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-[4px]">
            <Clock className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-[10px] text-stone-400 uppercase font-bold block">
              {t('reports.flamechart.longestStep')}
            </span>
            <span className="text-sm font-bold text-amber-400 truncate block">
              {slowestStep ? `${(slowestStep as FlowStep).command} (${maxDuration}ms)` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Waterfall / Flamechart Bar Graph */}
      <div className="bg-stone-950 p-3 rounded-[6px] border border-stone-800 space-y-3">
        {/* Timeline Header Markers */}
        <div className="flex justify-between text-[10px] text-stone-400 font-mono border-b border-stone-800 pb-1.5">
          <span>0ms</span>
          <span>{Math.round(totalDuration * 0.25)}ms</span>
          <span>{Math.round(totalDuration * 0.5)}ms</span>
          <span>{Math.round(totalDuration * 0.75)}ms</span>
          <span>{Math.round(totalDuration)}ms</span>
        </div>

        {/* Step Latency Rows */}
        <div className="space-y-2 font-mono">
          {waterfallSteps.map((item) => {
            const pct = Math.round((item.duration / totalDuration) * 100);
            return (
              <div
                key={item.index}
                className="group p-2 bg-stone-900/60 hover:bg-stone-900 rounded-[4px] border border-stone-800/80 transition-colors"
              >
                {/* Step Info Row */}
                <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-[10px] text-stone-400 w-4">{item.index}.</span>
                    <span className="font-bold text-amber-400">{item.step.command}</span>
                    <span className="text-stone-400 truncate max-w-xs text-[11px]">
                      {typeof item.step.target === 'string'
                        ? item.step.target
                        : item.step.target?.value || item.step.value || ''}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {item.isCritical ? (
                      <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[9px] font-bold flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{t('reports.flamechart.criticalWarning')}</span>
                      </span>
                    ) : item.isSlow ? (
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{t('reports.flamechart.slowWarning')}</span>
                      </span>
                    ) : null}

                    <span className="text-stone-400 text-[10px]">
                      {t('reports.flamechart.percentOfTotal', { percent: pct })}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        item.isCritical
                          ? 'text-rose-400'
                          : item.isSlow
                            ? 'text-amber-400'
                            : 'text-stone-300'
                      }`}
                    >
                      {item.duration}ms
                    </span>
                  </div>
                </div>

                {/* Waterfall Gantt Bar Track */}
                <div className="relative h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                  <div
                    style={{
                      left: `${item.startPercent}%`,
                      width: `${item.widthPercent}%`,
                    }}
                    className={`absolute h-full rounded-full transition-all duration-300 ${
                      item.isCritical
                        ? 'bg-rose-500 shadow-xs shadow-rose-500/50'
                        : item.isSlow
                          ? 'bg-amber-500 shadow-xs shadow-amber-500/50'
                          : item.step.status === 'failed'
                            ? 'bg-rose-600'
                            : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
