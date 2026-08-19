import { ipcMain, BrowserWindow, WebContentsView } from 'electron';
import type { SelectorValidationPayload, SelectorValidationResult } from '../../src/types/skills';

const MAX_LIVE_WEBVIEWS = 4;
const PROBE_TIMEOUT_MS = 2000;
const MAX_PROBE_MATCHES = 10;

interface WebviewEntry {
  view: WebContentsView;
  lastUsed: number;
  lastBounds: { x: number; y: number; width: number; height: number };
}

const webviews = new Map<string, WebviewEntry>();

function isValidProjectId(projectId: unknown): projectId is string {
  return typeof projectId === 'string' && projectId.length > 0 && projectId.length <= 128;
}

export function isAllowedNavigationUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url.trim()) return false;
  const trimmed = url.trim();
  if (trimmed === 'about:blank') return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidBounds(x: unknown, y: unknown, width: unknown, height: unknown): boolean {
  return typeof x === 'number' && Number.isFinite(x) &&
    typeof y === 'number' && Number.isFinite(y) &&
    typeof width === 'number' && Number.isFinite(width) && width >= 0 &&
    typeof height === 'number' && Number.isFinite(height) && height >= 0;
}

export async function probeSelectorInWebview(
  view: WebContentsView,
  payload: SelectorValidationPayload
): Promise<SelectorValidationResult> {
  const startTime = Date.now();
  const selector = (payload.selector || '').trim();
  const explicitType = payload.selectorType || 'auto';
  const timeoutMs = Math.min(payload.timeoutMs || PROBE_TIMEOUT_MS, 5000);

  if (!selector) {
    return {
      valid: false,
      selector,
      selectorType: explicitType,
      matchCount: 0,
      visibleCount: 0,
      matches: [],
      error: 'Empty selector string provided',
      durationMs: Date.now() - startTime,
    };
  }

  // Script definition executed in child webview context.
  // Passing payload as JSON string ensures no breakout injection.
  const probeScript = `
    (() => {
      const payload = ${JSON.stringify({ selector, selectorType: explicitType, maxMatches: MAX_PROBE_MATCHES })};
      const sel = payload.selector;
      let effectiveType = payload.selectorType;

      function detectType(s) {
        if (s.startsWith('xpath=') || s.startsWith('//') || s.startsWith('(//')) return 'xpath';
        if (s.startsWith('text=')) return 'text';
        if (s.startsWith('role=')) return 'aria';
        return 'css';
      }

      if (effectiveType === 'auto') {
        effectiveType = detectType(sel);
      }

      function queryElements(rawSelector, type) {
        let elements = [];
        if (type === 'xpath') {
          const xpathExpr = rawSelector.startsWith('xpath=') ? rawSelector.slice(6) : rawSelector;
          const result = document.evaluate(
            xpathExpr,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            if (node && node.nodeType === Node.ELEMENT_NODE) {
              elements.push(node);
            }
          }
        } else if (type === 'text') {
          const targetText = (rawSelector.startsWith('text=') ? rawSelector.slice(5) : rawSelector).trim().toLowerCase();
          const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT);
          let current = walker.currentNode;
          while (current) {
            if (current && current.textContent && current.textContent.trim().toLowerCase().includes(targetText)) {
              // Only pick leaf or direct containing elements matching text
              const hasChildWithSameText = Array.from(current.children || []).some(
                (c) => c.textContent && c.textContent.trim().toLowerCase().includes(targetText)
              );
              if (!hasChildWithSameText) {
                elements.push(current);
              }
            }
            current = walker.nextNode();
          }
        } else if (type === 'aria') {
          const roleVal = rawSelector.startsWith('role=') ? rawSelector.slice(5) : rawSelector;
          elements = Array.from(document.querySelectorAll('[role="' + roleVal + '"], ' + roleVal));
        } else {
          // CSS Query with Shadow DOM penetration
          function deepQuery(root, cssSel) {
            let matches = [];
            try {
              matches.push(...Array.from(root.querySelectorAll(cssSel)));
            } catch (e) {
              throw e;
            }
            const allElements = root.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i];
              if (el.shadowRoot) {
                matches.push(...deepQuery(el.shadowRoot, cssSel));
              }
            }
            return matches;
          }
          elements = deepQuery(document, rawSelector);
        }
        return elements;
      }

      function checkInShadow(el) {
        let parent = el.parentNode;
        while (parent) {
          if (parent instanceof ShadowRoot) return true;
          parent = parent.parentNode;
        }
        return false;
      }

      function isElementVisible(el) {
        if (!el || !(el instanceof Element)) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function isElementClickable(el) {
        if (!isElementVisible(el)) return false;
        const style = window.getComputedStyle(el);
        return style.pointerEvents !== 'none';
      }

      try {
        const rawMatches = queryElements(sel, effectiveType);
        const totalCount = rawMatches.length;
        let visibleCount = 0;
        const matchesInfo = [];

        for (let i = 0; i < rawMatches.length; i++) {
          const el = rawMatches[i];
          const visible = isElementVisible(el);
          if (visible) visibleCount++;

          if (matchesInfo.length < payload.maxMatches) {
            const rect = el.getBoundingClientRect();
            const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100);
            matchesInfo.push({
              tagName: el.tagName ? el.tagName.toLowerCase() : '',
              textPreview: text || undefined,
              role: el.getAttribute('role') || undefined,
              testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || undefined,
              boundingBox: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              isVisible: visible,
              isClickable: isElementClickable(el),
              isInShadowRoot: checkInShadow(el)
            });
          }
        }

        return {
          valid: true,
          selectorType: effectiveType,
          matchCount: totalCount,
          visibleCount,
          matches: matchesInfo
        };
      } catch (err) {
        return {
          valid: false,
          selectorType: effectiveType,
          matchCount: 0,
          visibleCount: 0,
          matches: [],
          error: err instanceof Error ? err.message : String(err)
        };
      }
    })()
  `;

  try {
    const probePromise = view.webContents.executeJavaScript(probeScript, true);
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Probe execution timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const result = await Promise.race([probePromise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });

    return {
      valid: result.valid,
      selector,
      selectorType: result.selectorType || explicitType,
      matchCount: result.matchCount || 0,
      visibleCount: result.visibleCount || 0,
      matches: result.matches || [],
      error: result.error,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      valid: false,
      selector,
      selectorType: explicitType,
      matchCount: 0,
      visibleCount: 0,
      matches: [],
      error: err?.message || 'Failed to probe selector in webview',
      durationMs: Date.now() - startTime,
    };
  }
}

