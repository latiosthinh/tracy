import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  WebVitalsMetrics,
  MetricRating,
  PerformanceAssertionSummary,
  ThrottlingPreset,
  PerfStoreState,
} from '@/src/types/perf';

/**
 * Classifies Core Web Vitals and standard performance metrics against industry thresholds.
 */
export function classifyMetric(name: string, value: number): MetricRating {
  if (value === undefined || value === null || isNaN(value)) {
    return 'needs-improvement';
  }

  const key = name.toLowerCase();

  switch (key) {
    case 'lcp': // <= 2500ms good, <= 4000ms needs-improvement
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'cls': // <= 0.1 good, <= 0.25 needs-improvement
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'inp': // <= 200ms good, <= 500ms needs-improvement
      return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    case 'fcp': // <= 1800ms good, <= 3000ms needs-improvement
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    case 'ttfb': // <= 800ms good, <= 1800ms needs-improvement
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    case 'domcontentloaded': // <= 1500ms good, <= 3000ms needs-improvement
      return value <= 1500 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    case 'loadtime': // <= 3000ms good, <= 6000ms needs-improvement
      return value <= 3000 ? 'good' : value <= 6000 ? 'needs-improvement' : 'poor';
    default:
      return 'good';
  }
}

export function computeRatings(metrics: WebVitalsMetrics): Record<string, MetricRating> {
  const ratings: Record<string, MetricRating> = {};
  if (metrics.lcp !== undefined) ratings.lcp = classifyMetric('lcp', metrics.lcp);
  if (metrics.cls !== undefined) ratings.cls = classifyMetric('cls', metrics.cls);
  if (metrics.inp !== undefined) ratings.inp = classifyMetric('inp', metrics.inp);
  if (metrics.fcp !== undefined) ratings.fcp = classifyMetric('fcp', metrics.fcp);
  if (metrics.ttfb !== undefined) ratings.ttfb = classifyMetric('ttfb', metrics.ttfb);
  if (metrics.domContentLoaded !== undefined) ratings.domContentLoaded = classifyMetric('domContentLoaded', metrics.domContentLoaded);
  if (metrics.loadTime !== undefined) ratings.loadTime = classifyMetric('loadTime', metrics.loadTime);
  return ratings;
}

export const usePerfStore = create<PerfStoreState>()(
  immer((set) => ({
    activeMetrics: null,
    activeRatings: {},
    assertions: [],
    activeThrottling: 'none',
    cpuSlowdownRate: 1,
    isRecording: false,
    metricHistory: [],

    ingestMetrics: (metrics: WebVitalsMetrics) => {
      const timestamp = metrics.timestamp || Date.now();
      const ratings = computeRatings(metrics);

      set((state) => {
        state.activeMetrics = { ...metrics, timestamp };
        state.activeRatings = ratings;
        state.metricHistory.push({ timestamp, metrics: { ...metrics, timestamp } });

        // Keep maximum 100 historical telemetry snapshots
        if (state.metricHistory.length > 100) {
          state.metricHistory = state.metricHistory.slice(state.metricHistory.length - 100);
        }
      });
    },

    setAssertions: (assertions: PerformanceAssertionSummary[]) => {
      set((state) => {
        state.assertions = assertions.map((a) => ({
          ...a,
          rating: a.rating || classifyMetric(String(a.metric), a.actual),
        }));
      });
    },

    setThrottlingPreset: (preset: ThrottlingPreset) => {
      set((state) => {
        state.activeThrottling = preset;
        if (preset === 'slow3g') {
          state.cpuSlowdownRate = 4;
        } else if (preset === 'fast3g') {
          state.cpuSlowdownRate = 2;
        } else if (preset === 'none' || preset === 'offline') {
          state.cpuSlowdownRate = 1;
        }
      });
    },

    setCpuSlowdownRate: (rate: number) => {
      set((state) => {
        state.cpuSlowdownRate = Math.max(1, Math.min(20, rate));
      });
    },

    clearMetrics: () => {
      set((state) => {
        state.activeMetrics = null;
        state.activeRatings = {};
        state.assertions = [];
        state.metricHistory = [];
      });
    },

    toggleRecording: (recording?: boolean) => {
      set((state) => {
        state.isRecording = recording !== undefined ? recording : !state.isRecording;
      });
    },
  }))
);
