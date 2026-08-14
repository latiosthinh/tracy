import { useMemo } from 'react';
import { isElectronEnv } from '@/src/lib/ipc';

export interface EnvironmentFeatures {
  playwright: boolean;      // Real browser automation via Playwright
  fileSystem: boolean;      // Native file system operations
  domMine: boolean;         // Live DOM mining from browser
  takeScreenshot: boolean;  // Screenshot capture
  webview: boolean;         // Child webview / embedded browsing
}

const DESKTOP_FEATURES: EnvironmentFeatures = {
  playwright: true,
  fileSystem: true,
  domMine: true,
  takeScreenshot: true,
  webview: true,
};

const WEB_FEATURES: EnvironmentFeatures = {
  playwright: false,
  fileSystem: false,
  domMine: false,
  takeScreenshot: false,
  webview: false,
};

export function useEnvironment() {
  const electron = useMemo(() => isElectronEnv(), []);

  return {
    isDesktop: electron,
    isWeb: !electron,
    features: electron ? DESKTOP_FEATURES : WEB_FEATURES,
  };
}
