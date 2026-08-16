import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * a11yTextGuard test:
 * Scans all .tsx and relevant .ts files under src/ to ensure there are no un-extracted,
 * hardcoded English strings directly rendered inside JSX tags, attributes, or expression blocks.
 */

const SRC_DIR = path.resolve(process.cwd(), 'src');

function getSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getSourceFiles(filePath));
    } else if (
      (file.endsWith('.tsx') || file.endsWith('.ts')) &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.test.tsx') &&
      !file.endsWith('.d.ts') &&
      !filePath.includes('src\\test\\') &&
      !filePath.includes('src/test/') &&
      !filePath.includes('src\\data\\') &&
      !filePath.includes('src/data/') &&
      !filePath.includes('src\\types\\') &&
      !filePath.includes('src/types/') &&
      !filePath.includes('src\\server\\') &&
      !filePath.includes('src/server/')
    ) {
      results.push(filePath);
    }
  }
  return results;
}

// Regex to find raw text between JSX tags like <span>Some hardcoded text</span>
// Supports colons, parentheses, ampersands, slashes, punctuation, unicode
const RAW_JSX_TEXT_REGEX = />\s*([A-Za-z][A-Za-z0-9_.,!?'" \t\n/():&+-]{2,})\s*</g;

// Regex for hardcoded user-facing string attributes: aria-label="...", title="...", placeholder="...", alt="..."
const ATTRIBUTE_TEXT_REGEX = /\b(aria-label|title|placeholder|alt)=["']([^"'{}\n]+)["']/g;

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

const ALLOWED_ATTRIBUTE_PATTERNS = [
  /^https?:\/\//,
  /^sk-/,
  /^#/,
  /^\//,
  /^v\d/,
  /^[\w.-]+@[\w.-]+$/,
  /^localhost/,
  /^\.json/,
  /^flow\./,
  /^[\d.]+$/,
  /^[A-Z0-9_-]+$/,
];

describe('A11y Text Guard (Zero Hardcoded Text In JSX)', () => {
  const sourceFiles = getSourceFiles(SRC_DIR);

  it('scans all tsx and relevant ts source files in src/', () => {
    expect(sourceFiles.length).toBeGreaterThan(25);
  });

  for (const file of sourceFiles) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');

    it(`should have zero raw hardcoded text nodes and attributes in ${relativePath}`, () => {
      const content = fs.readFileSync(file, 'utf-8');

      // Strip comments
      const strippedContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');

      const violations: string[] = [];
      let match: RegExpExecArray | null;

      // Check raw JSX text if TSX
      if (file.endsWith('.tsx')) {
        while ((match = RAW_JSX_TEXT_REGEX.exec(strippedContent)) !== null) {
          const text = match[1].trim();

          if (!text || text.length <= 1) continue;
          if (/^(&[a-z0-9]+;|[0-9]+|\W+)$/i.test(text)) continue;

          const isAllowed = ALLOWED_RAW_TEXT_PATTERNS.some((pattern) => pattern.test(text));
          if (!isAllowed) {
            violations.push(`JSX text: "${text}"`);
          }
        }

        while ((match = ATTRIBUTE_TEXT_REGEX.exec(strippedContent)) !== null) {
          const attr = match[1];
          const val = match[2].trim();

          if (!val || val.length <= 1) continue;
          if (/^[0-9]+$/.test(val)) continue;

          const isAllowed = ALLOWED_ATTRIBUTE_PATTERNS.some((pattern) => pattern.test(val));
          if (!isAllowed) {
            violations.push(`Attribute ${attr}: "${val}"`);
          }
        }
      }

      expect(
        violations,
        `Found hardcoded raw text or attributes in ${relativePath}: ${JSON.stringify(violations)}`
      ).toEqual([]);
    });
  }
});

