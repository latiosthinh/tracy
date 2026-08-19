import React, { useState } from 'react';
import {
  Play,
  Square,
  Layers,
  AlertTriangle,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { useCrawlerStore } from '@/src/stores/crawlerStore';
import { useProjectStore } from '@/src/stores/projectStore';
import { useTranslation } from '@/src/hooks/useTranslation';

export const CrawlerControlOverlay: React.FC = () => {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.getActiveProject());
  const isCrawling = useCrawlerStore((s) => s.isCrawling);
  const progress = useCrawlerStore((s) => s.progress);
  const error = useCrawlerStore((s) => s.error);
  const startCrawl = useCrawlerStore((s) => s.startCrawl);
  const stopCrawl = useCrawlerStore((s) => s.stopCrawl);

  const [targetUrl, setTargetUrl] = useState<string>(activeProject?.targetUrl || 'http://localhost:3000');
  const [maxPages, setMaxPages] = useState<number>(25);
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [originBoundary, setOriginBoundary] = useState<boolean>(true);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim() || isCrawling) return;
    await startCrawl(targetUrl.trim(), {
      maxPages,
      maxDepth,
      originBoundary,
    });
  };

  const handleStop = async () => {
    await stopCrawl();
  };

  return (
    <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
      <div className="bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-lg p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2.5 pointer-events-auto font-mono text-xs">
        {!isCrawling ? (
          <form onSubmit={handleStart} className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center space-x-1.5 bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 flex-1 min-w-[200px]">
              <Globe className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
              <input
                type="url"
                required
                aria-label={t('visualizer.quickFilterPlaceholder')}
                placeholder="http://localhost:3000"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="bg-transparent text-stone-200 focus:outline-none w-full text-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                showConfig
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
              title={t('visualizer.crawlSettings')}
              aria-label={t('visualizer.crawlSettings')}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-amber-50 rounded font-bold flex items-center space-x-1.5 shadow transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>{t('visualizer.startCrawl')}</span>
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
              </span>

              <div className="flex items-center space-x-2 truncate">
                <span className="font-semibold text-cyan-400">
                  {progress?.phase ? t(`crawler.phase${progress.phase.charAt(0).toUpperCase() + progress.phase.slice(1)}`) : t('visualizer.crawling')}
                </span>
                {progress?.currentUrl && (
                  <span className="text-stone-400 truncate max-w-[280px]" title={progress.currentUrl}>
                    {progress.currentUrl}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 text-[11px] text-stone-400">
              <span className="flex items-center space-x-1 bg-stone-950 border border-stone-800 px-2 py-0.5 rounded">
                <Layers className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                <span>
                  {t('crawler.queueProgress', {
                    queue: progress?.queueLength ?? 0,
                    visited: progress?.totalVisited ?? 0,
                    discovered: progress?.totalDiscovered ?? 0,
                  }) || `Visited: ${progress?.totalVisited ?? 0} / ${progress?.totalDiscovered ?? 0}`}
                </span>
              </span>

              <button
                type="button"
                onClick={handleStop}
                className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/80 text-red-300 rounded font-bold flex items-center space-x-1 transition-all cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" aria-hidden="true" />
                <span>{t('visualizer.stopCrawl')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showConfig && !isCrawling && (
        <div className="bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-lg p-3 shadow-xl pointer-events-auto font-mono text-xs flex flex-wrap gap-4 text-stone-300">
          <div className="flex items-center space-x-2">
            <label htmlFor="maxPagesInput" className="text-stone-400">{t('visualizer.maxPagesLabel')}</label>
            <input
              id="maxPagesInput"
              type="number"
              min={1}
              max={200}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="bg-stone-950 border border-stone-800 rounded px-2 py-1 w-16 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="maxDepthInput" className="text-stone-400">{t('visualizer.maxDepthLabel')}</label>
            <input
              id="maxDepthInput"
              type="number"
              min={1}
              max={10}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="bg-stone-950 border border-stone-800 rounded px-2 py-1 w-16 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={originBoundary}
              onChange={(e) => setOriginBoundary(e.target.checked)}
              className="rounded bg-stone-950 border-stone-800 text-amber-500 focus:ring-0"
            />
            <span>{t('visualizer.constrainToOrigin')}</span>
          </label>
        </div>
      )}

      {error && (
        <div className="bg-red-950/90 border border-red-500/80 rounded-lg p-2 shadow-lg flex items-center space-x-2 text-red-300 font-mono text-xs pointer-events-auto">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
