import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';
// NOTE: relative import — the electron main build does not resolve the '@/' alias.
import { agentsByCategory, resolveAgentId, getAgentDef } from '../../src/lib/aiRegistry';
import { detectCliAgents, runCliAgent, buildChildEnv } from './cliRunner.js';
import { getResolvedCredentials } from './aiConfig.js';

export function resolveSafeBase(saveLocation: string): string {
  if (!saveLocation || typeof saveLocation !== 'string' || !saveLocation.trim()) {
    throw new Error('Invalid save location: path cannot be empty');
  }
  return path.resolve(saveLocation.trim());
}

export function assertSafePath(basePath: string, ...segments: string[]): string {
  if (!basePath || typeof basePath !== 'string' || !basePath.trim()) {
    throw new Error('Invalid base path specified');
  }
  const resolvedBase = path.resolve(basePath.trim());
  const resolvedTarget = path.resolve(resolvedBase, ...segments);
  const isExactBase = resolvedTarget === resolvedBase;
  const isChild = resolvedTarget.startsWith(resolvedBase + path.sep);
  if (!isExactBase && !isChild) {
    throw new Error(`Path traversal blocked: target "${resolvedTarget}" is outside base directory "${resolvedBase}"`);
  }
  return resolvedTarget;
}

/** Redact secrets for safe error messages. */
function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-…')
    .replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, 'sk-ant-…')
    .replace(/\bBearer [A-Za-z0-9._-]+/g, 'Bearer …')
    .replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, '$1: …')
    .replace(/key=[A-Za-z0-9_-]+/gi, 'key=…')
    .replace(/AIza[A-Za-z0-9_-]{3,}/g, 'AIza…');
}

