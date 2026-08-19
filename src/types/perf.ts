import type { PerformanceMetricKey, ThrottlingPreset as FlowThrottlingPreset } from '@/src/types/flow';

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
  jsHeapUsedSize?: number;
  navigationTiming?: {
    dnsMs?: number;
    tcpMs?: number;
    requestMs?: number;
    responseMs?: number;
    domProcessingMs?: number;
    loadEventMs?: number;
  };
  timestamp?: number;
  syntheticFallback?: boolean;
  browserEngine?: 'chromium' | 'firefox' | 'webkit';
}

export type MetricRating = 'good' | 'needs-improvement' | 'poor';

export interface PerformanceAssertionSummary {
  metric: string | PerformanceMetricKey;
  actual: number;
  expected: string;
  passed: boolean;
  warningOnly?: boolean;
  unit?: string;
  rating?: MetricRating;
  message?: string;
}

export type ThrottlingPreset = FlowThrottlingPreset | 'custom';

export interface ThrottlingConfig {
  preset?: ThrottlingPreset;
  latencyMs?: number;
  downloadKbps?: number;
  uploadKbps?: number;
  cpuSlowdownRate?: number;
  offline?: boolean;
}

export interface MetricHistoryItem {
  timestamp: number;
  metrics: WebVitalsMetrics;
}

export interface PerfStoreState {
  activeMetrics: WebVitalsMetrics | null;
  activeRatings: Record<string, MetricRating>;
  assertions: PerformanceAssertionSummary[];
  activeThrottling: ThrottlingPreset;
  cpuSlowdownRate: number;
  isRecording: boolean;
  metricHistory: MetricHistoryItem[];

  // Actions
  ingestMetrics: (metrics: WebVitalsMetrics) => void;
  setAssertions: (assertions: PerformanceAssertionSummary[]) => void;
  setThrottlingPreset: (preset: ThrottlingPreset) => void;
  setCpuSlowdownRate: (rate: number) => void;
  clearMetrics: () => void;
  toggleRecording: (recording?: boolean) => void;
}
