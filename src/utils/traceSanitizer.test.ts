import { describe, it, expect } from 'vitest';
import { redactSensitiveData, sanitizeTraceEvent } from '@/src/utils/traceSanitizer';
import type { AgentToolTraceEvent } from '@/src/types/skills';

describe('traceSanitizer', () => {
  describe('redactSensitiveData', () => {
    it('redacts keys matching sensitive patterns in plain objects', () => {
      const input = {
        username: 'admin',
        password: 'superSecretPassword123',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        apiKey: 'sk-1234567890abcdef',
        secret: 'my-app-secret',
        authorization: 'Bearer secret-bearer-token',
        credential: 'my-credential',
      };

      const sanitized = redactSensitiveData(input) as Record<string, unknown>;

      expect(sanitized.username).toBe('admin');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.credential).toBe('[REDACTED]');
    });

    it('recursively redacts nested objects and arrays within tool arguments and results', () => {
      const input = {
        action: 'login',
        params: {
          user: {
            name: 'alice',
            passwd: 'mypassword',
          },
          headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Auth', value: 'secret-token' },
          ],
        },
      };

      const sanitized = redactSensitiveData(input) as any;

      expect(sanitized.action).toBe('login');
      expect(sanitized.params.user.name).toBe('alice');
      expect(sanitized.params.user.passwd).toBe('[REDACTED]');
      expect(sanitized.params.headers[0].value).toBe('application/json');
      expect(sanitized.params.headers[1].value).toBe('[REDACTED]');
    });

    it('redacts inline secrets and authorization headers matching bearer token patterns inside text/thought strings', () => {
      const thought1 = 'Attempting auth with Bearer eyJhbGciOiJIUzI1Ni.abc123_xyz-789 to verify API response.';
      const thought2 = 'Found form field password="secret_pass_999" and trying fill.';
      const thought3 = 'Using apiKey: 1234567890abcdef1234567890abcdef';

      expect(redactSensitiveData(thought1)).toContain('Bearer [REDACTED]');
      expect(redactSensitiveData(thought1)).not.toContain('eyJhbGciOiJIUzI1Ni.abc123_xyz-789');

      expect(redactSensitiveData(thought2)).toContain('password="[REDACTED]"');
      expect(redactSensitiveData(thought2)).not.toContain('secret_pass_999');

      expect(redactSensitiveData(thought3)).toContain('apiKey: [REDACTED]');
      expect(redactSensitiveData(thought3)).not.toContain('1234567890abcdef1234567890abcdef');
    });

    it('preserves non-sensitive selectors, element tags, and test IDs without altering valid probe data', () => {
      const input = {
        selector: 'button[data-testid="submit-btn"]',
        matchCount: 1,
        details: {
          tagName: 'BUTTON',
          role: 'button',
          testId: 'submit-btn',
          isVisible: true,
        },
      };

      const sanitized = redactSensitiveData(input) as any;

      expect(sanitized).toEqual(input);
    });
  });

  describe('sanitizeTraceEvent', () => {
    it('returns a sanitized clone of an AgentToolTraceEvent without mutating original', () => {
      const original: AgentToolTraceEvent = {
        turn: 1,
        thought: 'Sending request with Bearer secret-tok-123',
        toolCall: {
          name: 'validate_selector',
          arguments: {
            selector: 'input[name="password"]',
            password: 'rawPassword',
          },
        },
        toolResult: {
          valid: true,
          matchCount: 1,
          details: {
            auth: 'token-val',
          },
        },
        timestamp: '2026-08-19T10:00:00.000Z',
      };

      const cloned = sanitizeTraceEvent(original);

      expect(cloned).not.toBe(original);
      expect(cloned.thought).toContain('Bearer [REDACTED]');
      expect(cloned.toolCall?.arguments.password).toBe('[REDACTED]');
      expect((cloned.toolResult?.details as any).auth).toBe('[REDACTED]');
      expect(original.toolCall?.arguments.password).toBe('rawPassword');
    });
  });
});
