import { ipcMain, BrowserWindow, WebContentsView } from 'electron';

const MAX_LIVE_WEBVIEWS = 4;

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
}
