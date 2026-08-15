import { ipcMain, BrowserWindow, WebContentsView } from 'electron';

const MAX_LIVE_WEBVIEWS = 4;

interface WebviewEntry {
  view: WebContentsView;
  lastUsed: number;
}

const webviews = new Map<string, WebviewEntry>();

function isValidProjectId(projectId: unknown): projectId is string {
  return typeof projectId === 'string' && projectId.length > 0 && projectId.length <= 128;
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

export function registerWebviewHandlers() {
  ipcMain.handle('open_child_webview', async (event, { projectId, url, x, y, width, height }) => {
    if (!isValidProjectId(projectId)) {
      console.warn(`Blocked invalid webview projectId: ${projectId}`);
      return;
    }

    if (url && !url.startsWith('http://') && !url.startsWith('https://') && url !== 'about:blank') {
      console.warn(`Blocked invalid webview URL navigation attempt: ${url}`);
      return;
    }

    const parentWin = BrowserWindow.fromWebContents(event.sender);
    if (!parentWin) return;

    if (webviews.has(projectId)) {
      const entry = webviews.get(projectId)!;
      entry.lastUsed = Date.now();

      try {
        parentWin.contentView.removeChildView(entry.view);
      } catch {
        // Ignored if not attached
      }
      parentWin.contentView.addChildView(entry.view);
      entry.view.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
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

    parentWin.contentView.addChildView(view);
    view.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
    if (url) {
      view.webContents.loadURL(url);
    }

    webviews.set(projectId, { view, lastUsed: Date.now() });
    evictIfNeeded(parentWin);
  });

  ipcMain.handle('resize_child_webview', async (event, { projectId, x, y, width, height }) => {
    if (!isValidProjectId(projectId)) return;
    const entry = webviews.get(projectId);
    if (!entry) return;

    entry.view.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
    entry.lastUsed = Date.now();
  });

  ipcMain.handle('set_child_webview_visible', async (event, { projectId, visible }) => {
    if (!isValidProjectId(projectId)) return;
    const entry = webviews.get(projectId);
    if (!entry) return;

    if (!visible) {
      entry.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
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
}
