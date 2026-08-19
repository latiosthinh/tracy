import type { PerformanceMetricKey, ThrottlingPreset } from '@/src/types/flow';

export interface WebVitalsMetrics {
  lcp?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  ttfb?: number;
  domContentLoaded?: number;
  loadTime?: number;
  domNodes?: number;
  jsHeapSize?: number;
  navigationTiming?: {
    dnsMs?: number;
    tcpMs?: number;
    requestMs?: number;
    responseMs?: number;
    domProcessingMs?: number;
    loadEventMs?: number;
  };
  timestamp: number;
  syntheticFallback: boolean;
  browserEngine: 'chromium' | 'firefox' | 'webkit';
}

export interface ParsedThreshold {
  operator: '<' | '<=' | '>' | '>=' | '==' | '=';
  value: number;
  unit?: string;
}

export type MetricRating = 'good' | 'needs-improvement' | 'poor';

export interface MetricAssertionDetail {
  metric: PerformanceMetricKey;
  actual: number;
  threshold: number;
  operator: string;
  passed: boolean;
  unit: string;
  rating: MetricRating;
  message?: string;
}

export interface PerformanceAssertionResult {
  passed: boolean;
  warnOnly?: boolean;
  metrics: WebVitalsMetrics;
  assertions: MetricAssertionDetail[];
  failedAssertions: MetricAssertionDetail[];
  summary: string;
}

export interface ThrottlingConfig {
  preset?: ThrottlingPreset;
  latencyMs?: number;
  downloadKbps?: number;
  uploadKbps?: number;
  cpuSlowdownRate?: number; // e.g. 4 for 4x slowdown
  offline?: boolean;
}

export interface PerfEvaluationReport {
  timestamp: number;
  browserEngine: 'chromium' | 'firefox' | 'webkit';
  metrics: WebVitalsMetrics;
  results: PerformanceAssertionResult[];
  overallPassed: boolean;
}
