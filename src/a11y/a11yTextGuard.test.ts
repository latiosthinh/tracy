import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * a11yTextGuard test:
 * Scans all component .tsx files in src/components/ to ensure there are no un-extracted,
 * hardcoded English strings directly rendered inside JSX tags.
 */

const COMPONENTS_DIR = path.resolve(process.cwd(), 'src/components');

function getTsxFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getTsxFiles(filePath));
    } else if (file.endsWith('.tsx') && !file.endsWith('.test.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

// Regex to find raw text between JSX tags like <span>Some hardcoded text</span>
// or <p>Some text</p> or <button>Some text</button> or <div>Some text</div>
// Excludes JSX expressions like {t('...')} or {variable}
// Excludes pure whitespace, numbers, single punctuation, or symbols like &times;, •, ⛏, etc.
const RAW_JSX_TEXT_REGEX = />\s*([A-Za-z][A-Za-z0-9_.,!?'" \t\n-]{3,})\s*</g;

// Allowable exception patterns (code blocks, schema literals, technical syntax, HTML options)
const ALLOWED_RAW_TEXT_PATTERNS = [
  /^navigate: \/path$/,
  /^click: &quot;Sign In&quot;$/,
  /^inputText:$/,
  /^assertVisible: &quot;Welcome&quot;$/,
  /^interceptNetwork:$/,
  /^POST \/api\/checkout\/apply-coupon$/,
  /^GET \/products$/,
  /^200 OK/,
  /^---$/,
  /^\+ leftClick$/,
  /^\+ fill$/,
  /^\+ assertVisible$/,
  /^\+ selectOption$/,
  /^UTF-8$/,
  /^YAML$/,
  /^navigate$/,
  /^leftClick$/,
  /^rightClick$/,
  /^doubleClick$/,
  /^hover$/,
  /^tap$/,
  /^twoFingersTap$/,
  /^fill$/,
  /^press$/,
  /^eraseText$/,
  /^scroll$/,
  /^assertVisible$/,
  /^assertNotVisible$/,
  /^selectOption$/,
  /^interceptNetwork$/,
  /^copyTextFrom$/,
  /^chromium$/,
  /^firefox$/,
  /^webkit$/,
  /^Chromium$/,
  /^Firefox$/,
  /^WebKit \(Safari\)$/,
  /^Tracy E2E Test Report$/,
  /^Tracy Test Report: \$\{lastResult\.flowName\}$/,
  /^Status: \$\{lastResult\.status\}$/,
  /^Passed: \$\{lastResult\.passedCount\}\/\$\{lastResult\.totalCount\}$/,
];

describe('A11y Text Guard (Zero Hardcoded Text In JSX)', () => {
  const tsxFiles = getTsxFiles(COMPONENTS_DIR);

  it('scans all tsx components in src/components/', () => {
    expect(tsxFiles.length).toBeGreaterThan(25);
  });

  for (const file of tsxFiles) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');

    it(`should have zero raw hardcoded text nodes in ${relativePath}`, () => {
      const content = fs.readFileSync(file, 'utf-8');

      // Strip comments and style/script sections
      const strippedContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');

      const violations: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = RAW_JSX_TEXT_REGEX.exec(strippedContent)) !== null) {
        const text = match[1].trim();

        // Check if text is just HTML entities, numbers, single symbols, or matches allowed technical patterns
        if (!text || text.length <= 1) continue;
        if (/^(&[a-z0-9]+;|[0-9]+|\W+)$/i.test(text)) continue;

        const isAllowed = ALLOWED_RAW_TEXT_PATTERNS.some((pattern) => pattern.test(text));
        if (!isAllowed) {
          violations.push(text);
        }
      }

      expect(
        violations,
        `Found hardcoded raw text in ${relativePath}: ${JSON.stringify(violations)}`
      ).toEqual([]);
    });
  }
});
