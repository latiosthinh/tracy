import React from 'react';
import {
  Check,
  X,
  Minus,
  Download,
  FileCode,
  Globe,
  Flame,
  Compass,
} from 'lucide-react';
import type {
  MatrixExecutionSummary,
  MatrixBrowserTarget,
} from '@/src/types/matrix';
import { useTranslation } from '@/src/hooks/useTranslation';

interface MatrixResultsGridProps {
  summary: MatrixExecutionSummary;
}

export const MatrixResultsGrid: React.FC<MatrixResultsGridProps> = ({ summary }) => {
  const { t } = useTranslation();

  const browsers: MatrixBrowserTarget[] = (
    Object.keys(summary.browsers || {}) as MatrixBrowserTarget[]
  ).filter((b) => summary.browsers[b]);

  const getEngineIcon = (browser: MatrixBrowserTarget) => {
    switch (browser) {
      case 'chromium': return <Globe className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />;
      case 'firefox': return <Flame className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />;
      case 'webkit': return <Compass className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />;
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrix-${summary.flowId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJunit = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="Matrix-${summary.flowName}">\n`;
    for (const browser of browsers) {
      const worker = summary.browsers[browser];
      xml += `  <testsuite name="${browser}" tests="${worker?.totalSteps || 0}" failures="${worker?.failedCount || 0}" time="${((worker?.durationMs || 0) / 1000).toFixed(2)}">\n`;
      xml += `  </testsuite>\n`;
    }
    xml += `</testsuites>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrix-${summary.flowId}-${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 font-sans text-xs overflow-hidden rounded-lg border border-stone-800">
      {/* Grid Header & Exports */}
      <div className="p-3 border-b border-stone-800 bg-stone-900 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                summary.overallStatus === 'passed'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                  : summary.overallStatus === 'running'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                  : 'bg-rose-950/80 text-rose-300 border-rose-700/80'
              }`}
            >
              {summary.overallStatus}
            </span>
            <h3 className="font-bold text-stone-100 text-sm">{summary.flowName}</h3>
          </div>
          <p className="text-[11px] text-stone-400 font-mono mt-0.5">
            Total Matrix Duration: {(summary.durationMs / 1000).toFixed(2)}s
          </p>
        </div>

        <div className="flex items-center space-x-2 font-sans">
          <button
            type="button"
            onClick={handleExportJson}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-stone-700"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('matrix.exportJson')}</span>
          </button>
          <button
            type="button"
            onClick={handleExportJunit}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-stone-700"
          >
            <FileCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('matrix.junitXml')}</span>
          </button>
        </div>
      </div>

      {/* Cross-Browser Comparison Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse font-mono">
          <thead className="bg-stone-900/90 text-[10px] text-stone-400 uppercase sticky top-0 z-10 border-b border-stone-800">
            <tr>
              <th className="p-3 w-1/3">{t('matrix.browserEngine')}</th>
              <th className="p-3">{t('matrix.status')}</th>
              <th className="p-3 text-center">{t('matrix.passed')}</th>
              <th className="p-3 text-center">{t('matrix.failed')}</th>
              <th className="p-3 text-right">{t('matrix.duration')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/80 text-[11px]">
            {browsers.map((browser) => {
              const worker = summary.browsers[browser];
              if (!worker) return null;

              return (
                <tr key={browser} className="hover:bg-stone-900/60 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center space-x-2 font-sans">
                      {getEngineIcon(browser)}
                      <span className="font-bold text-stone-100 capitalize">{browser}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        worker.status === 'passed'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : worker.status === 'failed'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}
                    >
                      {worker.status}
                    </span>
                  </td>
                  <td className="p-3 text-center text-emerald-400 font-bold">
                    <div className="flex items-center justify-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>{worker.passedCount}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-rose-400 font-bold">
                    <div className="flex items-center justify-center space-x-1">
                      {worker.failedCount > 0 ? (
                        <>
                          <X className="w-3 h-3" />
                          <span>{worker.failedCount}</span>
                        </>
                      ) : (
                        <Minus className="w-3 h-3 text-stone-600" />
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right text-stone-300">
                    {((worker.durationMs || 0) / 1000).toFixed(2)}s
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
