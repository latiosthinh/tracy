import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import { chromium, Browser, Page, BrowserContext } from 'playwright-core';
import { runCompactObserve, formatCompactTree, discoverSiteUrls, authenticate } from 'dom-miner';

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
    let currentPage = await getActivePage();
    if (!currentPage) throw new Error('Browser not launched');

    const results = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      event.sender.send('mine_progress', `Mining page ${i + 1}/${targets.length}: ${target.url}`);
      
      try {
        await currentPage.goto(target.url, { waitUntil: 'load', timeout: 20000 });
        
        if (target.credential?.username || target.credential?.password) {
          event.sender.send('mine_progress', `Authenticating on ${target.url}...`);
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
      event.sender.send('mine_progress', `Restoring original page...`);
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
      try {
        // Expose binding if not already exposed
        await page.exposeFunction('__tracyEmitEvent', (type: string, data: any) => {
          const wins = require('electron').BrowserWindow.getAllWindows();
          if (wins[0]) wins[0].webContents.send('browser-event', { type, data });
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
}
