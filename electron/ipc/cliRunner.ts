// CLI agent detection and subprocess execution with streaming stdout.

import { spawn, spawnSync } from 'child_process';
import path from 'path';
// NOTE: relative import — the electron main build does not resolve the '@/' alias.
import type { AgentDef } from '../../src/lib/aiRegistry';
import { agentsByCategory } from '../../src/lib/aiRegistry';

// Re-export a compatible DetectedAgent type for main process usage.
export interface DetectedAgent {
  id: string;
  name: string;
  cli_binary: string;
  path?: string;
  installed: boolean;
  icon_name: string;
  category: string;
  description: string;
  version?: string;
}

/** Internal: resolve a single binary name to its absolute PATH. Never throws — returns null on failure. */
async function resolveSingleBinary(binaryName: string): Promise<string | null> {
  const isWin = process.platform === 'win32';

  try {
    // Platform-native resolution
    const cmd = isWin ? 'where' : 'which';
    const result = spawnSync(cmd, [binaryName], { encoding: 'utf-8', windowsHide: true, timeout: 5000 });
    if (result.status === 0 && result.stdout) {
      const firstLine = result.stdout.trim().split(/\r?\n/)[0]?.trim();
      if (firstLine) return firstLine;
    }
  } catch {
    // where/which not available or failed
  }

  // Check npm global shims on Windows
  if (isWin) {
    const appData = process.env.APPDATA || '';
    const npmShim = path.join(appData, 'npm', `${binaryName}.cmd`);
    try {
      const fs = await import('fs');
      if (fs.existsSync(npmShim)) return npmShim;
    } catch { /* noop */ }

    const localAppData = process.env.LOCALAPPDATA || '';
    const programsDir = path.join(localAppData, 'Programs');
    try {
      const fs = await import('fs');
      if (fs.existsSync(programsDir)) {
        const entries = fs.readdirSync(programsDir, { withFileTypes: true }).map(e => e.name).filter(Boolean);
        for (const entry of entries) {
          const candidate = path.join(programsDir, entry, 'bin', binaryName);
          if (fs.existsSync(candidate)) return candidate;
          const cmdCandidate = path.join(programsDir, entry, `${binaryName}.cmd`);
          if (fs.existsSync(cmdCandidate)) return cmdCandidate;
        }
      }
    } catch { /* noop */ }
  }

  // Fallback directories
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const fallbackDirs = isWin
    ? []
    : [path.join(home, '.local', 'bin'), '/usr/local/bin', '/opt/homebrew/bin'];

  for (const dir of fallbackDirs) {
    try {
      const fs = await import('fs');
      const candidate = path.join(dir, binaryName);
      if (fs.existsSync(candidate)) return candidate;
    } catch { /* noop */ }
  }

  return null;
}

/** Resolve an agent's primary or alternative binary to its absolute PATH. */
export async function resolveBinary(def: AgentDef): Promise<string | null> {
  const candidates = [def.cliBinary, ...(def.altBinaries ?? [])].filter((b): b is string => Boolean(b));
  for (const binaryName of candidates) {
    const hit = await resolveSingleBinary(binaryName);
    if (hit) return hit;
  }
  return null;
}

/** Detect CLI-based agents from the registry + OS discovery. */
export async function detectCliAgents(): Promise<DetectedAgent[]> {
  const cliDefs = agentsByCategory('local-cli').filter(def => def.kind === 'cli');
  const results: DetectedAgent[] = [];

  for (const def of cliDefs) {
    if (!def.cliBinary) continue;

    const resolvedPath = await resolveBinary(def);
    let version: string | undefined;

    if (resolvedPath && def.versionArgs) {
      try {
        const result = spawnSync(resolvedPath, def.versionArgs, {
          encoding: 'utf-8',
          windowsHide: true,
          timeout: 5000,
        });
        if (result.status === 0 && result.stdout) {
          version = result.stdout.trim().slice(0, 50);
        }
      } catch { /* noop */ }
    }

    results.push({
      id: def.id,
      name: def.displayName,
      cli_binary: def.cliBinary,
      path: resolvedPath || undefined,
      installed: !!resolvedPath,
      icon_name: def.iconName,
      category: 'local-cli',
      description: def.description,
      version,
    });
  }

  return results;
}

