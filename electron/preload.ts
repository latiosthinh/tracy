import { contextBridge, ipcRenderer } from 'electron';

// Whitelist of allowed IPC channels — only these can be invoked from the renderer.
// This prevents arbitrary channel access that would defeat contextIsolation.
const ALLOWED_INVOKE_CHANNELS = [
  // AI config persistence & testing
  'ai_config_load',
  'ai_config_save',
  'ai_connection_test',
  'ai_fetch_models',
  // Playwright engine
  'launch_browser',
  'navigate_browser',
  'get_browser_screenshot',
  'get_browser_dom_tree',
  'mine_batch_urls',
  'inspect_element_at_point',
  'interact_browser',
  'set_browser_mode',
  'run_flow',
  // File system
  'list_projects',
  'scan_agent_clis',
  'run_agent_cli_stream',
  'parse_yaml_flow',
  'save_project',
  'save_project_to_disk',
  'load_project_from_disk',
  'save_flow_to_disk',
  'save_dom_snapshot',
  'load_dom_snapshots',
  'save_playwright_code',
  'load_project_skills',
  // Webview management
  'open_child_webview',
  'resize_child_webview',
  'set_child_webview_visible',
  'close_child_webview',
  'emulate_media_theme',
  'validate_dom_selector',
  // Autonomous route & interaction crawler
  'start_crawl',
  'stop_crawl',
  'generate_crawl_flows',
];

const ALLOWED_ON_CHANNELS = [
  'browser-event',
  'mine_progress',
  'step-update',
  'execution-log',
  'ai-stream-chunk',
  'agent_tool_trace',
  'crawler_progress',
];

contextBridge.exposeInMainWorld('tracyAPI', {
  invoke: (channel: string, args: any) => {
    if (!ALLOWED_INVOKE_CHANNELS.includes(channel)) {
      throw new Error(`IPC invoke blocked: channel "${channel}" is not whitelisted`);
    }
    return ipcRenderer.invoke(channel, args);
  },
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    if (!ALLOWED_ON_CHANNELS.includes(channel)) {
      throw new Error(`IPC listen blocked: channel "${channel}" is not whitelisted`);
    }
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
