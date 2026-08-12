import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';

function assertSafePath(basePath: string, ...segments: string[]): string {
  if (!basePath || typeof basePath !== 'string') {
    throw new Error('Invalid base path specified');
  }
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(resolvedBase, ...segments);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error(`Path traversal blocked: target "${resolvedTarget}" is outside base directory "${resolvedBase}"`);
  }
  return resolvedTarget;
}

export function registerFileSystemHandlers() {
  ipcMain.handle('list_projects', async () => {
    // Stub or implementation
    return [];
  });

  ipcMain.handle('save_project', async (event, { project }) => {
    if (!project || !project.saveLocation) return;
    const targetFile = assertSafePath(project.saveLocation, 'project.json');
    const data = JSON.stringify(project, null, 2);
    await fs.mkdir(project.saveLocation, { recursive: true });
    await fs.writeFile(targetFile, data, 'utf-8');
  });

  ipcMain.handle('scan_agent_clis', async () => {
    return [
      {
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash (Direct API)',
        cli_binary: 'gemini-api',
        installed: true,
        icon_name: 'Sparkles',
        category: 'cloud-api',
        description: 'Direct Gemini API call server side',
      },
    ];
  });

  ipcMain.handle('run_agent_cli_stream', async (event, { agentId, prompt, systemInstruction }) => {
    // Stub
    return "This is a stub for the AI agent in Electron.";
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
    const targetFile = assertSafePath(saveLocation, 'project.json');
    await fs.mkdir(saveLocation, { recursive: true });
    await fs.writeFile(targetFile, data, 'utf-8');
    return saveLocation;
  });

  ipcMain.handle('load_project_from_disk', async (event, { projectId, saveLocation }) => {
    const targetFile = assertSafePath(saveLocation, 'project.json');
    return await fs.readFile(targetFile, 'utf-8');
  });

  ipcMain.handle('save_flow_to_disk', async (event, { projectId, saveLocation, flowName, yamlContent }) => {
    const flowsDir = assertSafePath(saveLocation, 'flows');
    const targetFile = assertSafePath(flowsDir, flowName);
    await fs.mkdir(flowsDir, { recursive: true });
    await fs.writeFile(targetFile, yamlContent, 'utf-8');
    return targetFile;
  });

  ipcMain.handle('save_dom_snapshot', async (event, { projectId, saveLocation, pagePath, snapshotData }) => {
    const snapsDir = assertSafePath(saveLocation, 'snapshots');
    await fs.mkdir(snapsDir, { recursive: true });
    const filename = pagePath.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    const targetFile = assertSafePath(snapsDir, filename);
    await fs.writeFile(targetFile, snapshotData, 'utf-8');
    return targetFile;
  });

  ipcMain.handle('load_dom_snapshots', async (event, { projectId, saveLocation }) => {
    const snapsDir = assertSafePath(saveLocation, 'snapshots');
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
    const testsDir = assertSafePath(saveLocation, 'tests');
    const targetFile = assertSafePath(testsDir, fileName);
    await fs.mkdir(testsDir, { recursive: true });
    await fs.writeFile(targetFile, code, 'utf-8');
    return targetFile;
  });
}
