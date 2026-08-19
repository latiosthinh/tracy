import { BrowserWindow, ipcMain } from 'electron';
import { chromium, Browser, Page, BrowserContext } from 'playwright-core';
import { runCompactObserve, formatCompactTree, authenticate } from 'dom-miner';
import { isAllowedNavigationUrl } from './webviewManager.js';
import { executeStepWithHealing } from '../core/healing/selfHealingRunner.js';
import { patchYamlFile } from '../core/healing/yamlPatcher.js';
import { saveHealArtifacts, saveFailureArtifacts } from '../core/healing/artifactManager.js';
import * as path from 'node:path';

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

export function registerPlaywrightHandlers() {
  ipcMain.handle('launch_browser', async (event, { headless }) => {
    if (!browser) {
      // Connect to the Electron instance itself via CDP
      browser = await chromium.connectOverCDP('http://localhost:9222');
    }
    // Find the target page (WebContentsView) which is not the main Electron UI
    context = browser.contexts()[0];
    
    // We don't create a new page, we'll find the right one dynamically in navigate/inspect
    page = null;
  });

  const getActivePage = async () => {
    if (!context) return null;
    const pages = context.pages();
    // Find a page that is NOT the main Electron UI (localhost:5173 or file://)
    return pages.find(p => !p.url().includes('localhost:5173') && !p.url().startsWith('file://')) || pages[0];
  };

  ipcMain.handle('navigate_browser', async (event, { url }) => {
    if (!isAllowedNavigationUrl(url)) {
      throw new Error(`Navigation blocked: URL scheme not permitted "${url}"`);
    }

    page = await getActivePage();
    if (!page) throw new Error('Browser not launched or page not found');
    
    if (page.url() !== url) {
      await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    }
    
    const title = await page.title();
    const screenshot = await page.screenshot({ type: 'png' });
    
    return {
      url: page.url(),
      title,
      image: screenshot.toString('base64'),
      mimeType: 'image/png'
    };
  });

  ipcMain.handle('get_browser_screenshot', async () => {
    page = await getActivePage();
    if (!page) throw new Error('Browser not launched');
    const screenshot = await page.screenshot({ type: 'png' });
    return screenshot.toString('base64');
  });

  ipcMain.handle('get_browser_dom_tree', async () => {
    page = await getActivePage();
    if (!page) throw new Error('Browser not launched');
    
    const compactData = await runCompactObserve(page);
    const treeText = formatCompactTree(compactData);

    return {
      url: compactData.url,
      title: compactData.title,
      tree: treeText,
      stats: {
        totalNodes: compactData.textHolderCount + compactData.interactableCount,
        interactiveNodes: compactData.interactableCount,
        textHolders: compactData.textHolderCount,
        visibleNodes: compactData.visibleCount
      }
    };
  });

  ipcMain.handle('mine_batch_urls', async (event, { targets, returnToUrl }: { targets: any[], returnToUrl?: string }) => {
    const currentPage = await getActivePage();
    if (!currentPage) throw new Error('Browser not launched');

    if (returnToUrl && !isAllowedNavigationUrl(returnToUrl)) {
      throw new Error(`Mining blocked: invalid return URL "${returnToUrl}"`);
    }

    const results = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!target?.url || !isAllowedNavigationUrl(target.url)) {
        console.warn(`Skipping invalid target URL in mine_batch_urls: ${target?.url}`);
        continue;
      }
      if (!event.sender.isDestroyed()) {
        event.sender.send('mine_progress', `Mining page ${i + 1}/${targets.length}: ${target.url}`);
      }
      
      try {
        await currentPage.goto(target.url, { waitUntil: 'load', timeout: 20000 });
        
        if (target.credential?.username || target.credential?.password) {
          if (!event.sender.isDestroyed()) {
            event.sender.send('mine_progress', `Authenticating on ${target.url}...`);
          }
          try {
            await authenticate(currentPage, target.credential);
            await new Promise(r => setTimeout(r, 3000));
          } catch(authErr) {
            console.error(`Auth failed for ${target.url}:`, authErr);
          }
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }
        
        const compactData = await runCompactObserve(currentPage);
        const treeText = formatCompactTree(compactData);
        
        results.push({
          url: compactData.url,
          title: compactData.title,
          tree: treeText,
          stats: {
            totalNodes: compactData.textHolderCount + compactData.interactableCount,
            interactiveNodes: compactData.interactableCount,
            textHolders: compactData.textHolderCount,
            visibleNodes: compactData.visibleCount
          }
        });
      } catch (err) {
        console.error(`Failed to mine ${target.url}:`, err);
      }
    }

    if (returnToUrl) {
      if (!event.sender.isDestroyed()) {
        event.sender.send('mine_progress', `Restoring original page...`);
      }
      try {
        await currentPage.goto(returnToUrl, { waitUntil: 'load', timeout: 15000 });
      } catch(e) {}
    }
    
    return results;
  });

  ipcMain.handle('inspect_element_at_point', async (event, { x, y }) => {
    page = await getActivePage();
    if (!page) throw new Error('Browser not launched');
    const element = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        tagName: el.tagName,
        text: el.textContent,
        id: el.id,
        testId: el.getAttribute('data-testid'),
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label'),
        placeholder: el.getAttribute('placeholder'),
        className: el.className,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        }
      };
    }, { x, y });
    return { element };
  });

  ipcMain.handle('interact_browser', async (event, params) => {
    page = await getActivePage();
    if (!page) throw new Error('Browser not launched');
    const { action, x, y, key, deltaX, deltaY } = params;

    if (action === 'click' && x != null && y != null) {
      await page.mouse.click(x, y);
    } else if (action === 'keydown' && key) {
      await page.keyboard.press(key);
    } else if (action === 'scroll' && deltaX != null && deltaY != null) {
      await page.mouse.wheel(deltaX, deltaY);
    }

    // Wait network idle roughly
    await page.waitForTimeout(500);

    const title = await page.title();
    const screenshot = await page.screenshot({ type: 'png' });
    
    return {
      url: page.url(),
      title,
      image: screenshot.toString('base64'),
      mimeType: 'image/png'
    };
  });

  let currentMode = 'idle';

  ipcMain.handle('set_browser_mode', async (event, { mode }) => {
    currentMode = mode;
    page = await getActivePage();
    if (!page) return;

    // First cleanup any existing bindings
    try {
      await page.evaluate(() => {
        if ((window as any).__tracyCleanup) (window as any).__tracyCleanup();
      });
    } catch (e) {}

    if (mode === 'inspect' || mode === 'record') {
      const win = BrowserWindow.fromWebContents(event.sender);
      try {
        // Expose binding if not already exposed
        await page.exposeFunction('__tracyEmitEvent', (type: string, data: any) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('browser-event', { type, data });
          } else {
            const wins = BrowserWindow.getAllWindows();
            if (wins[0] && !wins[0].isDestroyed()) {
              wins[0].webContents.send('browser-event', { type, data });
            }
          }
        });
      } catch (e) {
        // ignore if already exposed
      }

      await page.evaluate((currentMode) => {
        let lastHighlighted: HTMLElement | null = null;
        
        const over = (e: MouseEvent) => {
          if (lastHighlighted) lastHighlighted.style.outline = '';
          lastHighlighted = e.target as HTMLElement;
          if (lastHighlighted) {
            lastHighlighted.style.outline = '2px solid #3b82f6';
            lastHighlighted.style.outlineOffset = '-2px';
            lastHighlighted.style.cursor = 'crosshair';
          }
        };

        const out = (e: MouseEvent) => {
          if (lastHighlighted) {
            lastHighlighted.style.outline = '';
            lastHighlighted.style.cursor = '';
            lastHighlighted = null;
          }
        };

        const click = (e: MouseEvent) => {
          if (currentMode === 'inspect') {
            e.preventDefault();
            e.stopPropagation();
          }
          
          if (lastHighlighted) {
            lastHighlighted.style.outline = '';
          }

          const target = e.target as HTMLElement;
          const rect = target.getBoundingClientRect();
          
          (window as any).__tracyEmitEvent(currentMode === 'inspect' ? 'inspect-click' : 'record-click', {
            tagName: target.tagName,
            text: target.textContent,
            id: target.id,
            className: target.className,
            testId: target.getAttribute('data-testid'),
            role: target.getAttribute('role'),
            placeholder: target.getAttribute('placeholder'),
            label: target.getAttribute('aria-label'),
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          });
        };

        document.addEventListener('mouseover', over, true);
        document.addEventListener('mouseout', out, true);
        document.addEventListener('click', click, true);

        (window as any).__tracyCleanup = () => {
          document.removeEventListener('mouseover', over, true);
          document.removeEventListener('mouseout', out, true);
          document.removeEventListener('click', click, true);
          if (lastHighlighted) {
            lastHighlighted.style.outline = '';
            lastHighlighted.style.cursor = '';
          }
        };
      }, mode);
    }
  });

  // ── run_flow: Execute a full flow step-by-step ──────────────────────────
  ipcMain.handle('run_flow', async (event, { flow, targetBaseUrl, speedMs }: { flow: any; targetBaseUrl: string; speedMs: number }) => {
    let currentPage = await getActivePage();
    if (!currentPage) {
      // Auto-launch if not already connected
      if (!browser) {
        browser = await chromium.connectOverCDP('http://localhost:9222');
      }
      context = browser.contexts()[0];
      currentPage = await getActivePage();
    }
    if (!currentPage) throw new Error('Browser not launched — cannot execute flow');

    const steps: any[] = flow.steps || [];
    const sender = event.sender;

    const sendLog = (level: string, stepIndex: number, message: string) => {
      if (!sender.isDestroyed()) {
        sender.send('execution-log', {
          id: `log-${Date.now()}-${stepIndex}`,
          timestamp: new Date().toLocaleTimeString(),
          level,
          stepIndex,
          message,
        });
      }
    };

    const sendStepUpdate = (stepIndex: number, status: string, durationMs?: number, errorMessage?: string, healResult?: any) => {
      if (!sender.isDestroyed()) {
        sender.send('step-update', { stepIndex, status, durationMs, errorMessage, healResult });
      }
    };

    /**
     * Resolve the selector/locator for a step target.
     */
    const resolveLocator = (target: any) => {
      if (!target || !currentPage) return null;

      if (typeof target === 'string') {
        if (target.startsWith('#') || target.startsWith('.') || target.startsWith('/') || target.startsWith('css=') || target.startsWith('xpath=')) {
          return currentPage.locator(target);
        }
        return currentPage.getByText(target, { exact: false });
      }

      if (target.type && target.value) {
        switch (target.type) {
          case 'testId': return currentPage.getByTestId(target.value);
          case 'role': return currentPage.getByRole(target.value as any, { name: target.name });
          case 'label': return currentPage.getByLabel(target.value);
          case 'placeholder': return currentPage.getByPlaceholder(target.value);
          case 'text': return currentPage.getByText(target.value, { exact: target.exact ?? false });
          case 'css': return currentPage.locator(target.value);
          case 'xpath': return currentPage.locator(`xpath=${target.value}`);
          case 'id': return currentPage.locator(`#${target.value}`);
        }
      }

      if (target.testId) return currentPage.getByTestId(target.testId);
      if (target.role && target.name) return currentPage.getByRole(target.role, { name: target.name });
      if (target.role) return currentPage.getByRole(target.role);
      if (target.label) return currentPage.getByLabel(target.label);
      if (target.placeholder) return currentPage.getByPlaceholder(target.placeholder);
      if (target.text) return currentPage.getByText(target.text, { exact: target.exact ?? false });
      if (target.css) return currentPage.locator(target.css);
      if (target.xpath) return currentPage.locator(`xpath=${target.xpath}`);
      if (target.id) return currentPage.locator(`#${target.id}`);

      return null;
    };

    const flowFilePath = flow.filePath || flow.path;
    const flowName = flow.name || 'unnamed-flow';
    const outputDir = path.join(process.cwd(), 'test-results');
    const autoHealEnabled = flow.autoHeal !== false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStart = Date.now();
      const cmd = step.command;

      sendStepUpdate(i, 'running');
      sendLog('info', i, `▶ Step ${i + 1}: ${cmd}`);

      try {
        const timeout = step.timeout || 10000;

        switch (cmd) {
          case 'navigate': {
            const url = step.value || step.target || '/';
            const fullUrl = url.startsWith('http://') || url.startsWith('https://') || url === 'about:blank'
              ? url
              : `${targetBaseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
            
            if (!isAllowedNavigationUrl(fullUrl)) {
              throw new Error(`Flow step navigate blocked: URL "${fullUrl}" is not allowed`);
            }

            await currentPage.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout });
            break;
          }

          case 'leftClick':
          case 'tap':
          case 'doubleClick':
          case 'rightClick':
          case 'hover':
          case 'fill':
          case 'eraseText':
          case 'press': {
            const healableStep = {
              action: cmd,
              selector: typeof step.target === 'string' ? step.target : step.target?.value || (typeof step.target === 'object' ? JSON.stringify(step.target) : undefined),
              target: step.target,
              value: step.value,
              text: step.value || (typeof step.target === 'string' ? step.target : undefined),
              key: step.value || step.target || 'Enter',
              timeout,
            };

            const result = await executeStepWithHealing(currentPage, healableStep, {
              autoHeal: autoHealEnabled,
              timeoutMs: timeout,
              onLog: (level, msg) => sendLog(level, i, msg),
            });

            if (!result.success) {
              throw new Error(result.error || 'Step execution failed');
            }

            if (result.healed && result.healingDetails) {
              const artifacts = await saveHealArtifacts({
                outputDir,
                flowName,
                stepIndex: i,
                page: currentPage,
                healingResult: result.healingDetails,
              });

              if (flowFilePath && autoHealEnabled) {
                try {
                  await patchYamlFile(flowFilePath, i, result.healingDetails.healedSelector, {
                    confidence: result.healingDetails.confidence,
                    healedAt: new Date().toISOString(),
                  });
                  sendLog('info', i, `💾 Auto-patched YAML file: "${flowFilePath}"`);
                } catch (patchErr: any) {
                  sendLog('warn', i, `Failed to patch YAML file: ${patchErr.message || patchErr}`);
                }
              }

              const healResult = {
                healed: true,
                strategy: result.healingDetails.strategy,
                originalSelector: result.healingDetails.originalSelector,
                healedSelector: result.healingDetails.healedSelector,
                confidence: result.healingDetails.confidence,
                reason: result.healingDetails.reason,
                artifacts: {
                  screenshotPath: artifacts.screenshotPath,
                  domSnapshotPath: artifacts.domSnapshotPath,
                },
              };

              const durationMs = Date.now() - stepStart;
              sendStepUpdate(i, 'passed', durationMs, undefined, healResult);
              sendLog(
                'assertion',
                i,
                `⚡ Self-healed step ${i + 1}: "${result.healingDetails.originalSelector}" -> "${result.healingDetails.healedSelector}" (confidence: ${Math.round(result.healingDetails.confidence * 100)}%)`
              );
              continue;
            }
            break;
          }

          case 'selectOption': {
            const loc = resolveLocator(step.target);
            if (loc && step.value) await loc.selectOption(step.value, { timeout });
            break;
          }

          case 'uploadFile': {
            const loc = resolveLocator(step.target);
            if (loc && step.value) await loc.setInputFiles(step.value, { timeout });
            break;
          }

          case 'waitFor': {
            const val = step.value || step.target;
            if (val === 'networkIdle' || val === 'load') {
              await currentPage.waitForLoadState(val === 'networkIdle' ? 'networkidle' : 'load', { timeout });
            } else if (typeof val === 'number' || /^\d+$/.test(val)) {
              await currentPage.waitForTimeout(Number(val));
            } else {
              await currentPage.waitForSelector(val, { timeout });
            }
            break;
          }

          case 'wait': {
            const ms = Number(step.value || step.target || 1000);
            await currentPage.waitForTimeout(ms);
            break;
          }

          case 'waitForNetwork': {
            await currentPage.waitForLoadState('networkidle', { timeout });
            break;
          }

          case 'assertVisible': {
            const loc = resolveLocator(step.target || step.value);
            if (loc) await loc.waitFor({ state: 'visible', timeout });
            break;
          }

          case 'assertNotVisible': {
            const loc = resolveLocator(step.target || step.value);
            if (loc) await loc.waitFor({ state: 'hidden', timeout });
            break;
          }

          case 'assertTitle': {
            const expected = step.value || step.target || '';
            const title = await currentPage.title();
            if (!title.includes(expected)) {
              throw new Error(`Title "${title}" does not contain "${expected}"`);
            }
            break;
          }

          case 'assertUrl': {
            const expected = step.value || step.target || '';
            const url = currentPage.url();
            if (!url.includes(expected)) {
              throw new Error(`URL "${url}" does not contain "${expected}"`);
            }
            break;
          }

          case 'assertTrue': {
            const expr = step.value || step.target || 'true';
            try {
              const result = await currentPage.evaluate(expr);
              if (!result) throw new Error(`Assertion failed for expression: ${expr}`);
            } catch (evalErr: any) {
              throw new Error(`assertTrue evaluation error: ${evalErr.message || String(evalErr)}`);
            }
            break;
          }

          case 'copyTextFrom': {
            const loc = resolveLocator(step.target);
            if (loc) {
              const content = await loc.innerText({ timeout });
              sendLog('info', i, `Copied text from element: "${content}"`);
            }
            break;
          }

          case 'scroll': {
            const distance = Number(step.args?.distance || step.value || 300);
            const direction = step.args?.direction || 'down';
            const deltaY = direction === 'up' ? -distance : distance;
            await currentPage.mouse.wheel(0, deltaY);
            break;
          }

          case 'setViewport': {
            const width = step.args?.width || 1280;
            const height = step.args?.height || 720;
            await currentPage.setViewportSize({ width, height });
            break;
          }

          case 'takeScreenshot': {
            await currentPage.screenshot({ type: 'png' });
            break;
          }

          case 'clearCookies': {
            if (context) await context.clearCookies();
            break;
          }

          case 'clearStorage': {
            await currentPage.evaluate(() => {
              localStorage.clear();
              sessionStorage.clear();
            });
            break;
          }

          case 'evalScript': {
            const script = step.value || step.target || '';
            await currentPage.evaluate(script);
            break;
          }

          default:
            sendLog('warn', i, `⚠ Step ${i + 1}: Command "${cmd}" not yet implemented — skipping`);
            sendStepUpdate(i, 'skipped', Date.now() - stepStart);
            continue;
        }

        const durationMs = Date.now() - stepStart;
        sendStepUpdate(i, 'passed', durationMs);
        sendLog('assertion', i, `✅ Step ${i + 1} PASSED (${durationMs}ms)`);

      } catch (err: any) {
        const durationMs = Date.now() - stepStart;
        const errorMessage = err.message || 'Unknown error';

        const failArtifacts = await saveFailureArtifacts({
          outputDir,
          flowName,
          stepIndex: i,
          page: currentPage,
          error: errorMessage,
        });

        sendStepUpdate(i, 'failed', durationMs, errorMessage, {
          healed: false,
          artifacts: {
            screenshotPath: failArtifacts.screenshotPath,
            domSnapshotPath: failArtifacts.domSnapshotPath,
          },
        });
        sendLog('error', i, `❌ Step ${i + 1} FAILED: ${errorMessage}`);

        // Stop on failure unless continueOnFailure is set
        if (!flow.metadata?.continueOnFailure) break;
      }

      // Inter-step delay
      if (speedMs > 0) {
        await new Promise(r => setTimeout(r, speedMs));
      }
    }
  });
}
