import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WebVitalsScorecard } from './WebVitalsScorecard';
import { MetricGauge } from './MetricGauge';
import { PerfProfilerPanel } from './PerfProfilerPanel';
import { usePerfStore } from '@/src/stores/perfStore';

describe('Performance Profiler & Core Web Vitals Components', () => {
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

  it('renders MetricGauge with values, units, thresholds, and rating badges', () => {
    render(
      <MetricGauge
        name="Largest Contentful Paint"
        shortName="LCP"
        value={1850}
        unit="ms"
        rating="good"
        goodThreshold="≤ 2.5s"
        poorThreshold="> 4.0s"
        description="Measures perceived loading speed."
      />
    );

    expect(screen.getByText('LCP')).toBeInTheDocument();
    expect(screen.getByText('1850 ms')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Good: ≤ 2.5s')).toBeInTheDocument();
    expect(screen.getByText('Poor: > 4.0s')).toBeInTheDocument();
  });

  it('renders all 5 Core Web Vitals in WebVitalsScorecard', () => {
    render(
      <WebVitalsScorecard
        metrics={{
          lcp: 2100,
          cls: 0.04,
          inp: 120,
          fcp: 900,
          ttfb: 180,
          domContentLoaded: 450,
          loadTime: 890,
          timestamp: Date.now(),
        }}
        ratings={{
          lcp: 'good',
          cls: 'good',
          inp: 'good',
          fcp: 'good',
          ttfb: 'good',
        }}
      />
    );

    expect(screen.getByText('LCP')).toBeInTheDocument();
    expect(screen.getByText('CLS')).toBeInTheDocument();
    expect(screen.getByText('INP')).toBeInTheDocument();
    expect(screen.getByText('FCP')).toBeInTheDocument();
    expect(screen.getByText('TTFB')).toBeInTheDocument();
    expect(screen.getByText('DOMContentLoaded')).toBeInTheDocument();
    expect(screen.getByText('Window Load')).toBeInTheDocument();
  });

  it('renders PerfProfilerPanel with throttling dropdowns and performance assertions', () => {
    usePerfStore.setState({
      activeMetrics: {
        lcp: 3100,
        cls: 0.15,
        inp: 350,
        fcp: 2100,
        ttfb: 900,
        timestamp: Date.now(),
      },
      activeRatings: {
        lcp: 'needs-improvement',
        cls: 'needs-improvement',
        inp: 'needs-improvement',
        fcp: 'needs-improvement',
        ttfb: 'needs-improvement',
      },
      assertions: [
        {
          metric: 'lcp',
          expected: '2500',
          actual: 3100,
          passed: false,
          rating: 'needs-improvement',
        },
      ],
    });

    render(<PerfProfilerPanel />);

    expect(screen.getByText('Core Web Vitals & Performance Profiler')).toBeInTheDocument();
    expect(screen.getByText('Performance Assertions (1)')).toBeInTheDocument();
    expect(screen.getByText('≤ 2500 ms')).toBeInTheDocument();
    expect(screen.getAllByText('3100 ms').length).toBeGreaterThan(0);
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });
});
