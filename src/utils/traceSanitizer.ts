import type { AgentToolTraceEvent } from '@/src/types/skills';

const SENSITIVE_KEY_PATTERNS = [/password/i, /passwd/i, /secret/i, /token/i, /apikey/i, /api_key/i, /authorization/i, /auth/i, /credential/i];

export function redactSensitiveData(value: unknown): unknown {
  if (typeof value === 'string') {
    let sanitized = value.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/g, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(/(password|passwd|secret|apiKey|api_key|token)=["']?[^"'\s,]+["']?/gi, '$1="[REDACTED]"');
    sanitized = sanitized.replace(/(apiKey|api_key):\s*[A-Za-z0-9_\-]+/gi, '$1: [REDACTED]');
    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(item => redactSensitiveData(item));
  }

  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    // Check if the object itself looks like a key-value header or credential pair: { name: 'Auth', value: 'secret-token' }
    const isHeaderPair = typeof obj.name === 'string' && SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(obj.name as string));

    for (const [key, val] of Object.entries(obj)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key)) || (isHeaderPair && key === 'value');
      if (isSensitiveKey && typeof val === 'string') {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitiveData(val);
      }
    }
    return result;
  }

  return value;
}

export function sanitizeTraceEvent(event: AgentToolTraceEvent): AgentToolTraceEvent {
  return {
    ...event,
    thought: event.thought ? (redactSensitiveData(event.thought) as string) : undefined,
    toolCall: event.toolCall
      ? {
          ...event.toolCall,
          arguments: redactSensitiveData(event.toolCall.arguments) as Record<string, unknown>,
        }
      : undefined,
    toolResult: event.toolResult ? (redactSensitiveData(event.toolResult) as any) : undefined,
  };
}
