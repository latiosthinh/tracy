import React, { useState } from 'react';
import {
  Globe,
  Flame,
  Compass,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Loader2,
} from 'lucide-react';
import type { MatrixWorkerProgress, MatrixBrowserTarget } from '@/src/types/matrix';
import { useTranslation } from '@/src/hooks/useTranslation';

interface BrowserWorkerCardProps {
  browser: MatrixBrowserTarget;
  workerProgress?: MatrixWorkerProgress;
  isActiveSelection?: boolean;
  onSelect?: () => void;
}

export const BrowserWorkerCard: React.FC<BrowserWorkerCardProps> = ({
  browser,
  workerProgress,
  isActiveSelection = false,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [showErrorTrace, setShowErrorTrace] = useState(false);

  const getEngineConfig = (engine: MatrixBrowserTarget) => {
    switch (engine) {
      case 'chromium':
        return {
          name: t('matrix.chromium') || 'Chromium',
          icon: Globe,
          color: 'text-sky-400',
          border: 'border-sky-800/80',
          bg: 'bg-sky-950/20',
          badgeBg: 'bg-sky-950/60 text-sky-300 border-sky-800',
        };
      case 'firefox':
        return {
          name: t('matrix.firefox') || 'Firefox',
          icon: Flame,
          color: 'text-orange-400',
          border: 'border-orange-800/80',
          bg: 'bg-orange-950/20',
          badgeBg: 'bg-orange-950/60 text-orange-300 border-orange-800',
        };
      case 'webkit':
        return {
          name: t('matrix.webkit') || 'WebKit',
          icon: Compass,
          color: 'text-purple-400',
          border: 'border-purple-800/80',
          bg: 'bg-purple-950/20',
          badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-800',
        };
    }
  };

  const engine = getEngineConfig(browser);
  const Icon = engine.icon;

  const status = workerProgress?.status || 'idle';
  const currentStep = workerProgress?.currentStepIndex ?? 0;
  const totalSteps = workerProgress?.totalSteps ?? 0;
  const passed = workerProgress?.passedCount ?? 0;
  const failed = workerProgress?.failedCount ?? 0;
  const durationMs = workerProgress?.durationMs ?? 0;
  const currentStepName = workerProgress?.currentStepName;
  const error = workerProgress?.error;

  const progressPercent =
    totalSteps > 0 ? Math.min(100, Math.round((currentStep / totalSteps) * 100)) : 0;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'passed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t('matrix.passed')}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-950/80 text-rose-300 border border-rose-700/80 flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>{t('matrix.failed')}</span>
          </span>
        );
      case 'running':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-700/80 flex items-center space-x-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{t('matrix.runningStatus')}</span>
          </span>
        );
      case 'queued':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-900 text-stone-300 border border-stone-700">
            {t('matrix.queued') || 'Queued'}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-900 text-stone-400 border border-stone-800">
            {t('matrix.idle')}
          </span>
        );
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border p-4 flex flex-col font-sans transition-all cursor-pointer ${
        isActiveSelection
          ? 'bg-stone-900 border-amber-500 shadow-md ring-1 ring-amber-500/50'
          : 'bg-stone-950 hover:bg-stone-900/60 border-stone-800'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 rounded-md ${engine.bg} border ${engine.border}`}>
            <Icon className={`w-4 h-4 ${engine.color}`} aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-bold text-stone-100 text-xs">{engine.name}</h4>
            <span className="text-[10px] font-mono text-stone-400">{browser}</span>
          </div>
        </div>
        {getStatusBadge(status)}
      </div>

      {/* Progress & Current Step */}
      <div className="py-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-stone-400">
            {t('matrix.stepProgress', {
              current: currentStep,
              total: totalSteps,
              stepName: currentStepName || (status === 'idle' ? 'Ready' : 'Running...'),
            })}
          </span>
          <span className="font-bold text-amber-400">{progressPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-stone-800">
          <div
            className={`h-full transition-all duration-300 ${
              status === 'failed'
                ? 'bg-rose-500'
                : status === 'passed'
                ? 'bg-emerald-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800/60 font-mono text-[11px]">
        <div className="p-2 bg-stone-900/70 rounded border border-stone-800/80 flex items-center space-x-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div>
            <span className="text-[9px] text-stone-400 uppercase block font-sans">Passed</span>
            <span className="font-bold text-emerald-400">{passed}</span>
          </div>
        </div>

        <div className="p-2 bg-stone-900/70 rounded border border-stone-800/80 flex items-center space-x-1.5">
          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <div>
            <span className="text-[9px] text-stone-400 uppercase block font-sans">Failed</span>
            <span className="font-bold text-rose-400">{failed}</span>
          </div>
        </div>

        <div className="p-2 bg-stone-900/70 rounded border border-stone-800/80 flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div>
            <span className="text-[9px] text-stone-400 uppercase block font-sans">Time</span>
            <span className="font-bold text-amber-300">
              {durationMs ? `${(durationMs / 1000).toFixed(1)}s` : '0s'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Accordion if Worker Failed */}
      {error && (
        <div className="mt-3 p-2 bg-rose-950/60 border border-rose-800/80 rounded text-xs space-y-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowErrorTrace(!showErrorTrace);
            }}
            className="w-full flex items-center justify-between text-rose-300 font-semibold text-left cursor-pointer"
          >
            <div className="flex items-center space-x-1.5 truncate">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            {showErrorTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showErrorTrace && (
            <pre className="p-2 bg-stone-950 rounded text-[10px] text-rose-200 font-mono overflow-x-auto whitespace-pre-wrap">
              {error}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
