import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isElectronEnv, tracyApi } from '@/src/lib/ipc';
import { generateSuggestedSelectors } from '@/src/utils/domMiner';

interface RealBrowserViewProps {
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
  targetUrl,
  activePath,
  viewportWidth,
  onNavigate: _onNavigate,
  recordMode = false,
  inspectMode = false,
  onElementInspected,
  hideWebview = false,
}) => {
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
        tracyApi.openChildWebview(url, rect.x, rect.y, rect.width, rect.height);
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
  }, []);

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
      tracyApi.setChildWebviewVisible(false).catch(() => { });
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
        await tracyApi.openChildWebview(url, rect.x, rect.y, rect.width, rect.height);
        isInitialized = true;

        setCurrentUrl(url);
        setIsSecure(url.startsWith('https://'));
        setViewState('ready');
      } else {
        await tracyApi.resizeChildWebview(rect.x, rect.y, rect.width, rect.height);
      }
    };

    updateWebview();

    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => updateWebview());
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      tracyApi.setChildWebviewVisible(false).catch(() => { });
    };
  }, []);

  // Handle visibility externally
  useEffect(() => {
    if (isElectronEnv()) {
      tracyApi.setChildWebviewVisible(!hideWebview).catch(() => {});
    }
  }, [hideWebview]);

  // Navigate whenever the URL changes
  useEffect(() => {
    const url = buildUrl();
    if (!url) return;

    navigateTo(url);
  }, [buildUrl, navigateTo]);

  return (
    <div className="w-full h-full bg-stone-900 flex flex-col">
      {/* Main View Area */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden relative focus:outline-hidden bg-white"
        tabIndex={0}
      >
        {/* NATIVE CHILD WEBVIEW CONTAINER */}
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
      </div>
    </div>
  );
};
