import type { BrowserContext, Page } from 'playwright';
import type {
  PerformanceBudget,
  PerformanceMetricKey,
  PerformanceAssertionThreshold,
  ThrottlingPreset,
} from '@/src/types/flow';
import type {
  WebVitalsMetrics,
  ParsedThreshold,
  MetricAssertionDetail,
  PerformanceAssertionResult,
  ThrottlingConfig,
  MetricRating,
} from './types';
import { PERF_OBSERVER_INIT_SCRIPT } from './injectedObserver';
import { ThrottlingManager } from './throttlingManager';

/**
 * Parses numeric threshold or expression like "< 2500ms", "<= 0.1", ">= 100", "> 2.5s".
 */
export function parseThresholdExpression(expr: PerformanceAssertionThreshold): ParsedThreshold {
  if (typeof expr === 'number') {
    return {
      operator: '<=',
      value: expr,
      unit: '',
    };
  }

  const trimmed = String(expr).trim();
  // Match operator if present: <, <=, >, >=, ==, =
  const match = trimmed.match(/^([<>!=]=?|=)?\s*([0-9.]+)\s*([a-zA-Z%]*)$/);

  if (!match) {
    const numericOnly = parseFloat(trimmed);
    return {
      operator: '<=',
      value: isNaN(numericOnly) ? 0 : numericOnly,
      unit: '',
    };
  }

  let rawOp = match[1] || '<=';
  if (rawOp === '=') rawOp = '==';
  const numValue = parseFloat(match[2]);
  const rawUnit = match[3] ? match[3].toLowerCase() : '';

  let finalValue = isNaN(numValue) ? 0 : numValue;
  // If unit is seconds ('s' or 'sec'), normalize to milliseconds for time-based metrics
  if (rawUnit === 's' || rawUnit === 'sec') {
    finalValue = finalValue * 1000;
  }

  return {
    operator: rawOp as ParsedThreshold['operator'],
    value: finalValue,
    unit: rawUnit,
  };
}

/**
 * Standard Google Core Web Vitals rating classification.
 */
export function classifyMetricRating(metric: PerformanceMetricKey, value: number): MetricRating {
  switch (metric) {
    case 'lcp':
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'needs-improvement';
      return 'poor';
    case 'cls':
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    case 'inp':
      if (value <= 200) return 'good';
      if (value <= 500) return 'needs-improvement';
      return 'poor';
    case 'fcp':
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';
    case 'ttfb':
      if (value <= 800) return 'good';
      if (value <= 1800) return 'needs-improvement';
      return 'poor';
    default:
      return 'good';
  }
}

/**
 * Evaluates harvested WebVitalsMetrics against a declarative PerformanceBudget.
 */
export function evaluatePerformanceAssertion(
  metrics: WebVitalsMetrics,
  budget: PerformanceBudget,
  warnOnly = false
): PerformanceAssertionResult {
  const assertions: MetricAssertionDetail[] = [];
  const failedAssertions: MetricAssertionDetail[] = [];

  const metricKeys: PerformanceMetricKey[] = [
    'lcp',
    'cls',
    'inp',
    'fcp',
    'ttfb',
    'domContentLoaded',
    'loadTime',
    'domNodes',
    'jsHeapSize',
  ];

  for (const key of metricKeys) {
    const thresholdExpr = budget[key];
    if (thresholdExpr === undefined || thresholdExpr === null) {
      continue;
    }

    const parsed = parseThresholdExpression(thresholdExpr);
    const actual = metrics[key] !== undefined ? (metrics[key] as number) : 0;
    let passed = false;

    switch (parsed.operator) {
      case '<':
        passed = actual < parsed.value;
        break;
      case '<=':
        passed = actual <= parsed.value;
        break;
      case '>':
        passed = actual > parsed.value;
        break;
      case '>=':
        passed = actual >= parsed.value;
        break;
      case '==':
      case '=':
        passed = Math.abs(actual - parsed.value) < 0.0001;
        break;
      default:
        passed = actual <= parsed.value;
    }

    const rating = classifyMetricRating(key, actual);
    const unit = key === 'cls' ? '' : key === 'domNodes' ? 'nodes' : key === 'jsHeapSize' ? 'bytes' : 'ms';

    const detail: MetricAssertionDetail = {
      metric: key,
      actual,
      threshold: parsed.value,
      operator: parsed.operator,
      passed,
      unit,
      rating,
      message: `${key.toUpperCase()}: ${actual}${unit} ${passed ? 'meets' : 'exceeds'} threshold ${parsed.operator} ${parsed.value}${unit} (${rating})`,
    };

    assertions.push(detail);
    if (!passed) {
      failedAssertions.push(detail);
    }
  }

  const passed = failedAssertions.length === 0;
  const summary = passed
    ? `Performance assertions passed (${assertions.length} metrics validated).`
    : `Performance assertions failed: ${failedAssertions.map((f) => `${f.metric.toUpperCase()}: ${f.actual}${f.unit} (expected ${f.operator} ${f.threshold}${f.unit})`).join(', ')}`;

  return {
    passed,
    warnOnly,
    metrics,
    assertions,
    failedAssertions,
    summary,
  };
}

