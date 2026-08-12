// Mock types for compatibility
export type UnlistenFn = () => void;

import { Project, FlowFile } from '@/src/types/autoflow';

export interface DetectedAgent {
  id: string;
  name: string;
  cli_binary: string;
  path?: string;
  installed: boolean;
  icon_name: string;
  category: string; // 'local-cli' | 'cloud-api'
  description: string;
}

export interface StreamChunkPayload {
  agentId: string;
  delta: string;
}

export interface StepUpdatePayload {
  stepIndex: number;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  errorMessage?: string;
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'assertion' | 'error' | 'warn';
  stepIndex?: number;
  message: string;
}

// Helper to check if running inside Electron environment
export const isElectronEnv = (): boolean => {
  return typeof window !== 'undefined' && 'tracyAPI' in (window as any);
};

const invoke = async <T>(channel: string, args?: any): Promise<T> => {
  return (window as any).tracyAPI.invoke(channel, args);
};

const listen = async <T>(channel: string, callback: (payload: T) => void): Promise<UnlistenFn> => {
  return (window as any).tracyAPI.on(channel, (event: any, payload: T) => callback(payload));
};

export const tracyApi = {
  // Agent CLI Management
  scanAgents: async (): Promise<DetectedAgent[]> => {
    if (!isElectronEnv()) {
      return [
        {
          id: 'claude-code',
          name: 'Claude Code CLI',
          cli_binary: 'claude',
          installed: false,
          icon_name: 'Sparkles',
          category: 'local-cli',
          description: 'Anthropic Claude Code CLI — auto-detected on PATH',
        },
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
    }
    return invoke<DetectedAgent[]>('scan_agent_clis');
  },

  runAgentStream: async (agentId: string, prompt: string, systemInstruction?: string): Promise<string> => {
    if (!isElectronEnv()) {
      // Browser fallback
      const res = await fetch('/api/gemini/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, agentProvider: agentId }),
      });
      const data = await res.json();
      return data.yaml || '';
    }
    return invoke<string>('run_agent_cli_stream', { agentId, prompt, systemInstruction });
  },

  onAgentStreamChunk: async (callback: (payload: StreamChunkPayload) => void): Promise<UnlistenFn> => {
    return listen<StreamChunkPayload>('ai-stream-chunk', callback);
  },

  // Project Store
  listProjects: async (): Promise<Project[]> => {
    if (!isElectronEnv()) return [];
    return invoke<Project[]>('list_projects');
  },

  saveProject: async (project: Project): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('save_project', { project });
  },

  parseYamlFlow: async (yamlContent: string): Promise<any> => {
    if (!isElectronEnv()) return { steps: [], metadata: {} };
    return invoke('parse_yaml_flow', { yamlContent });
  },

  // Engine Execution
  runFlow: async (flow: FlowFile, targetBaseUrl: string, speedMs: number = 600): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('run_flow', { flow, targetBaseUrl, speedMs });
  },

  onStepUpdate: async (callback: (payload: StepUpdatePayload) => void): Promise<UnlistenFn> => {
    return listen<StepUpdatePayload>('step-update', callback);
  },

  onExecutionLog: async (callback: (payload: ExecutionLogEntry) => void): Promise<UnlistenFn> => {
    return listen<ExecutionLogEntry>('execution-log', callback);
  },

  // Local File Storage
  saveProjectToDisk: async (projectId: string, saveLocation: string, data: string): Promise<string> => {
    if (!isElectronEnv()) return '';
    return invoke<string>('save_project_to_disk', { projectId, saveLocation, data });
  },

  loadProjectFromDisk: async (projectId: string, saveLocation: string): Promise<string> => {
    if (!isElectronEnv()) return '';
    return invoke<string>('load_project_from_disk', { projectId, saveLocation });
  },

  saveFlowToDisk: async (projectId: string, saveLocation: string, flowName: string, yamlContent: string): Promise<string> => {
    if (!isElectronEnv()) return '';
    return invoke<string>('save_flow_to_disk', { projectId, saveLocation, flowName, yamlContent });
  },

  saveDomSnapshot: async (projectId: string, saveLocation: string, pagePath: string, snapshotData: string): Promise<string> => {
    if (!isElectronEnv()) return '';
    return invoke<string>('save_dom_snapshot', { projectId, saveLocation, pagePath, snapshotData });
  },

  loadDomSnapshots: async (projectId: string, saveLocation: string): Promise<Array<[string, string]>> => {
    if (!isElectronEnv()) return [];
    return invoke<Array<[string, string]>>('load_dom_snapshots', { projectId, saveLocation });
  },

  savePlaywrightCode: async (projectId: string, saveLocation: string, fileName: string, code: string): Promise<string> => {
    if (!isElectronEnv()) return '';
    return invoke<string>('save_playwright_code', { projectId, saveLocation, fileName, code });
  },

  // Real Browser Control
  getBrowserScreenshot: async (): Promise<string> => {
    if (!isElectronEnv()) return '';
    return invoke<string>('get_browser_screenshot');
  },

  getBrowserDomTree: async (): Promise<any> => {
    if (!isElectronEnv()) return null;
    return invoke('get_browser_dom_tree');
  },

  mineBatchUrls: async (targets: any[], returnToUrl?: string): Promise<any[]> => {
    if (!isElectronEnv()) return [];
    return invoke('mine_batch_urls', { targets, returnToUrl });
  },

  inspectElementAtPoint: async (x: number, y: number): Promise<any> => {
    if (!isElectronEnv()) return null;
    return invoke('inspect_element_at_point', { x, y });
  },

  launchBrowser: async (headless: boolean = true): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('launch_browser', { headless });
  },

  navigateBrowser: async (url: string): Promise<{ url: string; title: string; image: string; mimeType: string } | null> => {
    if (!isElectronEnv()) return null;
    return invoke('navigate_browser', { url });
  },

  interactBrowser: async (action: string, params?: { x?: number, y?: number, deltaX?: number, deltaY?: number, key?: string }): Promise<{ url: string; title: string; image: string; mimeType: string } | null> => {
    if (!isElectronEnv()) return null;
    return invoke('interact_browser', { 
      action,
      x: params?.x || null,
      y: params?.y || null,
      deltaX: params?.deltaX || null,
      deltaY: params?.deltaY || null,
      key: params?.key || null
    });
  },

  setBrowserMode: async (mode: 'idle' | 'inspect' | 'record'): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('set_browser_mode', { mode });
  },

  onBrowserEvent: async (callback: (payload: { type: string, data: any }) => void): Promise<UnlistenFn> => {
    if (!isElectronEnv()) return () => {};
    return listen('browser-event', callback);
  },

  onMineProgress: async (callback: (message: string) => void): Promise<UnlistenFn> => {
    if (!isElectronEnv()) return () => {};
    return listen('mine_progress', callback);
  },

  // Child Webview Control (Native browser view)
  openChildWebview: async (url: string, x: number, y: number, width: number, height: number): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('open_child_webview', { url, x, y, width, height });
  },

  resizeChildWebview: async (x: number, y: number, width: number, height: number): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('resize_child_webview', { x, y, width, height });
  },

  setChildWebviewVisible: async (visible: boolean): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('set_child_webview_visible', { visible });
  },

  closeChildWebview: async (): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('close_child_webview');
  },
};
