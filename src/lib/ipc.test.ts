import { describe, it, expect } from 'vitest';
import { isElectronEnv, tracyApi } from './ipc';

describe('isElectronEnv', () => {
  it('returns false when window.tracyAPI is not present', () => {
    expect(isElectronEnv()).toBe(false);
  });

  it('returns true when window.tracyAPI is present', () => {
    (window as any).tracyAPI = { invoke: () => {}, on: () => {} };
    expect(isElectronEnv()).toBe(true);
    delete (window as any).tracyAPI;
  });
});

describe('tracyApi fallbacks (non-Electron)', () => {
  it('scanAgents returns default agent list', async () => {
    const agents = await tracyApi.scanAgents();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toHaveProperty('id');
    expect(agents[0]).toHaveProperty('name');
  });

  it('listProjects returns empty array', async () => {
    expect(await tracyApi.listProjects()).toEqual([]);
  });

  it('parseYamlFlow returns empty structure', async () => {
    const result = await tracyApi.parseYamlFlow('test');
    expect(result).toEqual({ steps: [], metadata: {} });
  });

  it('getBrowserScreenshot returns empty string', async () => {
    expect(await tracyApi.getBrowserScreenshot()).toBe('');
  });

  it('getBrowserDomTree returns null', async () => {
    expect(await tracyApi.getBrowserDomTree()).toBeNull();
  });

  it('mineBatchUrls returns empty array', async () => {
    expect(await tracyApi.mineBatchUrls([])).toEqual([]);
  });

  it('navigateBrowser returns null', async () => {
    expect(await tracyApi.navigateBrowser('https://example.com')).toBeNull();
  });

  it('interactBrowser returns null', async () => {
    expect(await tracyApi.interactBrowser('click')).toBeNull();
  });

  it('onBrowserEvent returns noop unlisten', async () => {
    const unlisten = await tracyApi.onBrowserEvent(() => {});
    expect(typeof unlisten).toBe('function');
    unlisten();
  });

  it('onMineProgress returns noop unlisten', async () => {
    const unlisten = await tracyApi.onMineProgress(() => {});
    expect(typeof unlisten).toBe('function');
    unlisten();
  });

  it('saveProjectToDisk returns empty string', async () => {
    expect(await tracyApi.saveProjectToDisk('p1', '/tmp', 'data')).toBe('');
  });

  it('loadProjectFromDisk returns empty string', async () => {
    expect(await tracyApi.loadProjectFromDisk('p1', '/tmp')).toBe('');
  });

  it('saveFlowToDisk returns empty string', async () => {
    expect(await tracyApi.saveFlowToDisk('p1', '/tmp', 'flow', 'yaml')).toBe('');
  });

  it('saveDomSnapshot returns empty string', async () => {
    expect(await tracyApi.saveDomSnapshot('p1', '/tmp', '/page', 'data')).toBe('');
  });

  it('loadDomSnapshots returns empty array', async () => {
    expect(await tracyApi.loadDomSnapshots('p1', '/tmp')).toEqual([]);
  });

  it('savePlaywrightCode returns empty string', async () => {
    expect(await tracyApi.savePlaywrightCode('p1', '/tmp', 'test.spec.ts', 'code')).toBe('');
  });

  it('openChildWebview returns void', async () => {
    await expect(tracyApi.openChildWebview('https://example.com', 0, 0, 800, 600)).resolves.toBeUndefined();
  });

  it('closeChildWebview returns void', async () => {
    await expect(tracyApi.closeChildWebview()).resolves.toBeUndefined();
  });

  it('launchBrowser returns void', async () => {
    await expect(tracyApi.launchBrowser()).resolves.toBeUndefined();
  });

  it('setBrowserMode returns void', async () => {
    await expect(tracyApi.setBrowserMode('idle')).resolves.toBeUndefined();
  });
});
