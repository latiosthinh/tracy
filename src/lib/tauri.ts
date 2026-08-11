import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { Project, FlowFile } from '../types/autoflow';

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

// Helper to check if running inside Tauri environment
export const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const tracyApi = {
  // Agent CLI Management (html-anything style)
  scanAgents: async (): Promise<DetectedAgent[]> => {
    if (!isTauriEnv()) {
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
    if (!isTauriEnv()) {
      // Browser fallback to express or mock
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
    return listen<StreamChunkPayload>('ai-stream-chunk', (event) => callback(event.payload));
  },

  // Project Store
  listProjects: async (): Promise<Project[]> => {
    if (!isTauriEnv()) return [];
    return invoke<Project[]>('list_projects');
  },

  saveProject: async (project: Project): Promise<void> => {
    if (!isTauriEnv()) return;
    return invoke('save_project', { project });
  },

  parseYamlFlow: async (yamlContent: string): Promise<any> => {
    if (!isTauriEnv()) return { steps: [], metadata: {} };
    return invoke('parse_yaml_flow', { yamlContent });
  },

  // Engine Execution
  runFlow: async (flow: FlowFile, targetBaseUrl: string, speedMs: number = 600): Promise<void> => {
    if (!isTauriEnv()) return;
    return invoke('run_flow', { flow, targetBaseUrl, speedMs });
  },

  onStepUpdate: async (callback: (payload: StepUpdatePayload) => void): Promise<UnlistenFn> => {
    return listen<StepUpdatePayload>('step-update', (event) => callback(event.payload));
  },

  onExecutionLog: async (callback: (payload: ExecutionLogEntry) => void): Promise<UnlistenFn> => {
    return listen<ExecutionLogEntry>('execution-log', (event) => callback(event.payload));
  },

  // Local File Storage
  saveProjectToDisk: async (projectId: string, saveLocation: string, data: string): Promise<string> => {
    if (!isTauriEnv()) return '';
    return invoke<string>('save_project_to_disk', { projectId, saveLocation, data });
  },

  loadProjectFromDisk: async (projectId: string, saveLocation: string): Promise<string> => {
    if (!isTauriEnv()) return '';
    return invoke<string>('load_project_from_disk', { projectId, saveLocation });
  },

  saveFlowToDisk: async (projectId: string, saveLocation: string, flowName: string, yamlContent: string): Promise<string> => {
    if (!isTauriEnv()) return '';
    return invoke<string>('save_flow_to_disk', { projectId, saveLocation, flowName, yamlContent });
  },

  saveDomSnapshot: async (projectId: string, saveLocation: string, pagePath: string, snapshotData: string): Promise<string> => {
    if (!isTauriEnv()) return '';
    return invoke<string>('save_dom_snapshot', { projectId, saveLocation, pagePath, snapshotData });
  },

  loadDomSnapshots: async (projectId: string, saveLocation: string): Promise<Array<[string, string]>> => {
    if (!isTauriEnv()) return [];
    return invoke<Array<[string, string]>>('load_dom_snapshots', { projectId, saveLocation });
  },

  savePlaywrightCode: async (projectId: string, saveLocation: string, fileName: string, code: string): Promise<string> => {
    if (!isTauriEnv()) return '';
    return invoke<string>('save_playwright_code', { projectId, saveLocation, fileName, code });
  },

  // Real Browser Control
  getBrowserScreenshot: async (): Promise<string> => {
    if (!isTauriEnv()) return '';
    return invoke<string>('get_browser_screenshot');
  },

  getBrowserDomTree: async (): Promise<any> => {
    if (!isTauriEnv()) return null;
    return invoke('get_browser_dom_tree');
  },

  inspectElementAtPoint: async (x: number, y: number): Promise<any> => {
    if (!isTauriEnv()) return null;
    return invoke('inspect_element_at_point', { x, y });
  },

  launchBrowser: async (headless: boolean = true): Promise<void> => {
    if (!isTauriEnv()) return;
    return invoke('launch_browser', { headless });
  },

  /**
   * Navigate the Playwright browser to `url`.
   * Returns { url, title, image (base64 PNG), mimeType }
   */
  navigateBrowser: async (url: string): Promise<{ url: string; title: string; image: string; mimeType: string } | null> => {
    if (!isTauriEnv()) return null;
    return invoke('navigate_browser', { url });
  },

  interactBrowser: async (action: string, params?: { x?: number, y?: number, deltaX?: number, deltaY?: number, key?: string }): Promise<{ url: string; title: string; image: string; mimeType: string } | null> => {
    if (!isTauriEnv()) return null;
    return invoke('interact_browser', { 
      action,
      x: params?.x || null,
      y: params?.y || null,
      deltaX: params?.deltaX || null,
      deltaY: params?.deltaY || null,
      key: params?.key || null
    });
  },

  // Child Webview Control (Native browser view)
  openChildWebview: async (url: string, x: number, y: number, width: number, height: number): Promise<void> => {
    if (!isTauriEnv()) return;
    return invoke('open_child_webview', { url, x, y, width, height });
  },

  resizeChildWebview: async (x: number, y: number, width: number, height: number): Promise<void> => {
    if (!isTauriEnv()) return;
    return invoke('resize_child_webview', { x, y, width, height });
  },

  setChildWebviewVisible: async (visible: boolean): Promise<void> => {
    if (!isTauriEnv()) return;
    return invoke('set_child_webview_visible', { visible });
  },

  closeChildWebview: async (): Promise<void> => {
    if (!isTauriEnv()) return;
    return invoke('close_child_webview');
  },
};
