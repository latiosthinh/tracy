import type { WebVitalsMetrics } from './types';

/**
 * Self-contained in-browser script injected via page.addInitScript().
 * Tracks LCP, CLS, INP, FCP, TTFB, and Navigation/Resource timing.
 * Gracefully degrades on Firefox and WebKit where newer Web Vitals observers are unavailable.
 */
export const PERF_OBSERVER_INIT_SCRIPT = `(() => {
  if (window.__tracyPerfAttached) return;
  window.__tracyPerfAttached = true;

  const metrics = {
    lcp: 0,
    cls: 0,
    inp: 0,
    fcp: 0,
    ttfb: 0,
    domContentLoaded: 0,
    loadTime: 0,
    domNodes: 0,
    navigationTiming: {},
    syntheticFallback: false
  };

  window.__tracyMetrics = metrics;

  // 1. Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        metrics.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime || 0);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    metrics.syntheticFallback = true;
  }

  // 2. Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          metrics.cls = Number(clsValue.toFixed(4));
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    metrics.syntheticFallback = true;
  }

  // 3. First Contentful Paint (FCP)
  try {
    const paintObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metrics.fcp = Math.round(entry.startTime);
        }
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    metrics.syntheticFallback = true;
  }

  // 4. Interaction to Next Paint (INP) / First Input Delay (FID)
  try {
    let maxDuration = 0;
    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration > maxDuration) {
          maxDuration = entry.duration;
          metrics.inp = Math.round(maxDuration);
        }
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (e) {
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        if (firstInput) {
          metrics.inp = Math.round(firstInput.processingStart - firstInput.startTime);
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (err) {
      metrics.syntheticFallback = true;
    }
  }

  // Helper to extract Navigation Timing metrics (W3C standard)
  function extractNavTimings() {
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) {
        const nav = navEntries[0];
        metrics.ttfb = Math.round(nav.responseStart - (nav.requestStart > 0 ? nav.requestStart : nav.fetchStart));
        if (metrics.ttfb < 0) metrics.ttfb = Math.round(nav.responseStart);
        metrics.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
        metrics.loadTime = Math.round(nav.loadEventEnd > 0 ? (nav.loadEventEnd - nav.startTime) : (nav.domComplete - nav.startTime));
        metrics.navigationTiming = {
          dnsMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcpMs: Math.round(nav.connectEnd - nav.connectStart),
          requestMs: Math.round(nav.responseStart - nav.requestStart),
          responseMs: Math.round(nav.responseEnd - nav.responseStart),
          domProcessingMs: Math.round(nav.domComplete - nav.responseEnd),
          loadEventMs: Math.round(nav.loadEventEnd - nav.loadEventStart)
        };
      } else if (window.performance && window.performance.timing) {
        const t = window.performance.timing;
        metrics.ttfb = Math.round(t.responseStart - (t.requestStart > 0 ? t.requestStart : t.fetchStart));
        if (metrics.ttfb < 0) metrics.ttfb = Math.max(0, Math.round(t.responseStart - t.navigationStart));
        metrics.domContentLoaded = Math.max(0, Math.round(t.domContentLoadedEventEnd - t.navigationStart));
        metrics.loadTime = Math.max(0, Math.round(t.loadEventEnd - t.navigationStart));
        metrics.navigationTiming = {
          dnsMs: Math.max(0, Math.round(t.domainLookupEnd - t.domainLookupStart)),
          tcpMs: Math.max(0, Math.round(t.connectEnd - t.connectStart)),
          requestMs: Math.max(0, Math.round(t.responseStart - t.requestStart)),
          responseMs: Math.max(0, Math.round(t.responseEnd - t.responseStart)),
          domProcessingMs: Math.max(0, Math.round(t.domComplete - t.responseEnd)),
          loadEventMs: Math.max(0, Math.round(t.loadEventEnd - t.loadEventStart))
        };
      }
    } catch (e) {
      // ignore
    }

    // Fallbacks if LCP/FCP not captured via observers
    if (!metrics.fcp && metrics.domContentLoaded > 0) {
      metrics.fcp = metrics.domContentLoaded;
    }
    if (!metrics.lcp && metrics.loadTime > 0) {
      metrics.lcp = metrics.loadTime;
    }
  }

  window.__tracyGetMetrics = () => {
    extractNavTimings();
    try {
      metrics.domNodes = document.getElementsByTagName('*').length;
    } catch (e) {
      metrics.domNodes = 0;
    }
    return {
      ...metrics,
      timestamp: Date.now()
    };
  };
})();`;

/**
 * Pure fallback extractor for navigation timing data from serialized performance timing structures.
 */
export function extractNavigationTimingMetrics(
  navTiming?: Partial<PerformanceNavigationTiming | PerformanceTiming>,
  browserEngine: 'chromium' | 'firefox' | 'webkit' = 'chromium'
): Partial<WebVitalsMetrics> {
  if (!navTiming) {
    return {
      syntheticFallback: true,
      browserEngine,
      timestamp: Date.now()
    };
  }

  const nav = navTiming as any;
  const isEntriesApi = typeof nav.startTime === 'number';

  const ttfb = isEntriesApi
    ? Math.max(0, Math.round(nav.responseStart - (nav.requestStart > 0 ? nav.requestStart : nav.fetchStart || 0)))
    : Math.max(0, Math.round((nav.responseStart || 0) - (nav.requestStart || nav.navigationStart || 0)));

  const domContentLoaded = isEntriesApi
    ? Math.max(0, Math.round((nav.domContentLoadedEventEnd || 0) - (nav.startTime || 0)))
    : Math.max(0, Math.round((nav.domContentLoadedEventEnd || 0) - (nav.navigationStart || 0)));

  const loadTime = isEntriesApi
    ? Math.max(0, Math.round((nav.loadEventEnd || nav.domComplete || 0) - (nav.startTime || 0)))
    : Math.max(0, Math.round((nav.loadEventEnd || nav.domComplete || 0) - (nav.navigationStart || 0)));

  return {
    ttfb,
    domContentLoaded,
    loadTime,
    fcp: domContentLoaded,
    lcp: loadTime,
    cls: 0,
    inp: 0,
    syntheticFallback: true,
    browserEngine,
    timestamp: Date.now()
  };
}
