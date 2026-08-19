import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileSpreadsheet,
  Film,
  Network,
  Zap,
  Activity,
  List,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { TestRunResult } from '@/src/types/autoflow';
import { useTranslation } from '@/src/hooks/useTranslation';
import { generateStandaloneHtmlReport } from '@/src/utils/htmlReportExporter';
import { LatencyFlamechart } from '@/src/components/reports/LatencyFlamechart';

interface TestReportsProps {
  lastResult?: TestRunResult | null;
}

export const TestReports: React.FC<TestReportsProps> = ({ lastResult }) => {
  const { t } = useTranslation();
  const [activeArtifactTab, setActiveArtifactTab] = useState<'summary' | 'screenshots' | 'video' | 'network'>('summary');
  const [summaryViewMode, setSummaryViewMode] = useState<'list' | 'flamechart'>('list');

  if (!lastResult) {
    return (
      <div className="p-8 bg-stone-950 text-stone-400 text-center rounded-[6px] border border-stone-800 space-y-3 font-sans">
        <BarChart3 className="w-12 h-12 text-stone-600 mx-auto animate-pulse" />
        <h3 className="text-base font-bold text-stone-200">{t('reports.noReportsTitle')}</h3>
        <p className="text-xs max-w-sm mx-auto">
          {t('reports.noReportsDesc')}
        </p>
      </div>
    );
  }

  const passRate = Math.round((lastResult.passedCount / (lastResult.totalCount || 1)) * 100);
  const healedCount = lastResult.healedCount ?? lastResult.steps.filter(s => s.healResult?.healed).length;

  const handleExportReport = (format: 'html' | 'json' | 'junit') => {
    let content = '';
    const filename = `tracy-report.${format === 'junit' ? 'xml' : format}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
      content = JSON.stringify(lastResult, null, 2);
      mimeType = 'application/json';
    } else if (format === 'html') {
      content = generateStandaloneHtmlReport(lastResult, lastResult.flowName);
      mimeType = 'text/html';
    } else {
      content = `<testsuites><testsuite name="${lastResult.flowName}" tests="${lastResult.totalCount}" failures="${lastResult.failedCount}"></testsuite></testsuites>`;
      mimeType = 'application/xml';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 p-4 font-sans text-xs overflow-y-auto space-y-4">
      {/* Report Header */}
      <div className="bg-stone-900 p-4 rounded-[6px] border border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                lastResult.status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {lastResult.status}
            </span>
            <h2 className="font-bold text-amber-100 text-sm">{lastResult.flowName}</h2>
          </div>
          <p className="text-stone-400 text-[11px] mt-1">{t('reports.executedAt', { time: lastResult.timestamp })}</p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExportReport('html')}
            title={t('reports.htmlExport.ariaLabel')}
            aria-label={t('reports.htmlExport.ariaLabel')}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] border border-amber-600 flex items-center space-x-1 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('reports.htmlExport.downloadButton')}</span>
          </button>
          <button
            onClick={() => handleExportReport('junit')}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs rounded-[6px] border border-stone-700 flex items-center space-x-1 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t('reports.exportJunit')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-stone-900 p-3 rounded-[6px] border border-stone-800 flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-[6px]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">{t('reports.passedSteps')}</span>
            <span className="text-lg font-bold text-emerald-400">{lastResult.passedCount}</span>
          </div>
        </div>

        <div className="bg-stone-900 p-3 rounded-[6px] border border-stone-800 flex items-center space-x-3">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-[6px]">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">{t('reports.failedSteps')}</span>
            <span className="text-lg font-bold text-rose-400">{lastResult.failedCount}</span>
          </div>
        </div>

        <div className="bg-stone-900 p-3 rounded-[6px] border border-stone-800 flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-[6px]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">{t('reports.healedSteps')}</span>
            <span className="text-lg font-bold text-amber-400">{healedCount}</span>
          </div>
        </div>

        <div className="bg-stone-900 p-3 rounded-[6px] border border-stone-800 flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-[6px]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">{t('reports.passRate')}</span>
            <span className="text-lg font-bold text-amber-400">{passRate}%</span>
          </div>
        </div>

        <div className="bg-stone-900 p-3 rounded-[6px] border border-stone-800 flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-[6px]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">{t('reports.executionTime')}</span>
            <span className="text-lg font-bold text-amber-400">{(lastResult.durationMs / 1000).toFixed(2)}s</span>
          </div>
        </div>
      </div>

      {/* Artifact Subtabs */}
      <div className="bg-stone-900 p-2 rounded-[6px] border border-stone-800 flex items-center space-x-2 text-xs font-semibold">
        <button
          onClick={() => setActiveArtifactTab('summary')}
          className={`px-3 py-1.5 rounded-[6px] transition-all cursor-pointer ${
            activeArtifactTab === 'summary' ? 'bg-amber-700 text-amber-50 font-bold border border-amber-600' : 'text-stone-400 hover:text-stone-100'
          }`}
        >
          {t('reports.tabBreakdown')}
        </button>
        <button
          onClick={() => setActiveArtifactTab('screenshots')}
          className={`px-3 py-1.5 rounded-[6px] transition-all flex items-center space-x-1 cursor-pointer ${
            activeArtifactTab === 'screenshots' ? 'bg-amber-700 text-amber-50 font-bold border border-amber-600' : 'text-stone-400 hover:text-stone-100'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>{t('reports.tabScreenshots')}</span>
        </button>
        <button
          onClick={() => setActiveArtifactTab('video')}
          className={`px-3 py-1.5 rounded-[6px] transition-all flex items-center space-x-1 cursor-pointer ${
            activeArtifactTab === 'video' ? 'bg-amber-700 text-amber-50 font-bold border border-amber-600' : 'text-stone-400 hover:text-stone-100'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>{t('reports.tabRecording')}</span>
        </button>
        <button
          onClick={() => setActiveArtifactTab('network')}
          className={`px-3 py-1.5 rounded-[6px] transition-all flex items-center space-x-1 cursor-pointer ${
            activeArtifactTab === 'network' ? 'bg-amber-700 text-amber-50 font-bold border border-amber-600' : 'text-stone-400 hover:text-stone-100'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>{t('reports.tabHarNetwork')}</span>
        </button>
      </div>

      {/* Artifact Tab Content */}
      <div className="bg-stone-900 p-4 rounded-[6px] border border-stone-800 flex-1">
        {activeArtifactTab === 'summary' ? (
          <div className="space-y-3">
            {/* View Mode Toggle: List vs Flamechart */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <span className="text-[11px] font-bold text-stone-400">
                {summaryViewMode === 'list'
                  ? t('reports.tabBreakdown')
                  : t('reports.flamechart.title')}
              </span>
              <div className="flex items-center bg-stone-950 p-0.5 rounded-[6px] border border-stone-800 space-x-1">
                <button
                  type="button"
                  onClick={() => setSummaryViewMode('list')}
                  className={`px-2 py-1 rounded-[4px] text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                    summaryViewMode === 'list'
                      ? 'bg-amber-700 text-amber-50 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  aria-label={t('reports.flamechart.viewSteps')}
                >
                  <List className="w-3 h-3" />
                  <span>{t('reports.flamechart.viewSteps')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryViewMode('flamechart')}
                  className={`px-2 py-1 rounded-[4px] text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                    summaryViewMode === 'flamechart'
                      ? 'bg-amber-700 text-amber-50 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  aria-label={t('reports.flamechart.viewFlamechart')}
                >
                  <Activity className="w-3 h-3" />
                  <span>{t('reports.flamechart.viewFlamechart')}</span>
                </button>
              </div>
            </div>

            {summaryViewMode === 'flamechart' ? (
              <LatencyFlamechart result={lastResult} />
            ) : (
              <div className="space-y-2 font-mono">
                {lastResult.steps.map((step, idx) => (
                  <div key={idx} className="p-2.5 bg-stone-950 rounded-[6px] border border-stone-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-stone-500 w-4">{idx + 1}.</span>
                        <span className="font-bold text-amber-400">{step.command}</span>
                        <span className="text-stone-300 truncate max-w-xs">{typeof step.target === 'string' ? step.target : JSON.stringify(step.target)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {step.healResult?.healed && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                            <Zap className="w-3 h-3 fill-current" />
                            <span>{t('studio.healedBadge')}</span>
                            <span className="text-emerald-300">
                              {Math.round(step.healResult.confidence * 100)}%
                            </span>
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase ${step.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {step.status}
                        </span>
                      </div>
                    </div>

                    {step.healResult?.healed && (
                      <div className="p-2 bg-stone-900 rounded border border-amber-800/40 text-[10px] space-y-1">
                        <div className="text-stone-400 font-sans font-bold flex items-center justify-between">
                          <span>{t('reports.healDetails')}: {step.healResult.strategy}</span>
                          {step.healResult.artifacts?.screenshotPath && (
                            <span className="text-stone-500 text-[9px] truncate max-w-xs">
                              {step.healResult.artifacts.screenshotPath}
                            </span>
                          )}
                        </div>
                        <div className="text-rose-400 line-through truncate">
                          - {step.healResult.originalSelector}
                        </div>
                        <div className="text-emerald-400 font-bold truncate">
                          + {step.healResult.healedSelector}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeArtifactTab === 'screenshots' ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-full h-48 bg-stone-950 rounded-[6px] border border-stone-800 flex items-center justify-center text-stone-500 font-mono">
              {t('reports.screenshotPlaceholder')}
            </div>
            <p className="text-stone-400 text-xs">
              {t('reports.screenshotPathNotice', { path: './test-results/screenshots/' })}
            </p>
          </div>
        ) : activeArtifactTab === 'video' ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-full h-48 bg-stone-950 rounded-[6px] border border-stone-800 flex items-center justify-center text-stone-500 font-mono">
              {t('reports.videoPlaceholder')}
            </div>
            <p className="text-stone-400 text-xs">
              {t('reports.videoPathNotice', { path: './test-results/video.webm' })}
            </p>
          </div>
        ) : (
          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2 bg-stone-950 rounded-[6px] border border-stone-800 flex justify-between text-stone-300">
              <span className="text-emerald-400 font-bold">GET /products</span>
              <span>200 OK (14ms)</span>
            </div>
            <div className="p-2 bg-stone-950 rounded-[6px] border border-stone-800 flex justify-between text-stone-300">
              <span className="text-emerald-400 font-bold">POST /api/checkout/apply-coupon</span>
              <span>200 OK (42ms)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
