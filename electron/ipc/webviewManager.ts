import { ipcMain, BrowserWindow, WebContentsView } from 'electron';

let webview: WebContentsView | null = null;

export function registerWebviewHandlers() {
  ipcMain.handle('open_child_webview', async (event, { url, x, y, width, height }) => {
    const parentWin = BrowserWindow.fromWebContents(event.sender);
    if (!parentWin) return;

    if (webview) {
      parentWin.contentView.removeChildView(webview);
      webview = null;
    }

    if (url && !url.startsWith('http://') && !url.startsWith('https://') && url !== 'about:blank') {
      console.warn(`Blocked invalid webview URL navigation attempt: ${url}`);
      return;
    }

    webview = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    parentWin.contentView.addChildView(webview);
    
    // Convert to integers since Electron expects integers
    webview.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
    webview.webContents.loadURL(url);
  });

  ipcMain.handle('resize_child_webview', async (event, { x, y, width, height }) => {
    if (webview) {
      webview.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
    }
  });

  ipcMain.handle('set_child_webview_visible', async (event, { visible }) => {
    if (webview) {
      // There's no direct visible flag on WebContentsView, we can set bounds to 0 or remove from parent
      // For now, if false, we can move it off-screen or remove
      // The cleaner way in newer electron is setting visibility on the WebContentsView or WebContents
      if (!visible) {
        webview.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      } else {
        // We'll rely on the frontend calling resize right after to restore bounds
      }
    }
  });

  ipcMain.handle('close_child_webview', async (event) => {
    const parentWin = BrowserWindow.fromWebContents(event.sender);
    if (parentWin && webview) {
      parentWin.contentView.removeChildView(webview);
      webview = null;
    }
  });
}
