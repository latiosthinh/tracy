import type { FlowFile, FlowStep, SelectorRule } from '@/src/types/flow';

/**
 * Helper to escape single-quoted string literals in TypeScript code.
 */
function quote(str: string): string {
  return `'${str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Helper to convert target / selector definition into a Playwright locator code string.
 */
function resolveLocatorCode(target: string | SelectorRule | undefined, value?: string): string {
  if (!target) {
    if (value) {
      return `page.getByText(${quote(value)})`;
    }
    return `page.locator('body')`;
  }

  if (typeof target === 'string') {
    const trimmed = target.trim();
    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('.') ||
      trimmed.startsWith('[') ||
      trimmed.startsWith('//') ||
      trimmed.includes('>') ||
      trimmed.includes(':')
    ) {
      if (trimmed.startsWith('//')) {
        return `page.locator(${quote(`xpath=${trimmed}`)})`;
      }
      return `page.locator(${quote(trimmed)})`;
    }
    return `page.getByText(${quote(trimmed)})`;
  }

  // Handle SelectorRule object
  if (target.type && target.value) {
    switch (target.type) {
      case 'testId':
        return `page.getByTestId(${quote(target.value)})`;
      case 'role': {
        const parts: string[] = [];
        if (target.name) parts.push(`name: ${quote(target.name)}`);
        if (target.exact !== undefined) parts.push(`exact: ${target.exact}`);
        const optStr = parts.length > 0 ? `, { ${parts.join(', ')} }` : '';
        return `page.getByRole(${quote(target.value)}${optStr})`;
      }
      case 'label':
        return `page.getByLabel(${quote(target.value)}${target.exact ? ', { exact: true }' : ''})`;
      case 'placeholder':
        return `page.getByPlaceholder(${quote(target.value)}${target.exact ? ', { exact: true }' : ''})`;
      case 'text':
        return `page.getByText(${quote(target.value)}${target.exact ? ', { exact: true }' : ''})`;
      case 'css':
        return `page.locator(${quote(target.value)})`;
      case 'xpath':
        return `page.locator(${quote(`xpath=${target.value}`)})`;
      case 'id':
        return `page.locator(${quote(`#${target.value}`)})`;
    }
  }

  // Fallback property inspect
  if ((target as any).testId) return `page.getByTestId(${quote((target as any).testId)})`;
  if ((target as any).role) {
    const role = (target as any).role;
    const name = (target as any).name;
    return name
      ? `page.getByRole(${quote(role)}, { name: ${quote(name)} })`
      : `page.getByRole(${quote(role)})`;
  }
  if ((target as any).label) return `page.getByLabel(${quote((target as any).label)})`;
  if ((target as any).placeholder) return `page.getByPlaceholder(${quote((target as any).placeholder)})`;
  if ((target as any).text) return `page.getByText(${quote((target as any).text)})`;
  if ((target as any).css) return `page.locator(${quote((target as any).css)})`;
  if ((target as any).xpath) return `page.locator(${quote(`xpath=${(target as any).xpath}`)})`;
  if ((target as any).id) return `page.locator(${quote(`#${(target as any).id}`)})`;

  return `page.locator('body')`;
}

/**
 * Converts a FlowStep into one or more lines of Playwright TypeScript code.
 */
function exportStepToPlaywright(step: FlowStep, targetBaseUrl: string): string[] {
  const cmd = step.command;
  const timeoutOpt = step.timeout ? `{ timeout: ${step.timeout} }` : '';

  switch (cmd) {
    case 'navigate': {
      const url = step.value || (typeof step.target === 'string' ? step.target : '/');
      const fullUrl =
        url.startsWith('http://') || url.startsWith('https://') || url === 'about:blank'
          ? url
          : `${targetBaseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
      return [`await page.goto(${quote(fullUrl)});`];
    }

    case 'leftClick':
    case 'tap': {
      const loc = resolveLocatorCode(step.target, step.value);
      return [`await ${loc}.click(${timeoutOpt});`];
    }

    case 'doubleClick': {
      const loc = resolveLocatorCode(step.target, step.value);
      return [`await ${loc}.dblclick(${timeoutOpt});`];
    }

    case 'rightClick': {
      const loc = resolveLocatorCode(step.target, step.value);
      const opt = step.timeout ? `{ button: 'right', timeout: ${step.timeout} }` : `{ button: 'right' }`;
      return [`await ${loc}.click(${opt});`];
    }

    case 'hover': {
      const loc = resolveLocatorCode(step.target, step.value);
      return [`await ${loc}.hover(${timeoutOpt});`];
    }

    case 'fill': {
      const loc = resolveLocatorCode(step.target);
      const text = step.value || '';
      return [`await ${loc}.fill(${quote(text)}${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
    }

    case 'eraseText': {
      const loc = resolveLocatorCode(step.target, step.value);
      return [`await ${loc}.fill(''${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
    }

    case 'press': {
      const key = step.value || (typeof step.target === 'string' ? step.target : 'Enter');
      return [`await page.keyboard.press(${quote(key)});`];
    }

    case 'selectOption': {
      const loc = resolveLocatorCode(step.target);
      const val = step.value || '';
      return [`await ${loc}.selectOption(${quote(val)}${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
    }

    case 'uploadFile': {
      const loc = resolveLocatorCode(step.target);
      const val = step.value || '';
      return [`await ${loc}.setInputFiles(${quote(val)}${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
    }

    case 'waitFor': {
      const val = step.value || (typeof step.target === 'string' ? step.target : '');
      if (val === 'networkIdle' || val === 'idle') {
        return [`await page.waitForLoadState('networkidle'${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
      }
      if (val === 'load' || val === 'domcontentloaded') {
        return [`await page.waitForLoadState(${quote(val)}${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
      }
      if (typeof val === 'number' || /^\d+$/.test(val)) {
        return [`await page.waitForTimeout(${Number(val)});`];
      }
      return [`await page.waitForSelector(${quote(val)}${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
    }

    case 'wait': {
      const ms = Number(step.value || step.target || 1000);
      return [`await page.waitForTimeout(${ms});`];
    }

    case 'waitForNetwork': {
      return [`await page.waitForLoadState('networkidle'${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
    }

    case 'assertVisible': {
      const loc = resolveLocatorCode(step.target, step.value);
      return [`await expect(${loc}).toBeVisible(${timeoutOpt});`];
    }

    case 'assertNotVisible': {
      const loc = resolveLocatorCode(step.target, step.value);
      return [`await expect(${loc}).toBeHidden(${timeoutOpt});`];
    }

    case 'assertTitle': {
      const expected = step.value || (typeof step.target === 'string' ? step.target : '');
      const escaped = expected.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      return [`await expect(page).toHaveTitle(/${escaped}/${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
    }

    case 'assertUrl': {
      const expected = step.value || (typeof step.target === 'string' ? step.target : '');
      const escaped = expected.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      return [`await expect(page).toHaveURL(/${escaped}/${timeoutOpt ? `, ${timeoutOpt}` : ''});`];
    }

    case 'assertTrue': {
      const expr = step.value || (typeof step.target === 'string' ? step.target : 'true');
      return [`expect(await page.evaluate(${quote(expr)})).toBeTruthy();`];
    }

    case 'copyTextFrom': {
      const loc = resolveLocatorCode(step.target);
      const varName = step.args?.output || 'extractedText';
      return [`const ${varName} = await ${loc}.innerText(${timeoutOpt});`];
    }

    case 'scroll': {
      const distance = Number(step.args?.distance || step.value || 300);
      const direction = step.args?.direction || 'down';
      const deltaY = direction === 'up' ? -distance : distance;
      return [`await page.mouse.wheel(0, ${deltaY});`];
    }

    case 'setViewport': {
      const width = step.args?.width || 1280;
      const height = step.args?.height || 720;
      return [`await page.setViewportSize({ width: ${width}, height: ${height} });`];
    }

    case 'takeScreenshot': {
      const filename = step.value || (typeof step.target === 'string' ? step.target : 'screenshot.png');
      return [`await page.screenshot({ path: ${quote(filename)} });`];
    }

    case 'clearCookies': {
      return [`await page.context().clearCookies();`];
    }

    case 'clearStorage': {
      return [
        `await page.evaluate(() => {`,
        `  localStorage.clear();`,
        `  sessionStorage.clear();`,
        `});`,
      ];
    }

    case 'evalScript': {
      const script = step.value || (typeof step.target === 'string' ? step.target : '');
      return [
        `await page.evaluate(() => {`,
        `  ${script}`,
        `});`,
      ];
    }

    default:
      return [`// Unsupported command: ${cmd}`];
  }
}

/**
 * Translates a Tracy FlowFile into clean, standalone Playwright TypeScript test spec code.
 */
export function exportFlowToPlaywrightTs(flow: FlowFile, targetUrl?: string): string {
  const flowName = flow.name ? flow.name.replace(/\.ya?ml$/i, '') : 'Tracy Flow';
  const baseUrl = targetUrl || flow.metadata?.url || 'https://example.com';
  const timeout = flow.metadata?.timeout;

  const lines: string[] = [
    `import { test, expect } from '@playwright/test';`,
    ``,
    `test.describe('${flowName.replace(/'/g, "\\'")}', () => {`,
  ];

  if (timeout) {
    lines.push(`  test.setTimeout(${timeout});`);
    lines.push(``);
  }

  lines.push(`  test('should execute ${flowName.replace(/'/g, "\\'")} successfully', async ({ page }) => {`);

  const steps = flow.steps || [];
  if (steps.length === 0) {
    lines.push(`    // No steps defined in flow`);
    lines.push(`    await page.goto('${baseUrl.replace(/'/g, "\\'")}');`);
  } else {
    steps.forEach((step, idx) => {
      lines.push(`    // Step ${idx + 1}: ${step.command}`);
      const stepLines = exportStepToPlaywright(step, baseUrl);
      stepLines.forEach((l) => {
        lines.push(`    ${l}`);
      });
      lines.push(``);
    });
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }
  }

  lines.push(`  });`);
  lines.push(`});`);
  lines.push(``);

  return lines.join('\n');
}