export function registerFileSystemHandlers() {
  ipcMain.handle('list_projects', async () => {
    // Stub or implementation
    return [];
  });

  ipcMain.handle('save_project', async (event, { project }) => {
    if (!project || !project.saveLocation) return;
    const base = resolveSafeBase(project.saveLocation);
    const targetFile = assertSafePath(base, 'project.json');
    const data = JSON.stringify(project, null, 2);
    await fs.mkdir(base, { recursive: true });
    await fs.writeFile(targetFile, data, 'utf-8');
  });

  ipcMain.handle('scan_agent_clis', async () => {
    const detected = await detectCliAgents();
    const cloudEntries = agentsByCategory('cloud-api').map((def) => ({
      id: def.id,
      name: def.displayName,
      cli_binary: '',
      installed: true,
      icon_name: def.iconName,
      category: 'cloud-api',
      description: def.description,
    }));
    return [...detected, ...cloudEntries];
  });

  ipcMain.handle('run_agent_cli_stream', async (event, payload: { agentId: string; prompt: string; systemInstruction?: string; model?: string }) => {
    const { agentId, prompt, systemInstruction, model } = payload;
    const canonicalId = resolveAgentId(agentId);
    const def = getAgentDef(canonicalId);

    if (!def) {
      // Fallback: unknown agent → try createProvider (existing behavior)
      try {
        const { createProvider } = await import('./aiProvider.js');
        const provider = await createProvider(canonicalId, {});
        return await provider.generateFlow(prompt, systemInstruction);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('AI provider error:', err);
        throw new Error(`AI generation failed: ${redactSecrets(msg)}`);
      }
    }

    // Resolve credential precedence: persisted config > process.env
    const { apiKey, customEndpoint, model: storedModel } = await getResolvedCredentials(canonicalId);
    const finalModel = model || storedModel || def.defaultModel || '';
    const finalEndpoint = customEndpoint || def.defaultEndpoint || '';

    // CLI agents: spawn subprocess with stdin prompt
    if (def.kind === 'cli') {
      try {
        const env = buildChildEnv(def, apiKey);
        const fullPrompt = systemInstruction
          ? `${systemInstruction}\n\n${prompt}`
          : prompt;
        return await runCliAgent(def, fullPrompt, {
          model: finalModel,
          env,
          onChunk: (d: string) => {
            event.sender.send('ai-stream-chunk', { agentId, delta: d });
          },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('CLI agent error:', err);
        throw new Error(`AI generation failed: ${redactSecrets(msg)}`);
      }
    }

    // HTTP agents: use createProvider with streaming (step 5 addition)
    try {
      const { createProvider } = await import('./aiProvider.js');
      const provider = await createProvider(canonicalId, {
        apiKey,
        customEndpoint: finalEndpoint,
        model: finalModel,
      });
      // Try streaming first, fall back to one-shot
      const genFn = provider as any;
      if (typeof genFn.generateFlowStream === 'function') {
        let result = '';
        await genFn.generateFlowStream(
          prompt,
          systemInstruction,
          (chunk: string) => {
            event.sender.send('ai-stream-chunk', { agentId, delta: chunk });
            result += chunk;
          },
        );
        return result;
      }
      return await provider.generateFlow(prompt, systemInstruction);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('AI provider error:', err);
      throw new Error(`AI generation failed: ${redactSecrets(msg)}`);
    }
  });

  ipcMain.handle('parse_yaml_flow', async (event, { yamlContent }) => {
    try {
      const parsed = yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA }) as any;
      if (!parsed) return { steps: [], metadata: {} };

      const steps: any[] = [];
      const metadata: any = { url: parsed.url, name: parsed.name };

      if (Array.isArray(parsed)) {
        // Just an array of steps
        parsed.forEach((item: any, i: number) => {
          const command = Object.keys(item)[0];
          steps.push({
            id: `step-${Date.now()}-${i}`,
            command,
            target: item[command],
            status: 'pending'
          });
        });
      } else if (parsed.steps && Array.isArray(parsed.steps)) {
        parsed.steps.forEach((item: any, i: number) => {
          const command = Object.keys(item)[0];
          steps.push({
            id: `step-${Date.now()}-${i}`,
            command,
            target: item[command],
            status: 'pending'
          });
        });
      }

      return { steps, metadata };
    } catch (e) {
      console.error('Yaml parsing error', e);
      return { steps: [], metadata: {} };
    }
  });

  ipcMain.handle('save_project_to_disk', async (event, { projectId, saveLocation, data }) => {
    const base = resolveSafeBase(saveLocation);
    const targetFile = assertSafePath(base, 'project.json');
    await fs.mkdir(base, { recursive: true });
    await fs.writeFile(targetFile, data, 'utf-8');
    return base;
  });

  ipcMain.handle('load_project_from_disk', async (event, { projectId, saveLocation }) => {
    const base = resolveSafeBase(saveLocation);
    const targetFile = assertSafePath(base, 'project.json');
    return await fs.readFile(targetFile, 'utf-8');
  });

  ipcMain.handle('save_flow_to_disk', async (event, { projectId, saveLocation, flowName, yamlContent }) => {
    const base = resolveSafeBase(saveLocation);
    const flowsDir = assertSafePath(base, 'flows');
    const targetFile = assertSafePath(flowsDir, flowName);
    await fs.mkdir(flowsDir, { recursive: true });
    await fs.writeFile(targetFile, yamlContent, 'utf-8');
    return targetFile;
  });

  ipcMain.handle('save_dom_snapshot', async (event, { projectId, saveLocation, pagePath, snapshotData }) => {
    const base = resolveSafeBase(saveLocation);
    const snapsDir = assertSafePath(base, 'snapshots');
    await fs.mkdir(snapsDir, { recursive: true });
    const filename = pagePath.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    const targetFile = assertSafePath(snapsDir, filename);
    await fs.writeFile(targetFile, snapshotData, 'utf-8');
    return targetFile;
  });

  ipcMain.handle('load_dom_snapshots', async (event, { projectId, saveLocation }) => {
    const base = resolveSafeBase(saveLocation);
    const snapsDir = assertSafePath(base, 'snapshots');
    try {
      const files = await fs.readdir(snapsDir);
      const results: Array<[string, string]> = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = assertSafePath(snapsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          results.push([file.replace('.json', ''), data]);
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  });

  ipcMain.handle('save_playwright_code', async (event, { projectId, saveLocation, fileName, code }) => {
    const base = resolveSafeBase(saveLocation);
    const testsDir = assertSafePath(base, 'tests');
    const targetFile = assertSafePath(testsDir, fileName);
    await fs.mkdir(testsDir, { recursive: true });
    await fs.writeFile(targetFile, code, 'utf-8');
    return targetFile;
  });
}
