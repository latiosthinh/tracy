import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';

export function registerFileSystemHandlers() {
  ipcMain.handle('list_projects', async () => {
    // Stub or implementation
    return [];
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
      const parsed = yaml.load(yamlContent) as any;
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
    await fs.mkdir(saveLocation, { recursive: true });
    await fs.writeFile(path.join(saveLocation, 'project.json'), data, 'utf-8');
    return saveLocation;
  });

  ipcMain.handle('load_project_from_disk', async (event, { projectId, saveLocation }) => {
    return await fs.readFile(path.join(saveLocation, 'project.json'), 'utf-8');
  });

  ipcMain.handle('save_flow_to_disk', async (event, { projectId, saveLocation, flowName, yamlContent }) => {
    const flowsDir = path.join(saveLocation, 'flows');
    await fs.mkdir(flowsDir, { recursive: true });
    await fs.writeFile(path.join(flowsDir, flowName), yamlContent, 'utf-8');
    return path.join(flowsDir, flowName);
  });

  ipcMain.handle('save_dom_snapshot', async (event, { projectId, saveLocation, pagePath, snapshotData }) => {
    const snapsDir = path.join(saveLocation, 'snapshots');
    await fs.mkdir(snapsDir, { recursive: true });
    const filename = pagePath.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    await fs.writeFile(path.join(snapsDir, filename), snapshotData, 'utf-8');
    return path.join(snapsDir, filename);
  });

  ipcMain.handle('load_dom_snapshots', async (event, { projectId, saveLocation }) => {
    const snapsDir = path.join(saveLocation, 'snapshots');
    try {
      const files = await fs.readdir(snapsDir);
      const results: Array<[string, string]> = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(snapsDir, file), 'utf-8');
          results.push([file.replace('.json', ''), data]);
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  });

  ipcMain.handle('save_playwright_code', async (event, { projectId, saveLocation, fileName, code }) => {
    const testsDir = path.join(saveLocation, 'tests');
    await fs.mkdir(testsDir, { recursive: true });
    await fs.writeFile(path.join(testsDir, fileName), code, 'utf-8');
    return path.join(testsDir, fileName);
  });
}
