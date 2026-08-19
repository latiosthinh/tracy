import React from 'react';
import {
  Play,
  Square,
  Sliders,
  History,
  Trash2,
  Layers,
} from 'lucide-react';
import { useMatrixStore } from '@/src/stores/matrixStore';
import { useProjectStore } from '@/src/stores/projectStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { BrowserWorkerCard } from '@/src/components/matrix/BrowserWorkerCard';
import { MatrixResultsGrid } from '@/src/components/matrix/MatrixResultsGrid';
import type { MatrixBrowserTarget } from '@/src/types/matrix';
import { tracyApi } from '@/src/lib/ipc';

export const MatrixRunnerPanel: React.FC = () => {
  const { t } = useTranslation();

  const selectedBrowsers = useMatrixStore((s) => s.selectedBrowsers);
  const toggleBrowser = useMatrixStore((s) => s.toggleBrowser);
  const setBrowsers = useMatrixStore((s) => s.setBrowsers);
  const maxConcurrency = useMatrixStore((s) => s.maxConcurrency);
  const setMaxConcurrency = useMatrixStore((s) => s.setMaxConcurrency);
  const isMatrixRunning = useMatrixStore((s) => s.isMatrixRunning);
  const activeMatrixRun = useMatrixStore((s) => s.activeMatrixRun);
  const matrixHistory = useMatrixStore((s) => s.matrixHistory);
  const selectedBrowserDetail = useMatrixStore((s) => s.selectedBrowserDetail);
  const setSelectedBrowserDetail = useMatrixStore((s) => s.setSelectedBrowserDetail);
  const startMatrixRun = useMatrixStore((s) => s.startMatrixRun);
  const cancelMatrixRun = useMatrixStore((s) => s.cancelMatrixRun);
  const clearHistory = useMatrixStore((s) => s.clearHistory);

  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeFlowId = useProjectStore((s) => s.activeFlowId);
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeFlow =
    activeProject?.flows.find((f) => f.id === activeFlowId) || activeProject?.flows[0];

  const allAvailableBrowsers: MatrixBrowserTarget[] = ['chromium', 'firefox', 'webkit'];

  const handleSelectAllBrowsers = () => {
    if (selectedBrowsers.length === allAvailableBrowsers.length) {
      setBrowsers(['chromium']);
    } else {
      setBrowsers([...allAvailableBrowsers]);
    }
  };

  const handleRunMatrix = async () => {
    if (!activeFlow || isMatrixRunning) return;

    startMatrixRun(activeFlow.id, activeFlow.name, activeFlow.steps?.length || 0);

    try {
      if ((tracyApi as any).runMatrixFlow) {
        await (tracyApi as any).runMatrixFlow({
          flowId: activeFlow.id,
          flowName: activeFlow.name,
          browsers: selectedBrowsers,
          concurrency: maxConcurrency,
          yamlContent: activeFlow.yamlContent,
        });
      }
    } catch (err) {
      console.error('Matrix run invocation failed:', err);
    }
  };

  const handleCancelMatrix = async () => {
    cancelMatrixRun();
    try {
      if ((tracyApi as any).cancelMatrixFlow) {
        await (tracyApi as any).cancelMatrixFlow();
      }
    } catch (err) {
      console.error('Matrix cancel invocation failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 font-sans text-xs overflow-hidden">
      {/* Top Controls Header */}
      <div className="p-3 border-b border-stone-800 bg-stone-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-stone-100 text-sm">{t('matrix.title')}</h2>
              <p className="text-[11px] text-stone-400 hidden sm:block">{t('matrix.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-2">
          {isMatrixRunning ? (
            <button
              type="button"
              onClick={handleCancelMatrix}
              className="px-3.5 py-1.5 bg-rose-800 hover:bg-rose-700 text-rose-50 rounded-[6px] font-bold text-xs flex items-center space-x-1.5 border border-rose-600 transition-all cursor-pointer shadow-xs"
            >
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>{t('matrix.stopMatrix')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunMatrix}
              disabled={selectedBrowsers.length === 0 || !activeFlow}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-amber-50 rounded-[6px] font-bold text-xs flex items-center space-x-1.5 border border-amber-600 transition-all cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>{t('matrix.runMatrix')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Engine Selection & Concurrency Toolbar */}
      <div className="p-3 border-b border-stone-800 bg-stone-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Browser Target Checkboxes */}
        <div className="flex items-center space-x-4">
          <span className="font-bold text-stone-400 font-mono text-[11px] uppercase">
            {t('matrix.browserEngines')}:
          </span>
          <div className="flex items-center space-x-3">
            {allAvailableBrowsers.map((b) => {
              const isChecked = selectedBrowsers.includes(b);
              return (
                <label
                  key={b}
                  className="flex items-center space-x-1.5 cursor-pointer text-stone-200 hover:text-stone-100 font-semibold"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleBrowser(b)}
                    className="accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="capitalize">{t(`matrix.${b}`) || b}</span>
                </label>
              );
            })}

            <button
              type="button"
              onClick={handleSelectAllBrowsers}
              className="text-amber-400 hover:text-amber-300 text-[11px] font-mono font-semibold underline cursor-pointer ml-2"
            >
              {selectedBrowsers.length === allAvailableBrowsers.length ? 'Reset' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Concurrency Slider */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
            <span className="text-stone-300 font-mono font-bold">{t('matrix.concurrency')}:</span>
            <span className="text-amber-400 font-mono font-bold w-4">{maxConcurrency}</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            value={maxConcurrency}
            onChange={(e) => setMaxConcurrency(Number(e.target.value))}
            className="w-24 accent-amber-500 cursor-pointer"
            aria-label={t('matrix.concurrency')}
          />
        </div>
      </div>

      {/* Main Execution View: 3-column live cards + results grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Live Parallel Worker Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {allAvailableBrowsers.map((b) => {
            const isTarget = selectedBrowsers.includes(b);
            const workerProgress = activeMatrixRun?.browsers[b];

            if (!isTarget && !workerProgress) {
              return null;
            }

            return (
              <BrowserWorkerCard
                key={b}
                browser={b}
                workerProgress={workerProgress}
                isActiveSelection={selectedBrowserDetail === b}
                onSelect={() => setSelectedBrowserDetail(b)}
              />
            );
          })}
        </div>

        {/* Historical or Completed Summary Grid */}
        {activeMatrixRun && activeMatrixRun.overallStatus !== 'running' && (
          <div className="pt-2">
            <MatrixResultsGrid summary={activeMatrixRun} />
          </div>
        )}

        {/* Matrix History Section */}
        {matrixHistory.length > 0 && (
          <div className="pt-4 border-t border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <h3 className="font-bold text-stone-300 uppercase text-[11px] font-mono">
                  {t('matrix.executionHistory')} ({matrixHistory.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={clearHistory}
                className="text-stone-500 hover:text-rose-400 text-[11px] font-mono flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t('matrix.clearHistory')}</span>
              </button>
            </div>

            <div className="space-y-2">
              {matrixHistory.slice(0, 5).map((item, idx) => (
                <div
                  key={`${item.flowId}-${item.timestamp}-${idx}`}
                  className="p-3 bg-stone-900 rounded border border-stone-800 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                        item.overallStatus === 'passed'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {item.overallStatus}
                    </span>
                    <span className="font-bold text-stone-200">{item.flowName}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-stone-400 font-mono text-[11px]">
                    <span>{(item.durationMs / 1000).toFixed(2)}s</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
