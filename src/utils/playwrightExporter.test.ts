import { describe, it, expect } from 'vitest';
import { exportFlowToPlaywrightTs } from './playwrightExporter';
import type { FlowFile } from '@/src/types/flow';

function createMockFlow(overrides: Partial<FlowFile> = {}): FlowFile {
  return {
    id: 'test-flow-1',
    name: 'User Checkout Flow',
    path: 'flows/checkout.yaml',
    category: 'E2E',
    tags: ['smoke', 'e2e'],
    metadata: {
      url: 'https://shop.example.com',
      viewport: { width: 1280, height: 720 },
      timeout: 10000,
    },
    yamlContent: '',
    steps: [],
    ...overrides,
  };
}

describe('exportFlowToPlaywrightTs', () => {
  it('generates standard Playwright imports and test wrapper', () => {
    const flow = createMockFlow();
    const code = exportFlowToPlaywrightTs(flow);

    expect(code).toContain("import { test, expect } from '@playwright/test';");
    expect(code).toContain("test.describe('User Checkout Flow', () => {");
    expect(code).toContain("test('should execute User Checkout Flow successfully', async ({ page }) => {");
  });

  it('generates navigate step with absolute and relative URLs', () => {
    const flow = createMockFlow({
      steps: [
        { id: '1', command: 'navigate', value: '/products', status: 'pending' },
        { id: '2', command: 'navigate', value: 'https://other.com/login', status: 'pending' },
      ],
    });
    const code = exportFlowToPlaywrightTs(flow, 'https://shop.example.com');

    expect(code).toContain("await page.goto('https://shop.example.com/products');");
    expect(code).toContain("await page.goto('https://other.com/login');");
  });

  it('generates locators for various selector types', () => {
    const flow = createMockFlow({
      steps: [
        { id: '1', command: 'leftClick', target: { type: 'testId', value: 'checkout-btn' }, status: 'pending' },
        { id: '2', command: 'leftClick', target: { type: 'role', value: 'button', name: 'Submit' }, status: 'pending' },
        { id: '3', command: 'leftClick', target: { type: 'label', value: 'Username' }, status: 'pending' },
        { id: '4', command: 'leftClick', target: { type: 'placeholder', value: 'Search...' }, status: 'pending' },
        { id: '5', command: 'leftClick', target: { type: 'text', value: 'Click Me' }, status: 'pending' },
        { id: '6', command: 'leftClick', target: { type: 'css', value: '.btn-primary' }, status: 'pending' },
        { id: '7', command: 'leftClick', target: { type: 'id', value: 'custom-id' }, status: 'pending' },
        { id: '8', command: 'leftClick', target: { type: 'xpath', value: '//button[1]' }, status: 'pending' },
        { id: '9', command: 'leftClick', target: '#submit', status: 'pending' },
        { id: '10', command: 'leftClick', target: 'Simple Button', status: 'pending' },
      ],
    });
    const code = exportFlowToPlaywrightTs(flow);

    expect(code).toContain("await page.getByTestId('checkout-btn').click();");
    expect(code).toContain("await page.getByRole('button', { name: 'Submit' }).click();");
    expect(code).toContain("await page.getByLabel('Username').click();");
    expect(code).toContain("await page.getByPlaceholder('Search...').click();");
    expect(code).toContain("await page.getByText('Click Me').click();");
    expect(code).toContain("await page.locator('.btn-primary').click();");
    expect(code).toContain("await page.locator('#custom-id').click();");
    expect(code).toContain("await page.locator('xpath=//button[1]').click();");
    expect(code).toContain("await page.locator('#submit').click();");
    expect(code).toContain("await page.getByText('Simple Button').click();");
  });

  it('generates click variations (doubleClick, rightClick, tap)', () => {
    const flow = createMockFlow({
      steps: [
        { id: '1', command: 'doubleClick', target: '#row-1', status: 'pending' },
        { id: '2', command: 'rightClick', target: '#context-menu', status: 'pending' },
        { id: '3', command: 'tap', target: '#mobile-tab', status: 'pending' },
        { id: '4', command: 'hover', target: '#nav-dropdown', status: 'pending' },
      ],
    });
    const code = exportFlowToPlaywrightTs(flow);

    expect(code).toContain("await page.locator('#row-1').dblclick();");
    expect(code).toContain("await page.locator('#context-menu').click({ button: 'right' });");
    expect(code).toContain("await page.locator('#mobile-tab').click();");
    expect(code).toContain("await page.locator('#nav-dropdown').hover();");
  });

  it('generates fill, eraseText, press, selectOption, and uploadFile', () => {
    const flow = createMockFlow({
      steps: [
        { id: '1', command: 'fill', target: { type: 'placeholder', value: 'Email' }, value: 'alex@example.com', status: 'pending' },
        { id: '2', command: 'eraseText', target: '#search-box', status: 'pending' },
        { id: '3', command: 'press', value: 'Enter', status: 'pending' },
        { id: '4', command: 'selectOption', target: '#country', value: 'US', status: 'pending' },
        { id: '5', command: 'uploadFile', target: '#avatar-upload', value: 'fixtures/avatar.png', status: 'pending' },
      ],
    });
    const code = exportFlowToPlaywrightTs(flow);

    expect(code).toContain("await page.getByPlaceholder('Email').fill('alex@example.com');");
    expect(code).toContain("await page.locator('#search-box').fill('');");
    expect(code).toContain("await page.keyboard.press('Enter');");
    expect(code).toContain("await page.locator('#country').selectOption('US');");
    expect(code).toContain("await page.locator('#avatar-upload').setInputFiles('fixtures/avatar.png');");
  });

  it('generates wait conditions (waitFor, wait, waitForNetwork)', () => {
    const flow = createMockFlow({
      steps: [
        { id: '1', command: 'waitFor', value: 'networkIdle', status: 'pending' },
        { id: '2', command: 'waitFor', value: 'load', status: 'pending' },
        { id: '3', command: 'waitFor', value: '2000', status: 'pending' },
        { id: '4', command: 'waitFor', value: '#modal-content', status: 'pending' },
        { id: '5', command: 'wait', value: '1500', status: 'pending' },
        { id: '6', command: 'waitForNetwork', status: 'pending' },
      ],
    });
    const code = exportFlowToPlaywrightTs(flow);

    expect(code).toContain("await page.waitForLoadState('networkidle');");
    expect(code).toContain("await page.waitForLoadState('load');");
    expect(code).toContain("await page.waitForTimeout(2000);");
    expect(code).toContain("await page.waitForSelector('#modal-content');");
    expect(code).toContain("await page.waitForTimeout(1500);");
    expect(code).toContain("await page.waitForLoadState('networkidle');");
  });

  it('generates assertions (assertVisible, assertNotVisible, assertTitle, assertUrl, assertTrue, assertText)', () => {
    const flow = createMockFlow({
      steps: [
        { id: '1', command: 'assertVisible', target: { type: 'testId', value: 'success-alert' }, status: 'pending' },
        { id: '2', command: 'assertNotVisible', target: '#spinner', status: 'pending' },
        { id: '3', command: 'assertTitle', value: 'Store Home', status: 'pending' },
        { id: '4', command: 'assertUrl', value: '/checkout/success', status: 'pending' },
        { id: '5', command: 'assertTrue', value: 'window.isReady === true', status: 'pending' },
      ],
    });
    const code = exportFlowToPlaywrightTs(flow);

    expect(code).toContain("await expect(page.getByTestId('success-alert')).toBeVisible();");
    expect(code).toContain("await expect(page.locator('#spinner')).toBeHidden();");
    expect(code).toContain("await expect(page).toHaveTitle(/Store Home/);");
    expect(code).toContain("await expect(page).toHaveURL(/\\/checkout\\/success/);");
    expect(code).toContain("expect(await page.evaluate('window.isReady === true')).toBeTruthy();");
  });

  it('generates browser & page actions (scroll, setViewport, screenshot, cookies, storage, evalScript, copyTextFrom)', () => {
    const flow = createMockFlow({
      steps: [
        { id: '1', command: 'scroll', args: { distance: 500, direction: 'down' }, status: 'pending' },
        { id: '2', command: 'setViewport', args: { width: 375, height: 667 }, status: 'pending' },
        { id: '3', command: 'takeScreenshot', value: 'checkout.png', status: 'pending' },
        { id: '4', command: 'clearCookies', status: 'pending' },
        { id: '5', command: 'clearStorage', status: 'pending' },
        { id: '6', command: 'evalScript', value: "console.log('test')", status: 'pending' },
        { id: '7', command: 'copyTextFrom', target: '#order-id', args: { output: 'ORDER_NUM' }, status: 'pending' },
      ],
    });
    const code = exportFlowToPlaywrightTs(flow);

    expect(code).toContain("await page.mouse.wheel(0, 500);");
    expect(code).toContain("await page.setViewportSize({ width: 375, height: 667 });");
    expect(code).toContain("await page.screenshot({ path: 'checkout.png' });");
    expect(code).toContain("await page.context().clearCookies();");
    expect(code).toContain("localStorage.clear();");
    expect(code).toContain("sessionStorage.clear();");
    expect(code).toContain("await page.evaluate(() => {\n      console.log('test')\n    });");
    expect(code).toContain("const ORDER_NUM = await page.locator('#order-id').innerText();");
  });
});
