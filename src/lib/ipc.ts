// Mock types for compatibility
export type UnlistenFn = () => void;

import { Project, FlowFile } from '@/src/types/autoflow';
import type { SkillDefinition, SelectorValidationPayload, SelectorValidationResult } from '@/src/types/skills';

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
  return (window as any).tracyAPI.on(channel, (_event: any, payload: T) => callback(payload));
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

  runAgentStream: async (agentId: string, prompt: string, systemInstruction?: string, model?: string): Promise<string> => {
    if (!isElectronEnv()) {
      // Browser fallback
      const res = await fetch('/api/gemini/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, agentProvider: agentId, selectedModel: model }),
      });
      const data = await res.json();
      return data.yaml || '';
    }
    return invoke<string>('run_agent_cli_stream', { agentId, prompt, systemInstruction, model });
  },

  onAgentStreamChunk: async (callback: (payload: StreamChunkPayload) => void): Promise<UnlistenFn> => {
    if (!isElectronEnv()) return () => {};
    return listen<StreamChunkPayload>('ai-stream-chunk', callback);
  },

  // AI Config Persistence
  loadAiConfig: async (): Promise<AiConfigPayload | null> => {
    if (!isElectronEnv()) return null;
    return invoke<AiConfigPayload>('ai_config_load');
  },

  saveAiConfig: async (cfg: AiConfigPayload): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('ai_config_save', cfg);
  },

  testAiConnection: async (payload: AiConnectionTestPayload): Promise<AiConnectionTestResult> => {
    if (!isElectronEnv()) return { ok: false, errorMessage: 'Connection tests require the desktop app' };
    return invoke<AiConnectionTestResult>('ai_connection_test', payload);
  },

  fetchAiModels: async (payload: { agentId: string; apiKey?: string; customEndpoint?: string }): Promise<string[]> => {
    if (!isElectronEnv()) return [];
    return invoke<string[]>('ai_fetch_models', payload);
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
    if (!isElectronEnv()) return () => {};
    return listen<StepUpdatePayload>('step-update', callback);
  },

  onExecutionLog: async (callback: (payload: ExecutionLogEntry) => void): Promise<UnlistenFn> => {
    if (!isElectronEnv()) return () => {};
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

  loadProjectSkills: async (saveLocation: string): Promise<{ skills: SkillDefinition[]; warnings: string[] }> => {
    if (!isElectronEnv()) return { skills: [], warnings: [] };
    return invoke<{ skills: SkillDefinition[]; warnings: string[] }>('load_project_skills', { saveLocation });
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

  // Child Webview Control (Native browser view — one session per project)
  openChildWebview: async (projectId: string, url: string, x: number, y: number, width: number, height: number): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('open_child_webview', { projectId, url, x, y, width, height });
  },

  resizeChildWebview: async (projectId: string, x: number, y: number, width: number, height: number): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('resize_child_webview', { projectId, x, y, width, height });
  },

  setChildWebviewVisible: async (projectId: string, visible: boolean): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('set_child_webview_visible', { projectId, visible });
  },

  closeChildWebview: async (projectId: string): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('close_child_webview', { projectId });
  },

  emulateMediaTheme: async (projectId: string, theme: 'dark' | 'light' | 'no-preference'): Promise<void> => {
    if (!isElectronEnv()) return;
    return invoke('emulate_media_theme', { projectId, theme });
  },

  // DOM Selector Pre-Validation Engine (Isolated-world child webview probing)
  validateDomSelector: async (payload: SelectorValidationPayload): Promise<SelectorValidationResult> => {
    if (!isElectronEnv()) {
      return {
        valid: false,
        selector: payload.selector || '',
        selectorType: payload.selectorType || 'auto',
        matchCount: 0,
        visibleCount: 0,
        matches: [],
        error: 'DOM selector pre-validation requires Electron desktop environment',
        durationMs: 0,
      };
    }
    return invoke<SelectorValidationResult>('validate_dom_selector', payload);
  },
};
