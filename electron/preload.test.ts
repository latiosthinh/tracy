import { describe, it, expect } from 'vitest';

const ALLOWED_INVOKE_CHANNELS = [
  'ai_config_load',
  'ai_config_save',
  'ai_connection_test',
  'ai_fetch_models',
  'launch_browser',
  'navigate_browser',
  'get_browser_screenshot',
  'get_browser_dom_tree',
  'mine_batch_urls',
  'inspect_element_at_point',
  'interact_browser',
  'set_browser_mode',
  'run_flow',
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
  'open_child_webview',
  'resize_child_webview',
  'set_child_webview_visible',
  'close_child_webview',
  'emulate_media_theme',
  'validate_dom_selector',
];

const ALLOWED_ON_CHANNELS = [
  'browser-event',
  'mine_progress',
  'step-update',
  'execution-log',
  'ai-stream-chunk',
  'agent_tool_trace',
];

describe('IPC channel whitelists', () => {
  it('invoke whitelist has expected count', () => {
    expect(ALLOWED_INVOKE_CHANNELS).toHaveLength(31);
  });

  it('on whitelist has expected count', () => {
    expect(ALLOWED_ON_CHANNELS).toHaveLength(6);
  });

  it('no overlap between invoke and on channels', () => {
    const overlap = ALLOWED_INVOKE_CHANNELS.filter(ch => ALLOWED_ON_CHANNELS.includes(ch));
    expect(overlap).toHaveLength(0);
  });

  it('all channels are non-empty strings', () => {
    for (const ch of [...ALLOWED_INVOKE_CHANNELS, ...ALLOWED_ON_CHANNELS]) {
      expect(typeof ch).toBe('string');
      expect(ch.length).toBeGreaterThan(0);
    }
  });

  it('all channels are unique within their lists', () => {
    expect(new Set(ALLOWED_INVOKE_CHANNELS).size).toBe(ALLOWED_INVOKE_CHANNELS.length);
    expect(new Set(ALLOWED_ON_CHANNELS).size).toBe(ALLOWED_ON_CHANNELS.length);
  });

  it('contains all required playwright engine channels', () => {
    const required = [
      'launch_browser', 'navigate_browser', 'get_browser_screenshot',
      'get_browser_dom_tree', 'run_flow', 'inspect_element_at_point',
    ];
    for (const ch of required) {
      expect(ALLOWED_INVOKE_CHANNELS).toContain(ch);
    }
  });

  it('contains all required file system channels', () => {
    const required = [
      'list_projects', 'save_project', 'save_project_to_disk',
      'load_project_from_disk', 'save_flow_to_disk', 'load_project_skills',
    ];
    for (const ch of required) {
      expect(ALLOWED_INVOKE_CHANNELS).toContain(ch);
    }
  });

  it('contains all required AI config channels', () => {
    const required = ['ai_config_load', 'ai_config_save', 'ai_connection_test'];
    for (const ch of required) {
      expect(ALLOWED_INVOKE_CHANNELS).toContain(ch);
    }
  });

  it('contains all required event channels', () => {
    const required = ['browser-event', 'step-update', 'execution-log', 'ai-stream-chunk'];
    for (const ch of required) {
      expect(ALLOWED_ON_CHANNELS).toContain(ch);
    }
  });
});

describe('IPC whitelist enforcement (simulated)', () => {
  function simulateInvoke(channel: string) {
    if (!ALLOWED_INVOKE_CHANNELS.includes(channel)) {
      throw new Error(`IPC invoke blocked: channel "${channel}" is not whitelisted`);
    }
  }

  function simulateOn(channel: string) {
    if (!ALLOWED_ON_CHANNELS.includes(channel)) {
      throw new Error(`IPC listen blocked: channel "${channel}" is not whitelisted`);
    }
  }

  it('allows whitelisted invoke channels', () => {
    for (const ch of ALLOWED_INVOKE_CHANNELS) {
      expect(() => simulateInvoke(ch)).not.toThrow();
    }
  });

  it('blocks non-whitelisted invoke channels', () => {
    expect(() => simulateInvoke('evil_channel')).toThrow('IPC invoke blocked');
    expect(() => simulateInvoke('exec_sync')).toThrow('IPC invoke blocked');
    expect(() => simulateInvoke('')).toThrow('IPC invoke blocked');
  });

  it('allows whitelisted on channels', () => {
    for (const ch of ALLOWED_ON_CHANNELS) {
      expect(() => simulateOn(ch)).not.toThrow();
    }
  });

  it('blocks non-whitelisted on channels', () => {
    expect(() => simulateOn('evil_event')).toThrow('IPC listen blocked');
    expect(() => simulateOn('browser-event-extra')).toThrow('IPC listen blocked');
  });
});
