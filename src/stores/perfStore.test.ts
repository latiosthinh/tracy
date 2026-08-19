import { describe, it, expect, beforeEach } from 'vitest';
import { usePerfStore, classifyMetric } from './perfStore';
import type { WebVitalsMetrics, PerformanceAssertionSummary } from '@/src/types/perf';

describe('usePerfStore and classifyMetric', () => {
  beforeEach(() => {
    usePerfStore.setState({
      activeMetrics: null,
      activeRatings: {},
      assertions: [],
      activeThrottling: 'none',
      cpuSlowdownRate: 1,
      isRecording: false,
      metricHistory: [],
    });
  });

  describe('classifyMetric thresholds', () => {
    it('evaluates LCP thresholds correctly', () => {
      expect(classifyMetric('lcp', 1500)).toBe('good');
      expect(classifyMetric('lcp', 2500)).toBe('good');
      expect(classifyMetric('lcp', 2501)).toBe('needs-improvement');
      expect(classifyMetric('lcp', 4000)).toBe('needs-improvement');
      expect(classifyMetric('lcp', 4001)).toBe('poor');
    });

    it('evaluates CLS thresholds correctly', () => {
      expect(classifyMetric('cls', 0.05)).toBe('good');
      expect(classifyMetric('cls', 0.1)).toBe('good');
      expect(classifyMetric('cls', 0.15)).toBe('needs-improvement');
      expect(classifyMetric('cls', 0.25)).toBe('needs-improvement');
      expect(classifyMetric('cls', 0.26)).toBe('poor');
    });

    it('evaluates INP thresholds correctly', () => {
      expect(classifyMetric('inp', 150)).toBe('good');
      expect(classifyMetric('inp', 200)).toBe('good');
      expect(classifyMetric('inp', 250)).toBe('needs-improvement');
      expect(classifyMetric('inp', 500)).toBe('needs-improvement');
      expect(classifyMetric('inp', 501)).toBe('poor');
    });

    it('evaluates FCP thresholds correctly', () => {
      expect(classifyMetric('fcp', 1200)).toBe('good');
      expect(classifyMetric('fcp', 1800)).toBe('good');
      expect(classifyMetric('fcp', 2000)).toBe('needs-improvement');
      expect(classifyMetric('fcp', 3000)).toBe('needs-improvement');
      expect(classifyMetric('fcp', 3001)).toBe('poor');
    });

    it('evaluates TTFB thresholds correctly', () => {
      expect(classifyMetric('ttfb', 400)).toBe('good');
      expect(classifyMetric('ttfb', 800)).toBe('good');
      expect(classifyMetric('ttfb', 1000)).toBe('needs-improvement');
      expect(classifyMetric('ttfb', 1800)).toBe('needs-improvement');
      expect(classifyMetric('ttfb', 1801)).toBe('poor');
    });
  });

  describe('usePerfStore actions', () => {
    it('ingests metrics, computes ratings, and appends to history', () => {
      const sample: WebVitalsMetrics = {
        lcp: 2100,
        cls: 0.04,
        inp: 120,
        fcp: 900,
        ttfb: 350,
        domContentLoaded: 1100,
        loadTime: 2400,
        syntheticFallback: false,
        browserEngine: 'chromium',
      };

      usePerfStore.getState().ingestMetrics(sample);

      const state = usePerfStore.getState();
      expect(state.activeMetrics?.lcp).toBe(2100);
      expect(state.activeRatings.lcp).toBe('good');
      expect(state.activeRatings.cls).toBe('good');
      expect(state.activeRatings.inp).toBe('good');
      expect(state.metricHistory).toHaveLength(1);
      expect(state.metricHistory[0].metrics.lcp).toBe(2100);
    });

    it('sets assertions with ratings and updates store', () => {
      const assertions: PerformanceAssertionSummary[] = [
        { metric: 'lcp', actual: 4200, expected: '<= 2500ms', passed: false },
        { metric: 'cls', actual: 0.02, expected: '<= 0.1', passed: true },
      ];

      usePerfStore.getState().setAssertions(assertions);
      const state = usePerfStore.getState();
      expect(state.assertions).toHaveLength(2);
      expect(state.assertions[0].passed).toBe(false);
      expect(state.assertions[0].rating).toBe('poor');
      expect(state.assertions[1].passed).toBe(true);
      expect(state.assertions[1].rating).toBe('good');
    });

    it('sets throttling presets and auto-configures CPU slowdown rates', () => {
      usePerfStore.getState().setThrottlingPreset('slow3g');
      expect(usePerfStore.getState().activeThrottling).toBe('slow3g');
      expect(usePerfStore.getState().cpuSlowdownRate).toBe(4);

      usePerfStore.getState().setThrottlingPreset('fast3g');
      expect(usePerfStore.getState().activeThrottling).toBe('fast3g');
      expect(usePerfStore.getState().cpuSlowdownRate).toBe(2);

      usePerfStore.getState().setThrottlingPreset('none');
      expect(usePerfStore.getState().activeThrottling).toBe('none');
      expect(usePerfStore.getState().cpuSlowdownRate).toBe(1);
    });

    it('clears metrics and toggles recording state', () => {
      usePerfStore.getState().ingestMetrics({ lcp: 1000 });
      expect(usePerfStore.getState().activeMetrics).not.toBeNull();

      usePerfStore.getState().clearMetrics();
      expect(usePerfStore.getState().activeMetrics).toBeNull();
      expect(usePerfStore.getState().metricHistory).toHaveLength(0);

      usePerfStore.getState().toggleRecording();
      expect(usePerfStore.getState().isRecording).toBe(true);
      usePerfStore.getState().toggleRecording(false);
      expect(usePerfStore.getState().isRecording).toBe(false);
    });
  });
});
