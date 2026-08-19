import React, { useState } from 'react';
import {
  Gauge,
  Wifi,
  Cpu,
  Play,
  Square,
  Trash2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { usePerfStore } from '@/src/stores/perfStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { WebVitalsScorecard } from '@/src/components/perf/WebVitalsScorecard';
import type { ThrottlingPreset } from '@/src/types/perf';
import { tracyApi } from '@/src/lib/ipc';

export const PerfProfilerPanel: React.FC = () => {
  const { t } = useTranslation();

  const activeMetrics = usePerfStore((s) => s.activeMetrics);
  const activeRatings = usePerfStore((s) => s.activeRatings);
  const assertions = usePerfStore((s) => s.assertions);
  const activeThrottling = usePerfStore((s) => s.activeThrottling);
  const cpuSlowdownRate = usePerfStore((s) => s.cpuSlowdownRate);
  const setThrottlingPreset = usePerfStore((s) => s.setThrottlingPreset);
  const setCpuSlowdownRate = usePerfStore((s) => s.setCpuSlowdownRate);
  const isRecording = usePerfStore((s) => s.isRecording);
  const toggleRecording = usePerfStore((s) => s.toggleRecording);
  const clearMetrics = usePerfStore((s) => s.clearMetrics);

  const [appliedThrottlingSuccess, setAppliedThrottlingSuccess] = useState(false);

  const throttlingOptions: { id: ThrottlingPreset; labelKey: string }[] = [
    { id: 'none', labelKey: 'perf.throttlingNone' },
    { id: 'fast3g', labelKey: 'perf.throttlingFast3g' },
    { id: 'slow3g', labelKey: 'perf.throttlingSlow3g' },
    { id: 'offline', labelKey: 'perf.throttlingOffline' },
  ];

  const handleApplyThrottling = async (preset: ThrottlingPreset, cpuRate: number) => {
    setThrottlingPreset(preset);
    setCpuSlowdownRate(cpuRate);

    try {
      if ((tracyApi as any).applyThrottling) {
        await (tracyApi as any).applyThrottling({
          preset,
          cpuSlowdownRate: cpuRate,
        });
      }
      setAppliedThrottlingSuccess(true);
      setTimeout(() => setAppliedThrottlingSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to apply throttling:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 font-sans text-xs overflow-hidden">
      {/* Top Header Controls */}
      <div className="p-3 border-b border-stone-800 bg-stone-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-stone-100 text-sm">{t('perf.title')}</h2>
              <p className="text-[11px] text-stone-400 hidden sm:block">{t('perf.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => toggleRecording()}
            className={`px-3 py-1.5 rounded-[6px] font-bold text-xs flex items-center space-x-1.5 border transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                : 'bg-amber-700 hover:bg-amber-600 border-amber-600 text-amber-50 shadow-xs'
            }`}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRecording ? t('perf.stopRecording') : t('perf.startRecording')}</span>
          </button>

          <button
            type="button"
            onClick={clearMetrics}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-[6px] font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-stone-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('perf.clearMetrics')}</span>
          </button>
        </div>
      </div>

      {/* Throttling Configuration Bar */}
      <div className="p-3 border-b border-stone-800 bg-stone-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-4">
          {/* Network Throttling Presets */}
          <div className="flex items-center space-x-2">
            <Wifi className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
            <span className="font-bold text-stone-300 font-mono text-[11px]">{t('perf.networkLabel')}</span>
            <select
              value={activeThrottling}
              onChange={(e) => handleApplyThrottling(e.target.value as ThrottlingPreset, cpuSlowdownRate)}
              className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100 font-mono text-xs focus:border-amber-500 focus:outline-hidden cursor-pointer"
            >
              {throttlingOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {/* CPU Slowdown */}
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
            <span className="font-bold text-stone-300 font-mono text-[11px]">{t('perf.cpuSlowdownLabel')}</span>
            <select
              value={cpuSlowdownRate}
              onChange={(e) => handleApplyThrottling(activeThrottling, Number(e.target.value))}
              className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100 font-mono text-xs focus:border-amber-500 focus:outline-hidden cursor-pointer"
            >
              <option value="1">1x (No Slowdown)</option>
              <option value="2">2x Slowdown</option>
              <option value="4">4x Slowdown (Mid-tier Mobile)</option>
              <option value="6">6x Slowdown (Low-end Mobile)</option>
            </select>
          </div>
        </div>

        {appliedThrottlingSuccess && (
          <span className="text-emerald-400 font-mono text-[11px] flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('perf.throttlingApplied')}</span>
          </span>
        )}
      </div>

      {/* Profiler Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Core Web Vitals Scorecard */}
        <WebVitalsScorecard metrics={activeMetrics} ratings={activeRatings} />

        {/* Evaluated Performance Assertions */}
        {assertions.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-stone-800">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h3 className="font-bold text-stone-200 text-xs uppercase tracking-wider font-mono">
                {t('perf.assertions', { count: assertions.length })}
              </h3>
            </div>

            <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden font-mono">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-stone-950/80 text-[10px] text-stone-400 uppercase border-b border-stone-800">
                  <tr>
                    <th className="p-2.5">{t('perf.metric')}</th>
                    <th className="p-2.5">{t('perf.expectedBudget')}</th>
                    <th className="p-2.5">{t('perf.actualMeasured')}</th>
                    <th className="p-2.5 text-right">{t('perf.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {assertions.map((a, idx) => (
                    <tr key={idx} className="hover:bg-stone-800/40 transition-colors">
                      <td className="p-2.5 font-bold text-stone-200 uppercase">{a.metric}</td>
                      <td className="p-2.5 text-stone-400">≤ {a.expected} ms</td>
                      <td className="p-2.5 text-stone-200">{Math.round(a.actual)} ms</td>
                      <td className="p-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            a.passed
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {a.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
