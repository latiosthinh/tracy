import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { quoteCmdArg } from './cliRunner';
import { assertSafePath, resolveSafeBase } from './fileSystem';

describe('Security Hardening: Command Injection & Path Traversal', () => {
  describe('cliRunner quoteCmdArg', () => {
    it('quotes normal string with double quotes', () => {
      expect(quoteCmdArg('hello world')).toBe('"hello world"');
    });

    it('escapes internal double quotes and windows cmd meta-characters', () => {
      const hostile = 'foo" & whoami | dir < file > out ^ %TEMP%';
      const quoted = quoteCmdArg(hostile);
      // Wrapped in double quotes
      expect(quoted.startsWith('"')).toBe(true);
      expect(quoted.endsWith('"')).toBe(true);
      // Double quotes inside are escaped/doubled or meta chars caret-escaped
      expect(quoted).not.toBe(hostile);
    });

    it('neutralizes hostile injection payloads as literal arguments', () => {
      const injection1 = '"; whoami & calc';
      const quoted1 = quoteCmdArg(injection1);
      expect(quoted1.startsWith('"')).toBe(true);
      expect(quoted1.endsWith('"')).toBe(true);
      expect(quoted1).toContain('""'); // doubled quote
      expect(quoted1).toContain('^&'); // caret escaped cmd delimiter

      const injection2 = '& dir';
      const quoted2 = quoteCmdArg(injection2);
      expect(quoted2).toContain('^&');
    });
  });

  describe('fileSystem assertSafePath & resolveSafeBase', () => {
    const base = path.resolve('/tmp/tracy-project');

    it('allows exact base path match', () => {
      expect(assertSafePath(base)).toBe(base);
    });

    it('allows children inside base path', () => {
      const target = assertSafePath(base, 'flows', 'test.yaml');
      expect(target).toBe(path.resolve(base, 'flows', 'test.yaml'));
    });

    it('blocks path traversal via .. segments', () => {
      expect(() => assertSafePath(base, '..', 'evil.json')).toThrow(/Path traversal blocked/);
      expect(() => assertSafePath(base, 'flows', '..', '..', 'evil.json')).toThrow(/Path traversal blocked/);
    });

    it('blocks sibling prefix directory traversal (e.g. /tmp/tracy-projectEvil)', () => {
      // If someone attempts base with a segment that would resolve to a sibling named identically with a suffix
      const evilSibling = base + 'Evil';
      expect(() => assertSafePath(base, '..', path.basename(evilSibling), 'x')).toThrow(/Path traversal blocked/);
    });

    it('rejects invalid or empty base paths', () => {
      expect(() => assertSafePath('')).toThrow(/Invalid base path/);
      expect(() => assertSafePath(null as any)).toThrow(/Invalid base path/);
    });

    it('validates resolveSafeBase against allowed base paths', () => {
      expect(() => resolveSafeBase('')).toThrow();
      expect(() => resolveSafeBase('   ')).toThrow();
      // Should return a resolved string when valid
      const resolved = resolveSafeBase('/tmp/test-project');
      expect(resolved).toBe(path.resolve('/tmp/test-project'));
    });
  });
});
