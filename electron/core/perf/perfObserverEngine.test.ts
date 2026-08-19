import { describe, it, expect, vi } from 'vitest';
import {
  parseThresholdExpression,
  classifyMetricRating,
  evaluatePerformanceAssertion,
  PerfObserverEngine,
} from './perfObserverEngine';
import { ThrottlingManager, THROTTLING_PRESETS } from './throttlingManager';
import { extractNavigationTimingMetrics, PERF_OBSERVER_INIT_SCRIPT } from './injectedObserver';
import type { WebVitalsMetrics } from './types';

describe('PerfObserverEngine & Threshold Evaluator', () => {
  describe('parseThresholdExpression', () => {
    it('parses numeric values with default <= operator', () => {
      expect(parseThresholdExpression(2500)).toEqual({
        operator: '<=',
        value: 2500,
        unit: '',
      });
      expect(parseThresholdExpression(0.1)).toEqual({
        operator: '<=',
        value: 0.1,
        unit: '',
      });
    });

    it('parses comparison operators and millisecond units', () => {
      expect(parseThresholdExpression('< 2500ms')).toEqual({
        operator: '<',
        value: 2500,
        unit: 'ms',
      });
      expect(parseThresholdExpression('<= 100ms')).toEqual({
        operator: '<=',
        value: 100,
        unit: 'ms',
      });
      expect(parseThresholdExpression('> 50ms')).toEqual({
        operator: '>',
        value: 50,
        unit: 'ms',
      });
      expect(parseThresholdExpression('>= 1000ms')).toEqual({
        operator: '>=',
        value: 1000,
        unit: 'ms',
      });
    });

    it('converts second units to milliseconds', () => {
      expect(parseThresholdExpression('<= 2.5s')).toEqual({
        operator: '<=',
        value: 2500,
        unit: 's',
      });
      expect(parseThresholdExpression('< 0.8sec')).toEqual({
        operator: '<',
        value: 800,
        unit: 'sec',
      });
    });

    it('handles unitless decimals and exact equality operators', () => {
      expect(parseThresholdExpression('<= 0.1')).toEqual({
        operator: '<=',
        value: 0.1,
        unit: '',
      });
      expect(parseThresholdExpression('== 100')).toEqual({
        operator: '==',
        value: 100,
        unit: '',
      });
    });
  });

  describe('classifyMetricRating', () => {
    it('classifies LCP correctly', () => {
      expect(classifyMetricRating('lcp', 2000)).toBe('good');
      expect(classifyMetricRating('lcp', 3500)).toBe('needs-improvement');
      expect(classifyMetricRating('lcp', 4500)).toBe('poor');
    });

    it('classifies CLS correctly', () => {
      expect(classifyMetricRating('cls', 0.05)).toBe('good');
      expect(classifyMetricRating('cls', 0.15)).toBe('needs-improvement');
      expect(classifyMetricRating('cls', 0.3)).toBe('poor');
    });

    it('classifies INP correctly', () => {
      expect(classifyMetricRating('inp', 150)).toBe('good');
      expect(classifyMetricRating('inp', 350)).toBe('needs-improvement');
      expect(classifyMetricRating('inp', 600)).toBe('poor');
    });
  });

  describe('evaluatePerformanceAssertion', () => {
    const sampleMetrics: WebVitalsMetrics = {
      lcp: 1800,
      cls: 0.05,
      inp: 120,
      fcp: 900,
      ttfb: 200,
      domContentLoaded: 950,
      loadTime: 1850,
      domNodes: 450,
      timestamp: Date.now(),
      syntheticFallback: false,
      browserEngine: 'chromium',
    };

    it('passes when all metrics meet budget rules', () => {
      const budget = {
        lcp: '<= 2500ms',
        cls: '<= 0.1',
        inp: '<= 200ms',
        ttfb: '<= 800ms',
      };

      const result = evaluatePerformanceAssertion(sampleMetrics, budget);
      expect(result.passed).toBe(true);
      expect(result.failedAssertions).toHaveLength(0);
      expect(result.assertions).toHaveLength(4);
    });

    it('fails when one or more metrics exceed budget', () => {
      const budget = {
        lcp: '< 1500ms', // actual is 1800 -> fails
        cls: '<= 0.1', // actual is 0.05 -> passes
      };

      const result = evaluatePerformanceAssertion(sampleMetrics, budget);
      expect(result.passed).toBe(false);
      expect(result.failedAssertions).toHaveLength(1);
      expect(result.failedAssertions[0].metric).toBe('lcp');
      expect(result.summary).toContain('Performance assertions failed: LCP: 1800ms');
    });

    it('supports warnOnly flag', () => {
      const budget = {
        lcp: '< 1000ms',
      };

      const result = evaluatePerformanceAssertion(sampleMetrics, budget, true);
      expect(result.passed).toBe(false);
      expect(result.warnOnly).toBe(true);
    });
  });

  describe('injectedObserver & fallback extraction', () => {
    it('contains valid script string for page.addInitScript', () => {
      expect(PERF_OBSERVER_INIT_SCRIPT).toContain('__tracyPerfAttached');
      expect(PERF_OBSERVER_INIT_SCRIPT).toContain('__tracyGetMetrics');
      expect(PERF_OBSERVER_INIT_SCRIPT).toContain('largest-contentful-paint');
    });

    it('extracts fallback navigation timing from performance entries', () => {
      const mockNavEntry = {
        startTime: 0,
        fetchStart: 10,
        requestStart: 20,
        responseStart: 150,
        responseEnd: 200,
        domContentLoadedEventEnd: 800,
        loadEventEnd: 1500,
      } as unknown as PerformanceNavigationTiming;

      const fallback = extractNavigationTimingMetrics(mockNavEntry, 'webkit');
      expect(fallback.syntheticFallback).toBe(true);
      expect(fallback.browserEngine).toBe('webkit');
      expect(fallback.ttfb).toBe(130);
      expect(fallback.domContentLoaded).toBe(800);
      expect(fallback.loadTime).toBe(1500);
    });
  });

  describe('ThrottlingManager', () => {
    it('defines standard slow3g, fast3g, and offline presets', () => {
      expect(THROTTLING_PRESETS.slow3g.latency).toBe(400);
      expect(THROTTLING_PRESETS.fast3g.latency).toBe(150);
      expect(THROTTLING_PRESETS.offline.offline).toBe(true);
    });

    it('safely skips CDP commands on Firefox and WebKit without throwing', async () => {
      const manager = new ThrottlingManager();
      const mockPage: any = {};

      const appliedFirefox = await manager.applyThrottling(mockPage, 'slow3g', 'firefox');
      expect(appliedFirefox).toBe(false);

      const appliedWebKit = await manager.applyThrottling(mockPage, 'fast3g', 'webkit');
      expect(appliedWebKit).toBe(false);
    });

    it('invokes CDP commands on Chromium', async () => {
      const manager = new ThrottlingManager();
      const mockSend = vi.fn().mockResolvedValue({});
      const mockCDPSession = { send: mockSend };
      const mockPage: any = {
        context: () => ({
          newCDPSession: vi.fn().mockResolvedValue(mockCDPSession),
        }),
      };

      const applied = await manager.applyThrottling(
        mockPage,
        { preset: 'slow3g', cpuSlowdownRate: 4 },
        'chromium'
      );
      expect(applied).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        'Network.emulateNetworkConditions',
        expect.objectContaining({ latency: 400, offline: false })
      );
      expect(mockSend).toHaveBeenCalledWith('Emulation.setCPUThrottlingRate', { rate: 4 });

      await manager.clearThrottling(mockPage, 'chromium');
      expect(mockSend).toHaveBeenCalledWith(
        'Network.emulateNetworkConditions',
        expect.objectContaining({ latency: 0, offline: false })
      );
    });
  });

  describe('PerfObserverEngine class', () => {
    it('attaches init script to browser context', async () => {
      const engine = new PerfObserverEngine();
      const addInitScript = vi.fn().mockResolvedValue(undefined);
      const mockContext: any = { addInitScript };

      await engine.attachToContext(mockContext, 'chromium');
      expect(addInitScript).toHaveBeenCalledWith({ content: PERF_OBSERVER_INIT_SCRIPT });
    });

    it('harvests metrics and handles Chromium CDP performance query', async () => {
      const engine = new PerfObserverEngine();
      const mockEvaluate = vi.fn().mockImplementation((fn: any) => {
        // First evaluate call is visibilitychange flush, second is __tracyGetMetrics
        return Promise.resolve({
          lcp: 1200,
          cls: 0.01,
          inp: 40,
          fcp: 600,
          ttfb: 150,
          domContentLoaded: 650,
          loadTime: 1250,
          domNodes: 300,
          timestamp: 1000,
          syntheticFallback: false,
        });
      });

      const mockSend = vi.fn().mockImplementation((cmd) => {
        if (cmd === 'Performance.getMetrics') {
          return Promise.resolve({
            metrics: [{ name: 'JSHeapUsedSize', value: 10485760 }],
          });
        }
        return Promise.resolve({});
      });

      const mockPage: any = {
        evaluate: mockEvaluate,
        context: () => ({
          newCDPSession: vi.fn().mockResolvedValue({ send: mockSend }),
        }),
      };

      const metrics = await engine.harvestMetrics(mockPage, 'chromium');
      expect(metrics.lcp).toBe(1200);
      expect(metrics.jsHeapSize).toBe(10485760);
      expect(metrics.browserEngine).toBe('chromium');
    });
  });
});
