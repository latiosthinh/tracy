import type { Page, CDPSession } from 'playwright';
import type { ThrottlingPreset } from '@/src/types/flow';
import type { ThrottlingConfig } from './types';

export interface CDPNetworkConditions {
  offline: boolean;
  latency: number;
  downloadThroughput: number;
  uploadThroughput: number;
  connectionType?: string;
}

export const THROTTLING_PRESETS: Record<ThrottlingPreset, CDPNetworkConditions> = {
  slow3g: {
    offline: false,
    latency: 400, // ms
    downloadThroughput: Math.round((400 * 1024) / 8), // 400 kbps in bytes/sec = 50,000 B/s
    uploadThroughput: Math.round((400 * 1024) / 8), // 400 kbps in bytes/sec
    connectionType: 'cellular3g',
  },
  fast3g: {
    offline: false,
    latency: 150, // ms
    downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8), // 1.6 Mbps = 200,000 B/s
    uploadThroughput: Math.round((750 * 1024) / 8), // 750 kbps = 93,750 B/s
    connectionType: 'cellular3g',
  },
  offline: {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  },
  none: {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  },
};

/**
 * Manages CDP-based network emulation and CPU throttling.
 * Guarded strictly to Chromium engines to prevent CDP divergence crashes on WebKit & Firefox.
 */
export class ThrottlingManager {
  private activeSessions = new WeakMap<Page, CDPSession>();

  /**
   * Applies network conditions and CPU slowdown rate via CDP if on Chromium.
   * Returns true if throttling was applied, false if bypassed (e.g. non-Chromium).
   */
  async applyThrottling(
    page: Page,
    config: ThrottlingConfig | ThrottlingPreset,
    browserEngine: string = 'chromium'
  ): Promise<boolean> {
    if (browserEngine !== 'chromium') {
      // Non-Chromium engines (Firefox, WebKit) do not support CDP Emulation/Network domains safely.
      return false;
    }

    try {
      let session = this.activeSessions.get(page);
      if (!session) {
        session = await page.context().newCDPSession(page);
        this.activeSessions.set(page, session);
      }

      let networkConditions: CDPNetworkConditions;
      let cpuSlowdownRate = 1;

      if (typeof config === 'string') {
        networkConditions = THROTTLING_PRESETS[config] || THROTTLING_PRESETS.none;
      } else {
        if (config.preset && THROTTLING_PRESETS[config.preset]) {
          networkConditions = { ...THROTTLING_PRESETS[config.preset] };
        } else {
          networkConditions = {
            offline: !!config.offline,
            latency: config.latencyMs ?? 0,
            downloadThroughput: config.downloadKbps ? Math.round((config.downloadKbps * 1024) / 8) : -1,
            uploadThroughput: config.uploadKbps ? Math.round((config.uploadKbps * 1024) / 8) : -1,
          };
        }

        if (config.cpuSlowdownRate && config.cpuSlowdownRate > 1) {
          cpuSlowdownRate = config.cpuSlowdownRate;
        }
      }

      // Apply network emulation
      await session.send('Network.emulateNetworkConditions', {
        offline: networkConditions.offline,
        latency: networkConditions.latency,
        downloadThroughput: networkConditions.downloadThroughput,
        uploadThroughput: networkConditions.uploadThroughput,
        connectionType: networkConditions.connectionType,
      });

      // Apply CPU throttling if specified
      if (cpuSlowdownRate > 1) {
        await session.send('Emulation.setCPUThrottlingRate', {
          rate: cpuSlowdownRate,
        });
      }

      return true;
    } catch (err) {
      // Never crash if CDP fails (e.g. target closed or detached)
      return false;
    }
  }

  /**
   * Resets all network emulation and CPU throttling on Chromium pages.
   */
  async clearThrottling(page: Page, browserEngine: string = 'chromium'): Promise<void> {
    if (browserEngine !== 'chromium') {
      return;
    }

    try {
      const session = this.activeSessions.get(page);
      if (session) {
        await session.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1,
        });
        await session.send('Emulation.setCPUThrottlingRate', {
          rate: 1,
        });
      }
    } catch (err) {
      // Ignore cleanup error
    }
  }
}
