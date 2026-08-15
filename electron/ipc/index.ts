import { registerFileSystemHandlers } from './fileSystem.js';
import { registerWebviewHandlers } from './webviewManager.js';
import { registerAiConfigHandlers } from './aiConfig.js';

let playwrightRegistered = false;

export async function registerIpcHandlers() {
  registerFileSystemHandlers();
  registerWebviewHandlers();
  await registerAiConfigHandlers();

  // Playwright handlers are deferred — only loaded when first needed
  if (!playwrightRegistered) {
    playwrightRegistered = true;
    const { registerPlaywrightHandlers } = await import('./playwrightEngine.js');
    registerPlaywrightHandlers();
  }
}