/** Build child process env — only inject whitelisted credential env vars. */
export function buildChildEnv(def: AgentDef, apiKey?: string): Record<string, string> {
  const env: Record<string, string> = { ...process.env };
  if (apiKey && def.envKeyNames?.[0]) {
    env[def.envKeyNames[0]] = apiKey;
  }
  return env;
}

/**
 * Escape and quote arguments for Windows cmd.exe invocations (e.g. .cmd or .bat shims).
 * Escapes meta-characters and doubles existing double-quotes.
 */
export function quoteCmdArg(arg: string): string {
  // Replace cmd meta-characters with caret-escaped versions
  // cmd meta chars: & | < > ^ %
  // Note: inside double quotes, % and ^ can still be expanded in cmd, but caret escaping & | < > ^ % protects against chaining.
  const escapedQuotes = arg.replace(/"/g, '""');
  const escapedMeta = escapedQuotes.replace(/([&|<>\^%])/g, '^$1');
  return `"${escapedMeta}"`;
}

type OnChunkFn = (chunk: string) => void;

/**
 * Run a CLI agent subprocess: prompt via stdin, stream stdout chunks.
 * Returns full accumulated text on success.
 */
export async function runCliAgent(
  def: AgentDef,
  prompt: string,
  opts: { model?: string; env?: Record<string, string>; onChunk: OnChunkFn },
): Promise<string> {
  const resolvedPath = await resolveBinary(def);
  if (!resolvedPath) {
    throw new Error(`CLI binary not found: ${def.cliBinary}`);
  }

  let args = def.buildArgs
    ? def.buildArgs({ model: opts.model, ...(def.promptViaArgv ? { prompt } : {}) })
    : [];
  const isWin = process.platform === 'win32';
  const useShell = isWin && (resolvedPath.endsWith('.cmd') || resolvedPath.endsWith('.bat'));

  if (useShell) {
    args = args.map(arg => quoteCmdArg(arg));
  }

  const child = spawn(resolvedPath, args, {
    shell: useShell,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    env: opts.env || buildChildEnv(def),
  });

  let fullText = '';
  let stderrBuf = '';
  let childError: Error | null = null;
  const FIRST_OUTPUT_TIMEOUT = 30_000;
  const INACTIVITY_TIMEOUT = 120_000;

  // Handle spawn or runtime errors
  child.on('error', (err) => {
    childError = err;
  });

  // Hard timeout: first output budget + inactivity budget.
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('CLI execution timed out')), FIRST_OUTPUT_TIMEOUT + INACTIVITY_TIMEOUT);
  });

  // Stdout handler
  child.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf-8');
    fullText += text;
    opts.onChunk(text);
  });

  // Stderr handler
  child.stderr.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString('utf-8');
  });

  // Write prompt via stdin if not passed via argv, then end stdin
  if (!def.promptViaArgv && prompt) {
    child.stdin.write(prompt);
  }
  child.stdin.end();

  // Race between exit and timeout
  const [exitCode] = await Promise.race([
    new Promise<[number | null, NodeJS.Signals | null]>((resolve) => {
      child.on('close', (code, signal) => resolve([code, signal]));
    }),
    timeoutPromise.then(() => {
      child.kill();
      return [1, 'SIGTERM'];
    }),
  ] as [number | null, NodeJS.Signals | null][]);

  if (childError) {
    throw new Error(`CLI process error: ${redactSecrets(childError.message || String(childError))}`);
  }

  if (exitCode !== 0 || exitCode === null) {
    const tail = stderrBuf.slice(-500);
    const msg = exitCode === null
      ? `CLI process was killed (${opts.model ? `model=${opts.model} ` : ''})`
      : `CLI exited with code ${exitCode}${tail ? ': ' + redactSecrets(tail) : ''}`;
    throw new Error(msg);
  }

  return fullText;
}

/** Redact secrets (copied from aiConfig so tests can verify independently). */
function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-…')
    .replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, 'sk-ant-…')
    .replace(/\bBearer [A-Za-z0-9._-]+/g, 'Bearer …')
    .replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, '$1: …')
    .replace(/key=[A-Za-z0-9_-]+/gi, 'key=…')
    .replace(/AIza[A-Za-z0-9_-]{3,}/g, 'AIza…');
}
