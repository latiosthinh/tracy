// AI config persistence — encrypted-at-rest via Electron safeStorage, atomic writes.
// Registered from electron/ipc/index.ts.

import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
// NOTE: relative import — the electron main build does not resolve the '@/' alias.
import { getAgentDef, resolveAgentId, isValidModelId } from '../../src/lib/aiRegistry';

let _userDataPath: string | null = null;

function userData(): string {
  if (_userDataPath) return _userDataPath;
  // Fallback if called before whenReady (should not happen).
  try {
    const { app } = require('electron');
    _userDataPath = app.getPath('userData');
  } catch {
    _userDataPath = '';
  }
  return _userDataPath!;
}

function configFilePath(): string {
  return path.join(userData(), 'ai-config.json');
}

/** Config shape persisted on disk. */
interface RawConfig {
  schemaVersion: number;
  selectedAgentId: string;
  agentModels: Record<string, string>;
  agentCredentials: Record<string, CredentialEntry>;
}

interface CredentialEntry {
  apiKeyEnc?: string; // base64 safeStorage ciphertext
  customEndpoint?: string;
}

/** Public payload — credentials are decrypted/plaintext. */
export interface AiConfigPayload {
  selectedAgentId: string;
  agentModels: Record<string, string>;
  agentCredentials: Record<string, { apiKey?: string; customEndpoint?: string }>;
}

export interface AiConnectionTestPayload {
  agentId: string;
  apiKey: string;
  customEndpoint?: string;
  model?: string;
}

export interface AiConnectionTestResult {
  ok: boolean;
  errorMessage?: string;
}

const inMemoryKeys: Map<string, string> = new Map();

// ── Helpers ───────────────────────────────────────────────

/** Mask secrets in error messages so keys never leak into logs. */
export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-…')
    .replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, 'sk-ant-…')
    .replace(/\bBearer [A-Za-z0-9._-]+/g, 'Bearer …')
    .replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, '$1: …')
    .replace(/key=[A-Za-z0-9_-]+/gi, 'key=…')
    .replace(/AIza[A-Za-z0-9_-]{3,}/g, 'AIza…');
}

async function readConfigFile(): Promise<RawConfig | null> {
  try {
    const fp = configFilePath();
    const raw = await fs.readFile(fp, 'utf-8');
    return JSON.parse(raw) as RawConfig;
  } catch {
    return null;
  }
}

async function encrypt(key: string): Promise<string> {
  const { safeStorage } = await import('electron');
  if (!safeStorage.isEncryptionAvailable()) return '';
  return safeStorage.encryptString(key).toString('base64');
}

async function decrypt(b64: string): Promise<string> {
  const { safeStorage } = await import('electron');
  if (!safeStorage.isEncryptionAvailable() || !b64) return '';
  try {
    return safeStorage.decryptString(Buffer.from(b64, 'base64'));
  } catch {
    return '';
  }
}

async function writeConfigAtomic(cfg: RawConfig): Promise<void> {
  const fp = configFilePath();
  const tmp = fp + '.tmp.' + Date.now();
  const data = JSON.stringify(
    { ...cfg, agentCredentials: await serializeCredentials(cfg.agentCredentials) },
    null,
    2,
  );
  await fs.writeFile(tmp, data, 'utf-8');
  await fs.rename(tmp, fp);
}

async function serializeCredentials(
  creds: Record<string, CredentialEntry>,
): Promise<Record<string, CredentialEntry>> {
  const encCreds: Record<string, CredentialEntry> = {};
  for (const [id, c] of Object.entries(creds)) {
    const entry: CredentialEntry = {};
    if (c.apiKeyEnc) {
      entry.apiKeyEnc = c.apiKeyEnc;
    }
    if (c.customEndpoint) entry.customEndpoint = c.customEndpoint;
    encCreds[id] = entry;
  }
  return encCreds;
}

async function deserializeCredentials(
  raw: Record<string, CredentialEntry>,
): Promise<Record<string, { apiKey?: string; customEndpoint?: string }>> {
  const out: Record<string, { apiKey?: string; customEndpoint?: string }> = {};
  for (const [id, c] of Object.entries(raw)) {
    const entry: { apiKey?: string; customEndpoint?: string } = {};
    if (c.apiKeyEnc) {
      const key = await decrypt(c.apiKeyEnc);
      if (key) entry.apiKey = key;
    }
    const memKey = inMemoryKeys.get(id);
    if (memKey) entry.apiKey = memKey;
    if (c.customEndpoint) entry.customEndpoint = c.customEndpoint;
    out[id] = entry;
  }
  return out;
}

