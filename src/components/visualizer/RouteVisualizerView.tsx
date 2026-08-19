import React, { useEffect, useMemo } from 'react';
import { RouteCanvas } from './RouteCanvas';
import { CrawlerControlOverlay } from './CrawlerControlOverlay';
import { NodeActionModal } from './NodeActionModal';
import { useCrawlerStore } from '@/src/stores/crawlerStore';
import { useProjectStore } from '@/src/stores/projectStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Sparkles, Network } from 'lucide-react';

export const RouteVisualizerView: React.FC = () => {
  const { t } = useTranslation();
  const nodes = useCrawlerStore((s) => s.nodes);
  const isCrawling = useCrawlerStore((s) => s.isCrawling);
  const startCrawl = useCrawlerStore((s) => s.startCrawl);
  const syncCoverageWithFlows = useCrawlerStore((s) => s.syncCoverageWithFlows);

  const activeProject = useProjectStore((s) => s.getActiveProject());
  const projectFlows = useMemo(() => activeProject?.flows || [], [activeProject?.flows]);

  // Sync coverage when project flows update
  useEffect(() => {
    syncCoverageWithFlows(projectFlows);
  }, [projectFlows, syncCoverageWithFlows]);

  const handleStartInitialCrawl = async () => {
    if (activeProject?.targetUrl) {
      await startCrawl(activeProject.targetUrl, {
        maxPages: 25,
        maxDepth: 3,
        originBoundary: true,
      });
    }
  };

  return (
    <div className="w-full h-full bg-stone-950 flex flex-col relative overflow-hidden">
      {/* Canvas */}
      <div className="flex-1 w-full h-full relative">
        <RouteCanvas />
        <CrawlerControlOverlay />
        <NodeActionModal />

        {/* Empty State Guide */}
        {nodes.length === 0 && !isCrawling && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
            <div className="bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-xl p-6 max-w-md shadow-2xl text-center space-y-4 pointer-events-auto font-sans">
              <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-600/80 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
                <Network className="w-6 h-6" aria-hidden="true" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-100">
                  {t('visualizer.title')}
                </h3>
                <p className="text-xs text-stone-400">
                  {t('visualizer.subtitle')}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartInitialCrawl}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-amber-50 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 mx-auto shadow-lg transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>{t('visualizer.startCrawl')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
