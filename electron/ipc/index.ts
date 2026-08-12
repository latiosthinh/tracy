import { ipcMain } from 'electron';
import { registerFileSystemHandlers } from './fileSystem.js';
import { registerPlaywrightHandlers } from './playwrightEngine.js';
import { registerWebviewHandlers } from './webviewManager.js';

export function registerIpcHandlers() {
  registerFileSystemHandlers();
  registerPlaywrightHandlers();
  registerWebviewHandlers();
}
