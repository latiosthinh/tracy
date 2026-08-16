import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isElectronEnv, tracyApi } from '@/src/lib/ipc';
import { generateSuggestedSelectors } from '@/src/utils/domMiner';
import { useEnvironment } from '@/src/hooks/useEnvironment';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useUiStore } from '@/src/stores/uiStore';
import { Info } from 'lucide-react';

interface RealBrowserViewProps {
  projectId: string;
  targetUrl: string;
  activePath: string;
  viewportWidth?: number;
  onNavigate?: (path: string) => void;
  recordMode?: boolean;
  inspectMode?: boolean;
  onElementInspected?: (element: any) => void;
  hideWebview?: boolean;
}

type ViewState = 'idle' | 'launching' | 'loading' | 'ready' | 'error';

export const RealBrowserView: React.FC<RealBrowserViewProps> = ({
  projectId,
  targetUrl,
  activePath,
  viewportWidth,
  onNavigate: _onNavigate,
  recordMode = false,
  inspectMode = false,
  onElementInspected,
  hideWebview = false,
}) => {
  const { isWeb } = useEnvironment();
  const { t } = useTranslation();
  const devicePreset = useUiStore((s) => s.devicePreset);
  const deviceOrientation = useUiStore((s) => s.deviceOrientation);
  const showDeviceBezel = useUiStore((s) => s.showDeviceBezel);
  const [, setViewState] = useState<ViewState>('idle');
  const [, setCurrentUrl] = useState<string>('');
  const [, setError] = useState<string | null>(null);
  const [, setIsSecure] = useState(false);
  const launchedRef = useRef(false);

  const buildUrl = useCallback(() => {
    if (activePath.startsWith('http://') || activePath.startsWith('https://')) {
      return activePath;
    }
    const base = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
    const path = activePath.startsWith('/') ? activePath : `/${activePath}`;
    return `${base}${path}`;
  }, [targetUrl, activePath]);

  // Tell the backend what mode we are in
  useEffect(() => {
    if (inspectMode) tracyApi.setBrowserMode('inspect');
    else if (recordMode) tracyApi.setBrowserMode('record');
    else tracyApi.setBrowserMode('idle');
  }, [inspectMode, recordMode]);

  const navigateTo = useCallback(async (url: string) => {
    if (!isElectronEnv()) {
      setError('Playwright browser is only available inside the Tracy desktop app.');
      setViewState('error');
      return;
    }

    try {
      setViewState('loading');
      setError(null);

      // Connect Playwright CDP first time
      if (!launchedRef.current) {
        setViewState('launching');
        await tracyApi.launchBrowser(true);
        launchedRef.current = true;
      }

      // Native child webview mode: navigate it
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && isElectronEnv()) {
        tracyApi.openChildWebview(projectId, url, rect.x, rect.y, rect.width, rect.height);
      }

      // Sync Playwright page (in the backend it will find the active page)
      await tracyApi.navigateBrowser(url).catch(() => { });

      setCurrentUrl(url);
      setIsSecure(url.startsWith('https://'));
      setViewState('ready');
    } catch (e: any) {
      setError(e?.message || String(e));
      setViewState('error');
      launchedRef.current = false; // allow retry
    }
  }, [projectId]);

  useEffect(() => {
    const unlisten = tracyApi.onBrowserEvent((payload) => {
      if (payload.type === 'inspect-click') {
        if (inspectMode && onElementInspected) {
          const elemData = payload.data;
          const suggestedSelectors = generateSuggestedSelectors(elemData);
          onElementInspected({
            ...elemData,
            suggestedSelectors,
          });
        }
      } else if (payload.type === 'record-click') {
        if (recordMode) {
          // Record mode click means the user clicked the element, we can generate a click step,
          // but we also need to let it happen (the native browser handles the click).
          // We can just emit the inspected element so the Studio can add it to the flow!
          if (onElementInspected) {
            const elemData = payload.data;
            const suggestedSelectors = generateSuggestedSelectors(elemData);
            onElementInspected({
              ...elemData,
              suggestedSelectors,
            });
          }
        }
      }
    });
    return () => {
      unlisten.then(f => f());
    };
  }, [inspectMode, recordMode, onElementInspected]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Manage child webview lifecycle (ResizeObserver)
  useEffect(() => {
    if (!isElectronEnv()) {
      tracyApi.setChildWebviewVisible(projectId, false).catch(() => { });
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    let isInitialized = false;

    const updateWebview = async () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const url = buildUrl();
      if (!url) return;

      if (!isInitialized) {
        await tracyApi.openChildWebview(projectId, url, rect.x, rect.y, rect.width, rect.height);
        isInitialized = true;

        setCurrentUrl(url);
        setIsSecure(url.startsWith('https://'));
        setViewState('ready');
      } else {
        await tracyApi.resizeChildWebview(projectId, rect.x, rect.y, rect.width, rect.height);
      }
    };

    updateWebview();

    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => updateWebview());
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      tracyApi.setChildWebviewVisible(projectId, false).catch(() => { });
    };
  }, [projectId, buildUrl]);

  // Handle visibility externally
  useEffect(() => {
    if (isElectronEnv()) {
      tracyApi.setChildWebviewVisible(projectId, !hideWebview).catch(() => {});
      if (!hideWebview && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          tracyApi.resizeChildWebview(projectId, rect.x, rect.y, rect.width, rect.height).catch(() => {});
        }
      }
    }
  }, [projectId, hideWebview]);

  // Navigate whenever the URL changes
  useEffect(() => {
    const url = buildUrl();
    if (!url) return;

    navigateTo(url);
  }, [buildUrl, navigateTo]);

  // Dimension calculations for bezel frame & orientation
  const isLandscape = deviceOrientation === 'landscape';
  const isMobile = devicePreset.startsWith('Mobile');
  const isTablet = devicePreset.startsWith('Tablet');
  const isLaptop = devicePreset === 'Laptop 1280';
  const isDesktop = devicePreset === 'Desktop 1440';

  let screenWidth = viewportWidth || 1280;
  let screenHeight = 800;

  if (isMobile) {
    screenWidth = isLandscape ? 812 : 375;
    screenHeight = isLandscape ? 375 : 812;
  } else if (isTablet) {
    screenWidth = isLandscape ? 1024 : 768;
    screenHeight = isLandscape ? 768 : 1024;
  } else if (isLaptop) {
    screenWidth = 1280;
    screenHeight = 800;
  } else if (isDesktop) {
    screenWidth = 1440;
    screenHeight = 900;
  }

  // Frame styling based on device preset
  const renderBezelContent = () => {
    if (!showDeviceBezel) {
      return (
        <div
          ref={containerRef}
          className="w-full h-full border-none"
          style={{
            maxWidth: viewportWidth && viewportWidth < 1440 ? `${viewportWidth}px` : '100%',
            margin: '0 auto',
            display: 'block',
            backgroundColor: '#ffffff'
          }}
        />
      );
    }

    if (isMobile) {
      return (
        <div className="flex items-center justify-center p-6 min-h-full">
          <div
            className="relative bg-stone-900 border-[10px] border-stone-800 shadow-2xl rounded-[44px] p-2 flex flex-col items-center shrink-0 ring-1 ring-stone-700/50"
            style={{
              width: `${screenWidth + 24}px`,
              height: `${screenHeight + 24}px`,
            }}
          >
            {/* Speaker / Dynamic Island / Notch */}
            {!isLandscape ? (
              <div className="w-24 h-4 bg-stone-950 rounded-full mb-1.5 flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 bg-stone-900 rounded-full mr-2"></div>
                <div className="w-10 h-1 bg-stone-800 rounded-full"></div>
              </div>
            ) : (
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-20 w-3 bg-stone-950 rounded-full flex flex-col items-center justify-center z-10">
                <div className="w-1.5 h-1.5 bg-stone-900 rounded-full mb-1"></div>
                <div className="w-1 h-8 bg-stone-800 rounded-full"></div>
              </div>
            )}

            {/* Inner Screen Area wrapped with containerRef */}
            <div
              ref={containerRef}
              className="w-full flex-1 rounded-[28px] overflow-hidden bg-white relative"
              style={{
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
              }}
            />

            {/* Home Indicator */}
            {!isLandscape ? (
              <div className="w-28 h-1 bg-stone-700 rounded-full mt-2 shrink-0"></div>
            ) : (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-20 w-1 bg-stone-700 rounded-full z-10"></div>
            )}
          </div>
        </div>
      );
    }

    if (isTablet) {
      return (
        <div className="flex items-center justify-center p-6 min-h-full">
          <div
            className="relative bg-stone-900 border-[12px] border-stone-800 shadow-2xl rounded-[32px] p-2 flex flex-col items-center shrink-0 ring-1 ring-stone-700/50"
            style={{
              width: `${screenWidth + 28}px`,
              height: `${screenHeight + 28}px`,
            }}
          >
            {/* Front Camera */}
            {!isLandscape ? (
              <div className="w-2.5 h-2.5 bg-stone-950 rounded-full mb-1.5 shrink-0 border border-stone-700/50"></div>
            ) : (
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-stone-950 rounded-full shrink-0 border border-stone-700/50 z-10"></div>
            )}

            {/* Inner Screen Area */}
            <div
              ref={containerRef}
              className="w-full flex-1 rounded-[16px] overflow-hidden bg-white relative"
              style={{
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
              }}
            />

            {/* Home Indicator */}
            {!isLandscape ? (
              <div className="w-32 h-1 bg-stone-700 rounded-full mt-2 shrink-0"></div>
            ) : (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-24 w-1 bg-stone-700 rounded-full z-10"></div>
            )}
          </div>
        </div>
      );
    }

    if (isLaptop) {
      return (
        <div className="flex items-center justify-center p-6 min-h-full">
          <div className="flex flex-col items-center shrink-0">
            <div
              className="bg-stone-900 border-[8px] border-stone-800 shadow-2xl rounded-t-[14px] p-1.5 flex flex-col items-center ring-1 ring-stone-700/50"
              style={{
                width: `${screenWidth + 16}px`,
                height: `${screenHeight + 16}px`,
              }}
            >
              {/* Laptop WebCam Notch */}
              <div className="w-2 h-2 bg-stone-950 rounded-full mb-1 shrink-0"></div>

              {/* Inner Screen Area */}
              <div
                ref={containerRef}
                className="w-full flex-1 rounded-[4px] overflow-hidden bg-white relative"
                style={{
                  width: `${screenWidth}px`,
                  height: `${screenHeight}px`,
                }}
              />
            </div>

            {/* Laptop Base / Hinge */}
            <div
              className="h-3 bg-stone-800 rounded-b-lg border-t border-stone-700 relative shadow-md flex justify-center items-center"
              style={{ width: `${screenWidth + 80}px` }}
            >
              <div className="w-16 h-1 bg-stone-600 rounded-full"></div>
            </div>
          </div>
        </div>
      );
    }

    // Desktop
    return (
      <div className="flex items-center justify-center p-6 min-h-full">
        <div className="flex flex-col items-center shrink-0">
          <div
            className="bg-stone-900 border-[10px] border-stone-800 shadow-2xl rounded-[10px] p-1 flex flex-col items-center ring-1 ring-stone-700/50"
            style={{
              width: `${screenWidth + 20}px`,
              height: `${screenHeight + 20}px`,
            }}
          >
            {/* Monitor Camera */}
            <div className="w-1.5 h-1.5 bg-stone-950 rounded-full mb-1 shrink-0"></div>

            {/* Inner Screen Area */}
            <div
              ref={containerRef}
              className="w-full flex-1 rounded-[2px] overflow-hidden bg-white relative"
              style={{
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
              }}
            />
          </div>

          {/* Desktop Stand */}
          <div className="w-20 h-10 bg-stone-800 border-x border-stone-700 shrink-0"></div>
          <div className="w-56 h-3 bg-stone-800 rounded-md border border-stone-700 shadow-lg shrink-0"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-stone-900 flex flex-col">
      {isWeb && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2 flex items-center gap-2 text-xs text-amber-200 shrink-0">
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {t('studio.webModeNotice')}{' '}
            <a href="#/" className="underline hover:text-amber-100">
              {t('studio.downloadDesktop')}
            </a>{' '}
            {t('studio.desktopIntegrationNotice')}
          </span>
        </div>
      )}
      {/* Main View Area */}
      <div
        className={`flex-1 overflow-auto relative focus:outline-hidden ${
          showDeviceBezel ? 'bg-stone-950 flex items-center justify-center' : 'bg-white'
        }`}
      >
        {renderBezelContent()}
      </div>
    </div>
  );
};
