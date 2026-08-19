import React from 'react';
import { Gauge, Activity, Clock, Zap } from 'lucide-react';
import { MetricGauge } from '@/src/components/perf/MetricGauge';
import type { WebVitalsMetrics, MetricRating } from '@/src/types/perf';
import { useTranslation } from '@/src/hooks/useTranslation';

interface WebVitalsScorecardProps {
  metrics?: WebVitalsMetrics | null;
  ratings?: Record<string, MetricRating>;
}

export const WebVitalsScorecard: React.FC<WebVitalsScorecardProps> = ({
  metrics,
  ratings = {},
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="flex items-center space-x-2">
        <Gauge className="w-4 h-4 text-amber-400" aria-hidden="true" />
        <h3 className="font-bold text-stone-200 text-xs uppercase tracking-wider font-mono">
          {t('perf.cwvScorecard')}
        </h3>
      </div>

      {/* 5 Core Web Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* LCP */}
        <MetricGauge
          name="Largest Contentful Paint"
          shortName="LCP"
          value={metrics?.lcp}
          unit="ms"
          rating={ratings.lcp || 'good'}
          goodThreshold="≤ 2.5s"
          poorThreshold="> 4.0s"
          description="Measures perceived loading speed. Marks point when main page content is likely loaded."
        />

        {/* CLS */}
        <MetricGauge
          name="Cumulative Layout Shift"
          shortName="CLS"
          value={metrics?.cls}
          unit="score"
          rating={ratings.cls || 'good'}
          goodThreshold="≤ 0.10"
          poorThreshold="> 0.25"
          description="Measures visual stability. Quantifies unexpected layout shifts during page interaction."
        />

        {/* INP */}
        <MetricGauge
          name="Interaction to Next Paint"
          shortName="INP"
          value={metrics?.inp}
          unit="ms"
          rating={ratings.inp || 'good'}
          goodThreshold="≤ 200ms"
          poorThreshold="> 500ms"
          description="Measures overall UI responsiveness to user clicks, taps, and keyboard inputs."
        />

        {/* FCP */}
        <MetricGauge
          name="First Contentful Paint"
          shortName="FCP"
          value={metrics?.fcp}
          unit="ms"
          rating={ratings.fcp || 'good'}
          goodThreshold="≤ 1.8s"
          poorThreshold="> 3.0s"
          description="Measures time from navigation start until browser renders first DOM text/image."
        />

        {/* TTFB */}
        <MetricGauge
          name="Time to First Byte"
          shortName="TTFB"
          value={metrics?.ttfb}
          unit="ms"
          rating={ratings.ttfb || 'good'}
          goodThreshold="≤ 800ms"
          poorThreshold="> 1800ms"
          description="Measures server responsiveness and network latency before first byte reception."
        />
      </div>

      {/* Secondary Web Navigation Timing Metrics */}
      {metrics && (metrics.domContentLoaded !== undefined || metrics.loadTime !== undefined) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {metrics.domContentLoaded !== undefined && (
            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 font-mono">
              <div className="flex items-center space-x-1.5 text-stone-400 text-[10px] font-sans">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('perf.domContentLoaded')}</span>
              </div>
              <div className="text-base font-bold text-stone-100 mt-1">
                {Math.round(metrics.domContentLoaded)} ms
              </div>
            </div>
          )}

          {metrics.loadTime !== undefined && (
            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 font-mono">
              <div className="flex items-center space-x-1.5 text-stone-400 text-[10px] font-sans">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('perf.windowLoad')}</span>
              </div>
              <div className="text-base font-bold text-stone-100 mt-1">
                {Math.round(metrics.loadTime)} ms
              </div>
            </div>
          )}

          {metrics.jsHeapUsedSize !== undefined && (
            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 font-mono">
              <div className="flex items-center space-x-1.5 text-stone-400 text-[10px] font-sans">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('perf.jsHeap')}</span>
              </div>
              <div className="text-base font-bold text-stone-100 mt-1">
                {(metrics.jsHeapUsedSize / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
