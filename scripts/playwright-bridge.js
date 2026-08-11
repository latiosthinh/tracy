// Tracy Playwright Bridge Server
// Runs as a subprocess, controlled by Tauri Rust backend
// Communicates via stdin/stdout JSON protocol

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

let browser = null;
let context = null;
let page = null;

// Protocol: JSON messages over stdin
// Each line is a JSON object: { id, command, params }
// Response: { id, success, result?, error? }

import readline from 'readline';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function sendResponse(id, success, result = null, error = null) {
  const response = { id, success, result, error };
  process.stdout.write(JSON.stringify(response) + '\n');
}

function sendEvent(type, data) {
  const event = { event: type, data };
  process.stdout.write(JSON.stringify(event) + '\n');
}

function getBrowserExecutablePath() {
  // playwright-core can resolve paths from the playwright browser cache
  // (installed via `npx playwright install chromium` or playwright-chromium pkg)
  try {
    const exePath = chromium.executablePath();
    if (exePath && fs.existsSync(exePath)) {
      return exePath;
    }
  } catch (e) {
    // Fall through to manual search
  }

  // Try common locations for system Chrome/Chromium as fallback
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Linux
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'No Chromium/Chrome browser found. Run: npx playwright install chromium'
  );
}

async function handleCommand(id, command, params) {
  try {
    switch (command) {
      case 'launch': {
        const { headless = true, viewport = { width: 1280, height: 720 } } = params || {};

        // Close existing browser if any
        if (browser) {
          try { await browser.close(); } catch (_) {}
          browser = null; context = null; page = null;
        }

        const executablePath = getBrowserExecutablePath();

        browser = await chromium.launch({
          executablePath,
          headless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ],
        });

        context = await browser.newContext({
          viewport,
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ignoreHTTPSErrors: true,
        });

        page = await context.newPage();

        // Setup event listeners
        page.on('console', (msg) => {
          sendEvent('console', {
            type: msg.type(),
            text: msg.text(),
          });
        });

        page.on('pageerror', (error) => {
          sendEvent('pageerror', { message: error.message });
        });

        sendResponse(id, true, { launched: true, pid: process.pid });
        break;
      }

      case 'navigate': {
        if (!page) throw new Error('Browser not launched. Send a launch command first.');
        const { url, waitUntil = 'domcontentloaded' } = params || {};
        await page.goto(url, { waitUntil, timeout: 30000 });
        const currentUrl = page.url();
        const title = await page.title();
        sendResponse(id, true, { url: currentUrl, title });
        break;
      }

      case 'screenshot': {
        if (!page) throw new Error('Browser not launched');
        const { fullPage = false } = params || {};
        const screenshot = await page.screenshot({ fullPage, type: 'png' });
        const base64 = screenshot.toString('base64');
        sendResponse(id, true, { image: base64, mimeType: 'image/png' });
        break;
      }

      case 'navigateAndScreenshot': {
        if (!page) throw new Error('Browser not launched. Send a launch command first.');
        const { url, waitUntil = 'domcontentloaded' } = params || {};
        await page.goto(url, { waitUntil, timeout: 30000 });
        const currentUrl = page.url();
        const title = await page.title();
        const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
        const base64 = screenshot.toString('base64');
        sendResponse(id, true, { url: currentUrl, title, image: base64, mimeType: 'image/png' });
        break;
      }

      case 'click': {
        if (!page) throw new Error('Browser not launched');
        const { selector, text, testId, role, x, y } = params || {};
        if (x !== undefined && y !== undefined) {
          await page.mouse.click(x, y);
        } else {
          let target = selector;
          if (testId) target = `[data-testid="${testId}"]`;
          else if (role && text) target = `role=${role}[name="${text}"]`;
          else if (text) target = `text="${text}"`;
          await page.click(target, { timeout: 5000 });
        }
        sendResponse(id, true, { clicked: true });
        break;
      }

      case 'fill': {
        if (!page) throw new Error('Browser not launched');
        const { selector, text } = params || {};
        await page.fill(selector, text, { timeout: 5000 });
        sendResponse(id, true, { filled: selector });
        break;
      }

      case 'press': {
        if (!page) throw new Error('Browser not launched');
        const { key } = params || {};
        await page.keyboard.press(key);
        sendResponse(id, true, { pressed: key });
        break;
      }

      case 'interact': {
        if (!page) throw new Error('Browser not launched');
        const { action, x, y, deltaX, deltaY, key } = params || {};
        
        if (action === 'click') {
          // Scroll the page so the target is within the viewport
          await page.evaluate(({y}) => window.scrollTo(0, Math.max(0, y - 200)), { y });
          // Calculate viewport-relative Y for mouse.click
          const viewportY = await page.evaluate(({y}) => y - window.scrollY, { y });
          await page.mouse.click(x, viewportY);
        } else if (action === 'scroll') {
          await page.mouse.wheel(deltaX || 0, deltaY || 0);
        } else if (action === 'keydown') {
          await page.keyboard.press(key);
        }
        
        // Wait a tiny bit for any immediate visual changes to process
        await new Promise(r => setTimeout(r, 50));
        
        const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
        const base64 = screenshot.toString('base64');
        const currentUrl = page.url();
        const title = await page.title();
        
        sendResponse(id, true, { url: currentUrl, title, image: base64, mimeType: 'image/png' });
        break;
      }

      case 'evaluate': {
        if (!page) throw new Error('Browser not launched');
        const { script } = params || {};
        const result = await page.evaluate(script);
        sendResponse(id, true, { result });
        break;
      }

      case 'getDomTree': {
        if (!page) throw new Error('Browser not launched');
        const domTree = await page.evaluate(() => {
          function extractNode(el, depth = 0) {
            if (!el || el.nodeType !== 1) return null;
            const tag = el.tagName.toLowerCase();
            const skip = ['script', 'style', 'noscript', 'link', 'meta', 'head'];
            if (skip.includes(tag)) return null;
            if (depth > 12) return null;

            const node = {
              tag,
              id: el.id || undefined,
              classes: el.className ? el.className.split(' ').filter(Boolean) : [],
              text:
                el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
                  ? el.childNodes[0].textContent.trim().slice(0, 100) || undefined
                  : undefined,
              role: el.getAttribute('role') || undefined,
              testId: el.getAttribute('data-testid') || undefined,
              href: el.getAttribute('href') || undefined,
              name: el.getAttribute('name') || undefined,
              type: el.getAttribute('type') || undefined,
              placeholder: el.getAttribute('placeholder') || undefined,
              isInteractive:
                ['a', 'button', 'input', 'select', 'textarea'].includes(tag) ||
                !!el.getAttribute('role'),
              isVisible: el.offsetParent !== null,
            };

            const children = [];
            for (const child of el.children) {
              const childNode = extractNode(child, depth + 1);
              if (childNode) children.push(childNode);
            }
            if (children.length > 0) node.children = children;

            return node;
          }
          return extractNode(document.body);
        });
        sendResponse(id, true, { domTree });
        break;
      }

      case 'inspectElementAtPoint': {
        if (!page) throw new Error('Browser not launched');
        const { x, y } = params || {};
        const elementDetails = await page.evaluate(({ x, y }) => {
          // Scroll the page so the target is within the viewport
          const viewportY = y - window.scrollY;
          const el = document.elementFromPoint(x, viewportY);
          if (!el) return null;
          
          const rect = el.getBoundingClientRect();
          return {
            tagName: el.tagName.toLowerCase(),
            text: el.innerText ? el.innerText.trim().slice(0, 40) : (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.tagName.toLowerCase()),
            id: el.id || undefined,
            testId: el.getAttribute('data-testid') || undefined,
            role: el.getAttribute('role') || el.tagName.toLowerCase(),
            label: el.getAttribute('aria-label') || undefined,
            placeholder: el.getAttribute('placeholder') || undefined,
            className: el.className || undefined,
            rect: {
              x: rect.x + window.scrollX,
              y: rect.y + window.scrollY,
              width: rect.width,
              height: rect.height
            }
          };
        }, { x, y });
        sendResponse(id, true, { element: elementDetails });
        break;
      }

      case 'getUrl': {
        if (!page) throw new Error('Browser not launched');
        const url = page.url();
        const title = await page.title();
        sendResponse(id, true, { url, title });
        break;
      }

      case 'setViewport': {
        if (!page) throw new Error('Browser not launched');
        const { width, height } = params || {};
        await page.setViewportSize({ width, height });
        sendResponse(id, true, { viewport: { width, height } });
        break;
      }

      case 'close': {
        if (browser) {
          try { await browser.close(); } catch (_) {}
          browser = null;
          context = null;
          page = null;
        }
        sendResponse(id, true, { closed: true });
        break;
      }

      case 'ping': {
        sendResponse(id, true, { pong: true, pid: process.pid });
        break;
      }

      default:
        sendResponse(id, false, null, `Unknown command: ${command}`);
    }
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

// Main loop — process one line at a time
rl.on('line', async (line) => {
  if (!line.trim()) return;

  try {
    const msg = JSON.parse(line);
    const { id, command, params } = msg;
    await handleCommand(id, command, params);
  } catch (error) {
    sendResponse(null, false, null, `Invalid message: ${error.message}`);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  if (browser) { try { await browser.close(); } catch (_) {} }
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (browser) { try { await browser.close(); } catch (_) {} }
  process.exit(0);
});

// Send ready signal (goes to stderr to avoid polluting stdout protocol)
process.stderr.write(`[playwright-bridge] PID ${process.pid} ready\n`);
// Also send a stdout event so Rust knows the process is up
sendEvent('ready', { pid: process.pid });