/**
 * Orchestrates script injection, metric extraction, and throttling across Playwright contexts.
 */
export class PerfObserverEngine {
  private throttlingManager = new ThrottlingManager();

  /**
   * Attaches injected performance observer script to BrowserContext.
   */
  async attachToContext(
    context: BrowserContext,
    _browserEngine: 'chromium' | 'firefox' | 'webkit' = 'chromium'
  ): Promise<void> {
    try {
      await context.addInitScript({ content: PERF_OBSERVER_INIT_SCRIPT });
    } catch (e) {
      // ignore init script failure if context closed
    }
  }

  /**
   * Harvests telemetry from the active page.
   * Flushes visibility state and queries CDP Performance metrics if on Chromium.
   */
  async harvestMetrics(
    page: Page,
    browserEngine: 'chromium' | 'firefox' | 'webkit' = 'chromium'
  ): Promise<WebVitalsMetrics> {
    try {
      // Trigger visibilitychange to force final LCP/CLS flush
      await page
        .evaluate(() => {
          try {
            if (typeof document !== 'undefined') {
              Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
              document.dispatchEvent(new Event('visibilitychange'));
            }
          } catch (e) {
            // ignore
          }
        })
        .catch(() => {});

      const inPageMetrics = await page
        .evaluate(() => {
          if (typeof window !== 'undefined' && typeof (window as any).__tracyGetMetrics === 'function') {
            return (window as any).__tracyGetMetrics();
          }
          return null;
        })
        .catch(() => null);

      let jsHeapSize: number | undefined;

      // Extract CDP Performance metrics if available on Chromium
      if (browserEngine === 'chromium') {
        try {
          const session = await page.context().newCDPSession(page);
          await session.send('Performance.enable');
          const perfData = await session.send('Performance.getMetrics');
          const heapMetric = perfData?.metrics?.find((m: any) => m.name === 'JSHeapUsedSize');
          if (heapMetric) {
            jsHeapSize = Math.round(heapMetric.value);
          }
        } catch (e) {
          // Ignore CDP retrieval failures
        }
      }

      if (inPageMetrics) {
        return {
          ...inPageMetrics,
          jsHeapSize: jsHeapSize ?? inPageMetrics.jsHeapSize,
          browserEngine,
          syntheticFallback: browserEngine !== 'chromium' || inPageMetrics.syntheticFallback,
        };
      }
    } catch (err) {
      // Fallback
    }

    return {
      lcp: 0,
      cls: 0,
      inp: 0,
      fcp: 0,
      ttfb: 0,
      domContentLoaded: 0,
      loadTime: 0,
      domNodes: 0,
      jsHeapSize: undefined,
      timestamp: Date.now(),
      syntheticFallback: true,
      browserEngine,
    };
  }

  /**
   * Applies network/CPU throttling.
   */
  async applyThrottling(
    page: Page,
    config: ThrottlingConfig | ThrottlingPreset,
    browserEngine: string = 'chromium'
  ): Promise<boolean> {
    return this.throttlingManager.applyThrottling(page, config, browserEngine);
  }

  /**
   * Resets network/CPU throttling.
   */
  async clearThrottling(page: Page, browserEngine: string = 'chromium'): Promise<void> {
    return this.throttlingManager.clearThrottling(page, browserEngine);
  }
}
