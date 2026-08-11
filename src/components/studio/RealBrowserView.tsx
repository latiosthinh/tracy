import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
  Unlock,
  ShieldCheck,
  MonitorPlay,
} from 'lucide-react';
import { tracyApi, isTauriEnv } from '../../lib/tauri';
import { generateSuggestedSelectors } from '../../utils/domMiner';

interface RealBrowserViewProps {
  targetUrl: string;
  activePath: string;
  viewportWidth?: number;
  onNavigate?: (path: string) => void;
  recordMode?: boolean;
  inspectMode?: boolean;
  onElementInspected?: (element: any) => void;
}

type ViewState = 'idle' | 'launching' | 'loading' | 'ready' | 'error';

export const RealBrowserView: React.FC<RealBrowserViewProps> = ({
  targetUrl,
  activePath,
  viewportWidth,
  onNavigate,
  recordMode = false,
  inspectMode = false,
  onElementInspected,
}) => {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [screenshotB64, setScreenshotB64] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(false);
  const launchedRef = useRef(false);

  const buildUrl = useCallback(() => {
    if (activePath.startsWith('http://') || activePath.startsWith('https://')) {
      return activePath;
    }
    const base = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
    const path = activePath.startsWith('/') ? activePath : `/${activePath}`;
    return `${base}${path}`;
  }, [targetUrl, activePath]);

  const usePlaywright = recordMode || inspectMode;

  const navigateTo = useCallback(async (url: string) => {
    if (!isTauriEnv()) {
      setError('Playwright browser is only available inside the Tracy desktop app.');
      setViewState('error');
      return;
    }

    try {
      setViewState('loading');
      setError(null);

      // Launch browser first time
      if (!launchedRef.current) {
        setViewState('launching');
        await tracyApi.launchBrowser(true);
        launchedRef.current = true;
      }

      const result = await tracyApi.navigateBrowser(url);
      if (result && result.image) {
        setScreenshotB64(result.image);
        setCurrentUrl(result.url || url);
        setPageTitle(result.title || '');
        setIsSecure((result.url || url).startsWith('https://'));
        setViewState('ready');
      } else {
        throw new Error('No screenshot returned from browser');
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      setViewState('error');
      launchedRef.current = false; // allow retry
    }
  }, []);

  const handleInteract = useCallback(async (action: string, params: any) => {
    if (viewState !== 'ready' && viewState !== 'loading') return;
    try {
      setViewState('loading');
      const result = await tracyApi.interactBrowser(action, params);
      if (result && result.image) {
        setScreenshotB64(result.image);
        if (result.url && result.url !== currentUrl) {
          setCurrentUrl(result.url);
          setIsSecure(result.url.startsWith('https://'));
          if (onNavigate) onNavigate(result.url);
        }
        if (result.title) setPageTitle(result.title);
      }
    } catch (e: any) {
      console.error('Interact error', e);
    } finally {
      setViewState('ready');
    }
  }, [viewState, currentUrl, onNavigate]);

  const handleImageClick = useCallback(async (e: React.MouseEvent<HTMLImageElement>) => {
    if (viewState !== 'ready') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = e.currentTarget.naturalWidth / rect.width;
    const scaleY = e.currentTarget.naturalHeight / rect.height;
    
    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    if (inspectMode) {
      if (onElementInspected) {
        try {
          const result = await tracyApi.inspectElementAtPoint(actualX, actualY);
          if (result && result.element) {
            const elemData = result.element;
            const suggestedSelectors = generateSuggestedSelectors(elemData);
            onElementInspected({
              ...elemData,
              suggestedSelectors,
            });
          } else {
            onElementInspected(null);
          }
        } catch (err) {
          console.error("Inspect error:", err);
        }
      }
    } else if (recordMode) {
      handleInteract('click', { x: actualX, y: actualY });
    }
  }, [viewState, handleInteract, inspectMode, recordMode, onElementInspected]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (viewState !== 'ready') return;
    const allowedKeys = ['Enter', 'Backspace', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    if (e.key.length === 1 || allowedKeys.includes(e.key)) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
        e.preventDefault();
      }
      handleInteract('keydown', { key: e.key });
    }
  }, [viewState, handleInteract]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Manage child webview lifecycle (ResizeObserver)
  useEffect(() => {
    if (usePlaywright || !isTauriEnv()) {
      tracyApi.setChildWebviewVisible(false).catch(() => {});
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
      tracyApi.setChildWebviewVisible(false).catch(() => {});
    };
  }, [usePlaywright]);

  // Navigate whenever the URL changes
  useEffect(() => {
    const url = buildUrl();
    if (!url) return;

    if (usePlaywright) {
      // Playwright mode: launch browser + take screenshot
      navigateTo(url);
    } else {
      // Native child webview mode: navigate it
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && isTauriEnv()) {
        tracyApi.openChildWebview(url, rect.x, rect.y, rect.width, rect.height);
      }
      setCurrentUrl(url);
      setIsSecure(url.startsWith('https://'));
      setViewState('ready');
    }
  }, [buildUrl, usePlaywright]);

  const handleRefresh = () => {
    launchedRef.current = false; // force re-launch in case browser died
    navigateTo(buildUrl());
  };

  const openExternal = () => {
    if (currentUrl) window.open(currentUrl, '_blank');
  };

  const currentUrlObj = currentUrl
    ? (() => { try { return new URL(currentUrl); } catch { return null; } })()
    : null;

  return (
    <div className="w-full h-full bg-stone-900 flex flex-col">
      {/* Browser Status Bar */}
      <div className="bg-stone-950 px-3 py-2 border-b border-stone-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {/* Security Indicator */}
          <div className="shrink-0">
            {isSecure ? (
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            ) : currentUrl ? (
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
            )}
          </div>

          {/* URL Display */}
          <div className="flex-1 min-w-0">
            <span
              className="text-xs font-mono text-stone-300 truncate block"
              title={currentUrl || buildUrl() || 'Not connected'}
            >
              {currentUrlObj ? (
                <>
                  {currentUrlObj.hostname}
                  {currentUrlObj.pathname !== '/' && (
                    <span className="text-stone-500">{currentUrlObj.pathname}</span>
                  )}
                </>
              ) : (
                currentUrl || buildUrl() || 'Not connected'
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {/* Mode indicator */}
          {usePlaywright ? (
            <span className="text-[10px] bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-mono" title="Recording mode: Playwright screenshots for AI step recording">
              ● Record
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-mono" title="Live embedded browser view">
              Live
            </span>
          )}

          {/* Loading Indicator */}
          {usePlaywright && (viewState === 'loading' || viewState === 'launching') && (
            <div className="flex items-center space-x-1.5 text-stone-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[10px] font-mono">
                {viewState === 'launching' ? 'Launching...' : 'Loading...'}
              </span>
            </div>
          )}

          {/* Page Title */}
          {((usePlaywright && viewState === 'ready') || (!usePlaywright)) && pageTitle && (
            <span className="text-[10px] text-stone-500 font-mono truncate max-w-[120px]" title={pageTitle}>
              {pageTitle}
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={viewState === 'loading' || viewState === 'launching'}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Refresh page"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${viewState === 'loading' ? 'animate-spin' : ''}`} />
          </button>

          {/* Open External */}
          {currentUrl && (
            <button
              onClick={openExternal}
              className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded transition-all"
              title="Open in external browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading Bar */}
      {usePlaywright && (viewState === 'loading' || viewState === 'launching') && (
        <div className="h-0.5 bg-stone-800 overflow-hidden shrink-0">
          <div className="h-full bg-amber-500 animate-pulse" style={{ width: '70%' }} />
        </div>
      )}

      {/* Main View Area */}
      <div 
        className={`flex-1 overflow-y-auto overflow-x-hidden relative focus:outline-hidden ${!usePlaywright ? 'bg-white' : 'bg-stone-950'}`}
        tabIndex={0}
        onKeyDown={usePlaywright ? handleKeyDown : undefined}
      >
        
        {/* NATIVE CHILD WEBVIEW CONTAINER */}
        {!usePlaywright && (
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
        )}

        {/* PLAYWRIGHT RECORD MODE */}
        {usePlaywright && viewState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-stone-950 text-center p-8">
            <AlertTriangle className="w-14 h-14 text-amber-500" />
            <h3 className="text-amber-300 font-bold text-lg">Browser Error</h3>
            <p className="text-stone-400 text-sm max-w-md font-mono break-all">{error}</p>
            <p className="text-stone-500 text-xs max-w-sm">
              Make sure Node.js is installed and the Playwright Chromium browser is available.
              Run: <code className="bg-stone-800 px-1 rounded">npx playwright install chromium</code>
            </p>
            <div className="flex items-center space-x-3 mt-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-amber-50 text-sm font-bold rounded border border-amber-600 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
              {buildUrl() && (
                <button
                  onClick={openExternal}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-bold rounded border border-stone-700 flex items-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Browser</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Idle/Initial State */}
        {usePlaywright && viewState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-center p-8">
            <MonitorPlay className="w-14 h-14 text-stone-600" />
            <p className="text-stone-400 text-sm">Connecting to Playwright browser…</p>
          </div>
        )}

        {/* Launching State */}
        {usePlaywright && viewState === 'launching' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-center p-8">
            <Globe className="w-14 h-14 text-amber-600 animate-pulse" />
            <p className="text-stone-300 text-sm font-semibold">Launching Chromium…</p>
            <p className="text-stone-500 text-xs">Starting headless browser via Playwright</p>
          </div>
        )}

        {/* Loading State (browser launched, navigating) */}
        {usePlaywright && viewState === 'loading' && screenshotB64 && (
          /* Show previous screenshot while loading next page */
          <img
            src={`data:image/png;base64,${screenshotB64}`}
            alt="Browser view"
            className="w-full h-auto object-top opacity-50 transition-opacity"
            style={{
              maxWidth: viewportWidth && viewportWidth < 1440 ? `${viewportWidth}px` : '100%',
              margin: '0 auto',
              display: 'block',
            }}
          />
        )}

        {/* Ready State — Live Screenshot */}
        {usePlaywright && viewState === 'ready' && screenshotB64 && (
          <img
            src={`data:image/png;base64,${screenshotB64}`}
            alt={`Screenshot of ${currentUrl}`}
            className="w-full h-auto object-top shadow-lg cursor-pointer"
            onClick={handleImageClick}
            style={{
              maxWidth: viewportWidth && viewportWidth < 1440 ? `${viewportWidth}px` : '100%',
              margin: '0 auto',
              display: 'block',
              minHeight: '100%',
            }}
          />
        )}
      </div>
    </div>
  );
};