/** Load resolved credentials for an agent: persisted (decrypted) > env fallback. */
export async function getResolvedCredentials(agentId: string): Promise<{
  apiKey?: string;
  customEndpoint?: string;
  model?: string;
}> {
  const cfg = await readConfigFile();
  if (!cfg) return {};

  const creds = await deserializeCredentials(cfg.agentCredentials ?? {});
  const cred = creds[agentId];

  const def = getAgentDef(resolveAgentId(agentId));
  let apiKey = cred?.apiKey;
  if (!apiKey && def?.envKeyNames?.[0]) {
    apiKey = process.env[def.envKeyNames[0]];
  }

  const model = cfg.agentModels?.[agentId];
  return { apiKey, customEndpoint: cred?.customEndpoint, model };
}

// ── IPC Handlers ──────────────────────────────────────────

export async function registerAiConfigHandlers(): Promise<void> {
  const { app, safeStorage } = await import('electron');
  await app.whenReady();
  _userDataPath = app.getPath('userData');

  // If encryption is available but was unavailable at startup, reload memory map
  if (inMemoryKeys.size > 0 && safeStorage.isEncryptionAvailable()) {
    // Keys stored in-memory during session — still accessible
  }

  ipcMain.handle('ai_config_load', async () => {
    try {
      const cfg = await readConfigFile();
      if (!cfg || cfg.schemaVersion !== 1) {
        return { selectedAgentId: '', agentModels: {}, agentCredentials: {} };
      }
      const creds = await deserializeCredentials(cfg.agentCredentials ?? {});
      return {
        selectedAgentId: cfg.selectedAgentId || '',
        agentModels: cfg.agentModels || {},
        agentCredentials: creds,
      };
    } catch (err) {
      console.error('Failed to load AI config:', err);
      return { selectedAgentId: '', agentModels: {}, agentCredentials: {} };
    }
  });

  ipcMain.handle('ai_config_save', async (_event, cfg: AiConfigPayload) => {
    try {
      const existing = await readConfigFile();
      const merged: RawConfig = {
        schemaVersion: 1,
        selectedAgentId: cfg.selectedAgentId,
        agentModels: cfg.agentModels ?? {},
        agentCredentials: await mergeCredentials(existing?.agentCredentials, cfg),
      };
      await writeConfigAtomic(merged);
    } catch (err) {
      console.error('Failed to save AI config:', err);
      throw err;
    }
  });

  ipcMain.handle('ai_fetch_models', async (_event, payload: { agentId: string; apiKey?: string; customEndpoint?: string }): Promise<string[]> => {
    try {
      const canonicalId = resolveAgentId(payload.agentId);
      const def = getAgentDef(canonicalId);
      const endpoint = payload.customEndpoint || def?.defaultEndpoint || '';
      const apiKey = payload.apiKey;

      if (def?.protocol === 'google') {
        const key = apiKey || process.env.GEMINI_API_KEY || '';
        if (!key) return def.models;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = (await res.json()) as { models?: Array<{ name?: string }> };
          const fetched = (data.models || [])
            .map((m) => m.name?.replace(/^models\//, '') || '')
            .filter((name) => name && name.startsWith('gemini'));
          if (fetched.length > 0) return Array.from(new Set(fetched));
        }
        return def.models;
      }

      if (def?.protocol === 'anthropic') {
        if (!apiKey) return def.models;
        const base = (endpoint || 'https://api.anthropic.com').replace(/\/+$/, '');
        const res = await fetch(`${base}/v1/models`, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { data?: Array<{ id?: string }> };
          const fetched = (data.data || []).map((m) => m.id || '').filter(Boolean);
          if (fetched.length > 0) return Array.from(new Set(fetched));
        }
        return def.models;
      }

      if (def?.protocol === 'openai' || def?.protocol === 'openai-compat' || !def?.protocol) {
        const baseEndpoint = endpoint || 'http://localhost:11434';
        const url = baseEndpoint.endsWith('/v1') || baseEndpoint.endsWith('/')
          ? `${baseEndpoint.replace(/\/+$/, '')}/models`
          : `${baseEndpoint.replace(/\/+$/, '')}/v1/models`;

        const headers: Record<string, string> = {};
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const res = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
          headers,
        });

        if (res.ok) {
          const data = (await res.json()) as { data?: Array<{ id?: string; name?: string }> } | Array<{ name?: string; id?: string }>;
          const list = Array.isArray(data) ? data : data.data || [];
          const fetched = list
            .map((m) => m.id || m.name || '')
            .filter((id) => id && isValidModelId(id));
          if (fetched.length > 0) return Array.from(new Set(fetched));
        }
        return def?.models || [];
      }

      return def?.models || [];
    } catch (err) {
      console.warn('Dynamic model fetch failed, using default models:', err);
      const def = getAgentDef(resolveAgentId(payload.agentId));
      return def?.models || [];
    }
  });

  ipcMain.handle('ai_connection_test', async (_event, payload: AiConnectionTestPayload): Promise<AiConnectionTestResult> => {
    try {
      const canonicalId = resolveAgentId(payload.agentId);
      const def = getAgentDef(canonicalId);
      if (!def && !payload.agentId) {
        return { ok: false, errorMessage: 'Unknown agent ID' };
      }

      const endpoint = payload.customEndpoint || def?.defaultEndpoint || '';
      const model = payload.model || def?.defaultModel || '';

      switch (def?.protocol) {
        case 'anthropic': {
          const res = await fetch(`${endpoint || 'https://api.anthropic.com'}/v1/messages`, {
            method: 'POST',
            signal: AbortSignal.timeout(10_000),
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': payload.apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            return { ok: false, errorMessage: `Anthropic API error (${res.status}): ${redactSecrets(txt.slice(0, 200))}` };
          }
          return { ok: true };
        }

        case 'openai':
        case 'openai-compat': {
          const baseEndpoint = endpoint || 'http://localhost:11434';
          const url = baseEndpoint.endsWith('/v1') || baseEndpoint.endsWith('/')
            ? `${baseEndpoint}/chat/completions`
            : `${baseEndpoint}/v1/chat/completions`;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (payload.apiKey) headers['Authorization'] = `Bearer ${payload.apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(10_000),
            headers,
            body: JSON.stringify({ model: model || 'llama3.2', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            return { ok: false, errorMessage: `API error (${res.status}): ${redactSecrets(txt.slice(0, 200))}` };
          }
          return { ok: true };
        }

        case 'cursor': {
          const baseEndpoint = (endpoint || 'https://api.cursor.com').replace(/\/+$/, '');
          const res = await fetch(`${baseEndpoint}/v1/agents/tasks`, {
            method: 'GET',
            signal: AbortSignal.timeout(10_000),
            headers: {
              'Content-Type': 'application/json',
              ...(payload.apiKey ? { Authorization: `Bearer ${payload.apiKey}` } : {}),
            },
          });
          if (res.status === 401 || res.status === 403) {
            return { ok: false, errorMessage: 'Invalid Cursor API key' };
          }
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            return { ok: false, errorMessage: `Cursor API error (${res.status}): ${redactSecrets(txt.slice(0, 200))}` };
          }
          return { ok: true };
        }

        default: {
          // Try generic OpenAI-compatible as best-effort
          try {
            const baseEndpoint = endpoint || 'http://localhost:11434';
            const url = baseEndpoint.endsWith('/v1') || baseEndpoint.endsWith('/')
              ? `${baseEndpoint}/chat/completions`
              : `${baseEndpoint}/v1/chat/completions`;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (payload.apiKey) headers['Authorization'] = `Bearer ${payload.apiKey}`;
            const res = await fetch(url, {
              method: 'POST',
              signal: AbortSignal.timeout(10_000),
              headers,
              body: JSON.stringify({ model: model || 'llama3.2', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
            });
            if (!res.ok) {
              const txt = await res.text().catch(() => '');
              return { ok: false, errorMessage: `Gateway error (${res.status}): ${redactSecrets(txt.slice(0, 200))}` };
            }
            return { ok: true };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, errorMessage: `Connection test failed: ${redactSecrets(msg.slice(0, 200))}` };
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, errorMessage: `Connection test failed: ${redactSecrets(msg.slice(0, 200))}` };
    }
  });
}

async function mergeCredentials(
  existingRaw: Record<string, CredentialEntry> | undefined,
  cfg: AiConfigPayload,
): Promise<Record<string, CredentialEntry>> {
  const result: Record<string, CredentialEntry> = {};
  const ids = new Set([...Object.keys(existingRaw || {}), ...Object.keys(cfg.agentCredentials)]);

  for (const id of ids) {
    const existing = existingRaw?.[id];
    const incoming = cfg.agentCredentials[id];
    const entry: CredentialEntry = {};

    if (incoming && 'apiKey' in incoming) {
      // New key provided — encrypt and store
      if (typeof incoming.apiKey === 'string' && incoming.apiKey.length > 0) {
        const encrypted = await encrypt(incoming.apiKey);
        if (encrypted) {
          entry.apiKeyEnc = encrypted;
        } else {
          inMemoryKeys.set(id, incoming.apiKey);
        }
      }
    } else if (existing?.apiKeyEnc) {
      // Keep existing encrypted key
      entry.apiKeyEnc = existing.apiKeyEnc;
    }

    if (incoming && 'customEndpoint' in incoming) {
      entry.customEndpoint = incoming.customEndpoint;
    } else if (existing?.customEndpoint) {
      entry.customEndpoint = existing.customEndpoint;
    }

    result[id] = entry;
  }

  return result;
}
