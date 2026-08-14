/**
 * Screenshot Capture Script for README Documentation
 *
 * This script uses Playwright to launch Tracy and capture key UI screens
 * for the README documentation.
 *
 * Usage: npx tsx scripts/capture-screenshots.ts
 *
 * Requires: Tracy desktop app running via `pnpm dev` (port 5173)
 * Output: public/screenshots/*.png at 1400x900 viewport
 */

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'screenshots');
const APP_URL = 'http://localhost:5173'; // Electron Vite dev server
const VIEWPORT = { width: 1400, height: 900 };

interface ScreenCapture {
  name: string;
  url: string;
  description: string;
}

const SCREENS: ScreenCapture[] = [
  {
    name: 'studio-view.png',
    url: APP_URL,
    description: 'Full tri-pane layout — browser preview, YAML editor, project sidebar',
  },
  {
    name: 'yaml-editor.png',
    url: `${APP_URL}#editor`,
    description: 'Syntax-highlighted YAML editor with AI-assisted autocomplete',
  },
  {
    name: 'ai-copilot.png',
    url: `${APP_URL}`,
    description: 'AI Copilot panel with prompt input and generated flow output',
  },
  {
    name: 'dom-miner.png',
    url: `${APP_URL}`,
    description: 'DOM mining panel showing captured snapshot tree',
  },
  {
    name: 'settings.png',
    url: `${APP_URL}#settings`,
    description: 'Settings modal with agent provider configuration options',
  },
];

async function captureScreenshots() {
  console.log('Starting Tracy screenshot capture...');
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    for (const screen of SCREENS) {
      console.log(`Capturing: ${screen.name} — ${screen.description}`);

      await page.goto(screen.url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait a moment for any animations/JS to settle
      await page.waitForTimeout(1500);

      const outputPath = path.join(OUTPUT_DIR, screen.name);
      await page.screenshot({ path: outputPath, fullPage: false });

      console.log(`  -> Saved: ${outputPath}`);
    }

    console.log(`\nDone! ${SCREENS.length} screenshots saved to ${OUTPUT_DIR}`);
  } catch (err) {
    console.error('Screenshot capture failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
