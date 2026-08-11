import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Sparkles,
  AlertOctagon,
  Image as ImageIcon,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FlowStep, ExecutionLog, TestRunResult } from '../../types/autoflow';

interface StepTimelineProps {
  steps: FlowStep[];
  isExecuting: boolean;
  activeStepIndex: number;
  logs: ExecutionLog[];
  onStartRun: () => void;
  onPauseRun: () => void;
  onResetRun: () => void;
  executionSpeed: number;
  onSpeedChange: (speedMs: number) => void;
  lastResult?: TestRunResult | null;
  onExplainFailure?: (step: FlowStep, errorMsg: string) => void;
}

export const StepTimeline: React.FC<StepTimelineProps> = ({
  steps,
  isExecuting,
  activeStepIndex,
  logs,
  onStartRun,
  onPauseRun,
  onResetRun,
  executionSpeed,
  onSpeedChange,
  lastResult,
  onExplainFailure,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'logs'>('timeline');
  const [expandedErrorIdx, setExpandedErrorIdx] = useState<number | null>(null);

  const passedCount = steps.filter(s => s.status === 'passed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;
  const totalCount = steps.length;
  const progressPct = totalCount > 0 ? Math.round(((passedCount + failedCount) / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 font-sans text-xs rounded-[6px] border border-stone-800 overflow-hidden shadow-inner">
      {/* Execution Control Header */}
      <div className="bg-stone-900 px-4 py-3 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2">
          {!isExecuting ? (
            <button
              onClick={onStartRun}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-emerald-50 font-bold text-xs rounded-[6px] flex items-center space-x-1.5 border border-emerald-600 shadow-xs transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Test Suite</span>
            </button>
          ) : (
            <button
              onClick={onPauseRun}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] flex items-center space-x-1.5 border border-amber-600 shadow-xs transition-all"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={onResetRun}
            className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-[6px] border border-stone-700 transition-all"
            title="Reset Execution"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded-[6px] border border-stone-800 text-[10px] font-mono">
            <FastForward className="w-3 h-3 text-amber-400 ml-1" />
            <button
              onClick={() => onSpeedChange(800)}
              className={`px-1.5 py-0.5 rounded-sm ${executionSpeed === 800 ? 'bg-amber-800 text-amber-100 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
            >
              1x
            </button>
            <button
              onClick={() => onSpeedChange(300)}
              className={`px-1.5 py-0.5 rounded-sm ${executionSpeed === 300 ? 'bg-amber-800 text-amber-100 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
            >
              3x
            </button>
            <button
              onClick={() => onSpeedChange(50)}
              className={`px-1.5 py-0.5 rounded-sm ${executionSpeed === 50 ? 'bg-amber-800 text-amber-100 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Turbo
            </button>
          </div>
        </div>

        {/* Progress Summary Badge */}
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <span className="text-emerald-400 font-bold">{passedCount} Passed</span>
          {failedCount > 0 && <span className="text-rose-400 font-bold">{failedCount} Failed</span>}
          <span className="text-stone-500">{totalCount} Steps</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-900 h-1.5 overflow-hidden shrink-0">
        <div
          className={`h-full transition-all duration-300 ${failedCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* View Toggle Tabs */}
      <div className="bg-stone-900/80 px-3 py-1.5 border-b border-stone-800 flex items-center space-x-4 text-xs font-semibold shrink-0">
        <button
          onClick={() => setActiveSubTab('timeline')}
          className={`flex items-center space-x-1.5 py-1 border-b-2 transition-all ${
            activeSubTab === 'timeline' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Execution Timeline</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center space-x-1.5 py-1 border-b-2 transition-all ${
            activeSubTab === 'logs' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Console & Network Logs ({logs.length})</span>
        </button>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 font-mono">
        {activeSubTab === 'timeline' ? (
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isActive = activeStepIndex === idx && isExecuting;

              return (
                <div
                  key={step.id || idx}
                  className={`p-3 rounded-[6px] border transition-all text-xs ${
                    isActive
                      ? 'bg-amber-950/60 border-amber-600/80 ring-1 ring-amber-500/30'
                      : step.status === 'passed'
                      ? 'bg-stone-900/60 border-stone-800/80'
                      : step.status === 'failed'
                      ? 'bg-rose-950/40 border-rose-800/90'
                      : 'bg-stone-950/40 border-stone-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5">
                      {step.status === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      ) : step.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      ) : isActive ? (
                        <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mt-0.5 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-stone-600 mt-0.5 shrink-0" />
                      )}

                      <div>
                        <div className="flex items-center space-x-2 font-bold">
                          <span className="text-amber-400">{step.command}</span>
                          <span className="text-stone-300">
                            {typeof step.target === 'object'
                              ? JSON.stringify(step.target)
                              : step.target
                              ? `"${step.target}"`
                              : step.value
                              ? `"${step.value}"`
                              : ''}
                          </span>
                        </div>

                        {step.value && step.target && (
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            Value: <span className="text-emerald-300 font-mono">"{step.value}"</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-stone-500">
                      {step.durationMs && <span>{step.durationMs}ms</span>}
                      <span className="uppercase font-bold">
                        {step.status === 'passed' ? 'Passed' : step.status === 'failed' ? 'Failed' : step.status}
                      </span>
                    </div>
                  </div>

                  {/* Failure Details & AI Auto-Fix Trigger */}
                  {step.status === 'failed' && step.errorMessage && (
                    <div className="mt-2.5 p-2.5 bg-rose-950/80 rounded-[6px] border border-rose-800/80 text-[11px] text-rose-200 space-y-2">
                      <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>Assertion Failure Error:</span>
                      </div>
                      <p className="font-mono text-stone-300">{step.errorMessage}</p>

                      {onExplainFailure && (
                        <button
                          onClick={() => onExplainFailure(step, step.errorMessage!)}
                          className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 text-amber-50 font-sans font-bold text-[10px] rounded-[6px] flex items-center space-x-1 border border-amber-600 shadow-xs transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>Ask Gemini AI to Explain & Fix Step</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Logs Panel */
          <div className="space-y-1.5 text-[11px]">
            {logs.length === 0 ? (
              <p className="text-stone-500 text-center py-6">No console logs recorded yet. Start test execution.</p>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={`p-2 rounded-[6px] font-mono flex items-start space-x-2 border ${
                    log.level === 'error'
                      ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                      : log.level === 'assertion'
                      ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                      : 'bg-stone-900 border-stone-800/80 text-stone-300'
                  }`}
                >
                  <span className="text-[10px] text-stone-500 shrink-0">{log.timestamp}</span>
                  <span
                    className={`text-[9px] font-extrabold px-1 py-0.2 rounded-xs uppercase shrink-0 ${
                      log.level === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : log.level === 'assertion'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
