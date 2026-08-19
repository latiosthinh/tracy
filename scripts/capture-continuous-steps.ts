import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'screenshots');
const APP_URL = 'http://localhost:5174';

async function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for dev server at ${url}`);
}

async function run() {
  console.log('Starting Vite web server...');
  const devProcess = spawn('npx', ['vite', '--config', 'vite.web.config.ts', '--port', '5174'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    stdio: 'pipe',
  });

  try {
    await waitForServer(APP_URL, 20000);
    console.log(`Server ready at ${APP_URL}`);

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    console.log('1. Navigating to app setup...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Step 1: Onboarding Agent Selection (OpenCode / Cloud)
    console.log('Step 1: Capturing Onboarding Agent Selection...');
    const cloudTab = page.locator('button[role="tab"]').nth(1);
    await cloudTab.click();
    await page.waitForTimeout(300);
    const agentCard = page.locator('div[role="button"]').first();
    await agentCard.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'step1-agent-selection.png') });

    // Step 2: Project Creation Wizard
    console.log('Step 2: Capturing Project Setup...');
    const nextBtn = page.locator('button:has-text("Next")').first();
    await nextBtn.click();
    await page.waitForTimeout(500);

    await page.fill('#wizard-project-name', 'E-Commerce Store Test Suite');
    await page.fill('#wizard-target-url', 'https://demo.playwright.dev/todomvc');
    await page.selectOption('#wizard-template-select', 'ecommerce');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'step2-project-setup.png') });

    // Step 3: Launch Studio IDE
    console.log('Step 3: Launching Studio IDE...');
    const launchBtn = page.locator('button[type="submit"]');
    await launchBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'step3-studio-ide.png') });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'studio-view.png') });

    // Step 4: Visual Step Editor & YAML Diff
    console.log('Step 4: Capturing YAML & Step Editor...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'step4-yaml-editor.png') });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'yaml-editor.png') });

    // Step 5: AI Copilot & Automation Recipe Generator
    console.log('Step 5: Capturing AI Copilot...');
    const aiCopilotTab = page.locator('button:has-text("AI Copilot")').first();
    if (await aiCopilotTab.isVisible()) {
      await aiCopilotTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'step5-ai-copilot.png') });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ai-copilot.png') });

    // Step 6: Settings & Multi-Provider AI Configuration
    console.log('Step 6: Capturing Settings Modal...');
    const settingsBtn = page.locator('button[aria-label*="Settings"], button:has-text("Settings")').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'step6-settings.png') });
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'settings.png') });
    }

    await browser.close();
    console.log('All continuous workflow screenshots generated!');
  } finally {
    devProcess.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