function evictIfNeeded(parentWin: BrowserWindow): void {
  while (webviews.size > MAX_LIVE_WEBVIEWS) {
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    for (const [id, entry] of webviews) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestId = id;
      }
    }
    if (!oldestId) break;
    const entry = webviews.get(oldestId)!;
    try {
      parentWin.contentView.removeChildView(entry.view);
    } catch {
      // Ignored if already detached
    }
    entry.view.webContents.close();
    webviews.delete(oldestId);
  }
}

function attachSecurityHandlers(view: WebContentsView): void {
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  view.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedNavigationUrl(navigationUrl)) {
      event.preventDefault();
      console.warn(`Blocked invalid child webview navigation: ${navigationUrl}`);
    }
  });
}

export function registerWebviewHandlers() {
  ipcMain.handle('open_child_webview', async (event, { projectId, url, x, y, width, height }) => {
    if (!isValidProjectId(projectId)) {
      console.warn(`Blocked invalid webview projectId: ${projectId}`);
      return;
    }

    if (url && !isAllowedNavigationUrl(url)) {
      console.warn(`Blocked invalid webview URL navigation attempt: ${url}`);
      return;
    }

    if (!isValidBounds(x, y, width, height)) {
      console.warn(`Blocked invalid webview bounds: x=${x}, y=${y}, w=${width}, h=${height}`);
      return;
    }

    const parentWin = BrowserWindow.fromWebContents(event.sender);
    if (!parentWin) return;

    if (webviews.has(projectId)) {
      const entry = webviews.get(projectId)!;
      entry.lastUsed = Date.now();
      entry.lastBounds = { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };

      try {
        parentWin.contentView.removeChildView(entry.view);
      } catch {
        // Ignored if not attached
      }
      parentWin.contentView.addChildView(entry.view);
      entry.view.setBounds(entry.lastBounds);
      if (url && entry.view.webContents.getURL() !== url) {
        entry.view.webContents.loadURL(url);
      }
      return;
    }

    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    attachSecurityHandlers(view);

    const initialBounds = { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
    parentWin.contentView.addChildView(view);
    view.setBounds(initialBounds);
    if (url) {
      view.webContents.loadURL(url);
    }

    webviews.set(projectId, { view, lastUsed: Date.now(), lastBounds: initialBounds });
    evictIfNeeded(parentWin);
  });

  ipcMain.handle('resize_child_webview', async (event, { projectId, x, y, width, height }) => {
    if (!isValidProjectId(projectId)) return;
    if (!isValidBounds(x, y, width, height)) return;
    const entry = webviews.get(projectId);
    if (!entry) return;

    const newBounds = { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
    entry.lastBounds = newBounds;
    entry.view.setBounds(newBounds);
    entry.lastUsed = Date.now();
  });

  ipcMain.handle('set_child_webview_visible', async (event, { projectId, visible }) => {
    if (!isValidProjectId(projectId)) return;
    const entry = webviews.get(projectId);
    if (!entry) return;

    if (!visible) {
      entry.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    } else if (entry.lastBounds && (entry.lastBounds.width > 0 || entry.lastBounds.height > 0)) {
      entry.view.setBounds(entry.lastBounds);
    }
  });

  ipcMain.handle('close_child_webview', async (event, { projectId }) => {
    if (!isValidProjectId(projectId)) return;
    const entry = webviews.get(projectId);
    if (!entry) return;

    const parentWin = BrowserWindow.fromWebContents(event.sender);
    if (parentWin) {
      try {
        parentWin.contentView.removeChildView(entry.view);
      } catch {
        // Ignored if already detached
      }
    }
    entry.view.webContents.close();
    webviews.delete(projectId);
  });

  ipcMain.handle('emulate_media_theme', async (_event, { projectId, theme }: { projectId: string; theme: 'dark' | 'light' | 'no-preference' }) => {
    if (!isValidProjectId(projectId)) return;
    const validThemes = ['dark', 'light', 'no-preference'];
    if (!validThemes.includes(theme)) return;
    const entry = webviews.get(projectId);
    if (!entry) return;

    entry.view.webContents.emulateMedia({
      colorScheme: theme === 'no-preference' ? 'no-preference' : theme,
    });
  });

  ipcMain.handle('validate_dom_selector', async (_event, payload: SelectorValidationPayload): Promise<SelectorValidationResult> => {
    const startTime = Date.now();
    const projectId = payload?.projectId;
    const selector = payload?.selector;

    if (!isValidProjectId(projectId)) {
      return {
        valid: false,
        selector: selector || '',
        selectorType: payload?.selectorType || 'auto',
        matchCount: 0,
        visibleCount: 0,
        matches: [],
        error: `Invalid or missing projectId: ${projectId}`,
        durationMs: Date.now() - startTime,
      };
    }

    const entry = webviews.get(projectId);
    if (!entry || !entry.view || entry.view.webContents.isDestroyed()) {
      return {
        valid: false,
        selector: selector || '',
        selectorType: payload?.selectorType || 'auto',
        matchCount: 0,
        visibleCount: 0,
        matches: [],
        error: `No active webview found for project: ${projectId}`,
        durationMs: Date.now() - startTime,
      };
    }

    entry.lastUsed = Date.now();
    return probeSelectorInWebview(entry.view, payload);
  });
}

