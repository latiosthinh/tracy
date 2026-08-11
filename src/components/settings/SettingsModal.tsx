import React, { useState } from 'react';
import {
  X,
  Bot,
  Globe,
  Sliders,
  Key,
  Database,
  FileSpreadsheet,
  Terminal,
  Check,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Palette,
  FolderOpen,
  HardDrive,
} from 'lucide-react';
import type { WorkspaceConfig } from '../../types/index';
import { DEFAULT_WORKSPACE_CONFIG } from '../../data/defaultFlows';
import type { UiSettings } from '../../types/uiSettings';
import { DEFAULT_UI_SETTINGS } from '../../types/uiSettings';
import { CliTerminal } from '../reports/CliTerminal';
import { UiSettingsPanel } from './UiSettingsPanel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: WorkspaceConfig;
  workspaceConfig?: WorkspaceConfig;
  onSaveConfig?: (updatedConfig: WorkspaceConfig) => void;
  onWorkspaceConfigChange?: (updatedConfig: WorkspaceConfig) => void;
  uiSettings?: UiSettings;
  onSaveUiSettings?: (updatedUiSettings: UiSettings) => void;
  onUiSettingsChange?: (updatedUiSettings: UiSettings) => void;
  activeFlowPath?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config: configProp,
  workspaceConfig: workspaceConfigProp,
  onWorkspaceConfigChange,
  uiSettings = DEFAULT_UI_SETTINGS,
  onUiSettingsChange,
  activeFlowPath = 'flows/checkout.yaml',
}) => {
  const activeConfig = configProp || workspaceConfigProp || DEFAULT_WORKSPACE_CONFIG;
  const [activeTab, setActiveTab] = useState<'agents' | 'runtime' | 'env' | 'artifacts' | 'storage' | 'skills' | 'cli' | 'ui'>('agents');
  const [uiSettingsState, setUiSettingsState] = useState<UiSettings>(uiSettings);

  // AI Agent Settings State
  const [settingsAgentTab, setSettingsAgentTab] = useState<'local-agent-cli' | 'byok'>('local-agent-cli');
  const [agentProvider, setAgentProvider] = useState<string>('local-agent-cli');
  const [geminiApiKey, setGeminiApiKey] = useState('AIzaSyD-sample-key-ghostflow-gemini');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an expert E2E web testing agent. Generate robust Playwright assertion steps.'
  );
  const [autoRepairEnabled, setAutoRepairEnabled] = useState(true);

  // Runtime & Browser State
  const [browserEngine] = useState<'chromium'>('chromium');
  const [headless, setHeadless] = useState<boolean>(activeConfig?.headless ?? false);
  const [viewportWidth, setViewportWidth] = useState<number>(activeConfig?.viewport?.width || 1280);
  const [viewportHeight, setViewportHeight] = useState<number>(activeConfig?.viewport?.height || 800);
  const [timeoutMs, setTimeoutMs] = useState<number>(activeConfig?.timeout || 10000);
  const [retries, setRetries] = useState<number>(activeConfig?.retries ?? 2);
  const [allowedHosts, setAllowedHosts] = useState('localhost, *.example.com');
  const [allowAnyHost, setAllowAnyHost] = useState(true);

  // Environment Variables State
  const [envVars, setEnvVars] = useState<{ key: string; value: string; masked: boolean }[]>([
    { key: 'TEST_USER_EMAIL', value: 'qa-tester@example.com', masked: false },
    { key: 'TEST_USER_PASS', value: 'supersecretpass123', masked: true },
    { key: 'API_STAGING_KEY', value: 'sk_test_9988112233', masked: true },
  ]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  // Artifacts State
  const [outputDir, setOutputDir] = useState(activeConfig?.testOutputDir || 'test-results');
  const [videoMode, setVideoMode] = useState<'on-failure' | 'always' | 'never'>('on-failure');
  const [screenshotMode, setScreenshotMode] = useState<'full-page' | 'viewport' | 'element-only'>('full-page');
  const [reportFormat, setReportFormat] = useState<'html' | 'json' | 'junit' | 'markdown'>('html');

  // Storage State
  const [defaultSaveLocation, setDefaultSaveLocation] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);

  // Skill Templates
  const [skillTemplates] = useState([
    { id: 'skill-1', name: 'E-Commerce Flow', category: 'Shopping', desc: 'Validates product search, add-to-cart, cart drawer & checkout modal.' },
    { id: 'skill-2', name: 'Auth & Login RBAC', category: 'Security', desc: 'Handles session login, token verification, and role-based redirect checks.' },
    { id: 'skill-3', name: 'Network Interception', category: 'API Testing', desc: 'Mocks REST endpoints and inspects payload requests/responses.' },
    { id: 'skill-4', name: 'Responsive Audit', category: 'Visual QA', desc: 'Runs cross-device viewport assertions for mobile, tablet, and ultra-wide layouts.' },
    { id: 'skill-5', name: 'Accessibility Standard', category: 'a11y', desc: 'Checks ARIA labels, focus states, and color contrast ratios.' },
  ]);

  const [saveToast, setSaveToast] = useState(false);

  if (!isOpen) return null;

  const handleAddEnvVar = () => {
    if (!newEnvKey.trim()) return;
    setEnvVars((prev) => [...prev, { key: newEnvKey.trim(), value: newEnvVal, masked: true }]);
    setNewEnvKey('');
    setNewEnvVal('');
  };

  const handleRemoveEnvVar = (idx: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleToggleMask = (idx: number) => {
    setEnvVars((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, masked: !item.masked } : item))
    );
  };

  const handleSaveAll = () => {
    const updated: WorkspaceConfig = {
      ...activeConfig,
      browser: browserEngine,
      headless,
      viewport: { width: viewportWidth, height: viewportHeight },
      timeout: timeoutMs,
      retries,
      testOutputDir: outputDir,
      reportFormat: reportFormat === 'markdown' ? 'html' : reportFormat,
    };

    if (onWorkspaceConfigChange) {
      onWorkspaceConfigChange(updated);
    }
    if (onUiSettingsChange) {
      onUiSettingsChange(uiSettingsState);
    }
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans text-stone-100">
      <div className="bg-stone-900 border border-stone-800 rounded-[6px] w-full max-w-4xl h-[85vh] max-h-[750px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-950/80 text-amber-400 rounded-[6px] border border-amber-700/50">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-amber-100 text-lg tracking-tight">
                Tracy Studio Settings & AI Agent Configuration
              </h2>
              <p className="text-stone-400 text-xs font-mono">
                Tracy Agentic E2E Engine, Execution Runtime & System Preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-[6px] hover:bg-stone-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Tabs */}
          <div className="w-56 bg-stone-950/60 border-r border-stone-800 p-3 space-y-1 shrink-0 overflow-y-auto">
            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'agents'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Bot className="w-4 h-4 shrink-0 text-amber-400" />
              <span>AI Agents & Models</span>
            </button>

            <button
              onClick={() => setActiveTab('cli')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'cli'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Terminal className="w-4 h-4 shrink-0 text-amber-400" />
              <span>CLI Terminal & Config</span>
            </button>

            <button
              onClick={() => setActiveTab('runtime')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'runtime'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Browser & Sandbox</span>
            </button>

            <button
              onClick={() => setActiveTab('env')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'env'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Key className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Env Vars & Gate</span>
            </button>

            <button
              onClick={() => setActiveTab('artifacts')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'artifacts'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Outputs & Artifacts</span>
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'storage'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <HardDrive className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Storage & Save</span>
            </button>

            <button
              onClick={() => setActiveTab('ui')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'ui'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Palette className="w-4 h-4 shrink-0 text-amber-400" />
              <span>UI, Theme & Layout</span>
            </button>

            <button
              onClick={() => setActiveTab('skills')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'skills'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
              <span>E2E Skill Templates</span>
            </button>
          </div>

          {/* Right Tab Content Container */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {activeTab === 'ui' && (
              <UiSettingsPanel
                settings={uiSettingsState}
                onChange={setUiSettingsState}
              />
            )}

            {activeTab === 'agents' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm">AI Agent Engine Selection</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Connect local coding CLI agents or cloud-hosted GenAI APIs to auto-generate E2E test flows.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1 rounded-[6px] border border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsAgentTab('local-agent-cli');
                      if (!['cursor-cli', 'claude-code', 'command-code', 'open-code', 'gemini-cli', 'local-agent-cli'].includes(agentProvider)) {
                        setAgentProvider('local-agent-cli');
                      }
                    }}
                    className={`py-2 px-3 rounded-[4px] font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      settingsAgentTab === 'local-agent-cli'
                        ? 'bg-amber-800 text-amber-100 shadow-md border border-amber-600/80'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>local-agent-cli</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSettingsAgentTab('byok');
                      if (!['cursor-sdk', 'byok-claude', 'byok-gemini', 'byok-mimo', 'byok-openai', 'custom-gateway'].includes(agentProvider)) {
                        setAgentProvider('byok-gemini');
                      }
                    }}
                    className={`py-2 px-3 rounded-[4px] font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      settingsAgentTab === 'byok'
                        ? 'bg-amber-800 text-amber-100 shadow-md border border-amber-600/80'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    <Key className="w-4 h-4 text-amber-300" />
                    <span>BYOK (Bring Your Own Key)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {settingsAgentTab === 'local-agent-cli' ? (
                    <>
                      {[
                        { id: 'cursor-cli', name: 'Cursor CLI Agent', desc: 'Cursor Subprocess / Terminal' },
                        { id: 'claude-code', name: 'Claude Code CLI', desc: 'Claude Code System PATH' },
                        { id: 'command-code', name: 'CommandCode CLI', desc: 'CommandCode Terminal Runner' },
                        { id: 'open-code', name: 'OpenCode Interpreter', desc: 'OpenCode Agent Engine' },
                        { id: 'gemini-cli', name: 'Gemini CLI Tool', desc: 'Google Gemini CLI' },
                        { id: 'local-agent-cli', name: 'Tracy Local CLI', desc: 'Ollama / Local Socket' },
                      ].map((provider) => (
                        <div
                          key={provider.id}
                          onClick={() => setAgentProvider(provider.id)}
                          className={`p-3 rounded-[6px] border cursor-pointer transition-all ${
                            agentProvider === provider.id
                              ? 'bg-amber-950/60 border-amber-500 text-amber-50 ring-1 ring-amber-500/40'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-amber-100">{provider.name}</span>
                            {agentProvider === provider.id && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400 line-clamp-1">{provider.desc}</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        { id: 'cursor-sdk', name: 'Cursor SDK / API', desc: 'Cursor Cloud API Key' },
                        { id: 'byok-claude', name: 'Claude API', desc: 'Anthropic Claude 3.7 Sonnet' },
                        { id: 'byok-gemini', name: 'Gemini API', desc: 'Google GenAI SDK' },
                        { id: 'byok-mimo', name: 'Xiaomi MiMo API', desc: 'Xiaomi MiMo Multimodal AI' },
                        { id: 'byok-openai', name: 'OpenAI API', desc: 'OpenAI GPT-4o Key' },
                        { id: 'custom-gateway', name: 'Custom Gateway', desc: 'Custom REST Endpoint' },
                      ].map((provider) => (
                        <div
                          key={provider.id}
                          onClick={() => setAgentProvider(provider.id)}
                          className={`p-3 rounded-[6px] border cursor-pointer transition-all ${
                            agentProvider === provider.id
                              ? 'bg-amber-950/60 border-amber-500 text-amber-50 ring-1 ring-amber-500/40'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-amber-100">{provider.name}</span>
                            {agentProvider === provider.id && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400 line-clamp-1">{provider.desc}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <label className="block text-xs font-bold text-stone-300">
                    GenAI API Credentials
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-stone-950 border border-stone-800 rounded-[6px] font-mono text-xs text-stone-100 focus:outline-hidden focus:border-amber-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-100 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Managed securely via process.env. GEMINI_API_KEY is used for AI Copilot step generation.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-300">Default Model Alias</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest, High Accuracy)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning & Complex DOMs)</option>
                    <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (CLI Agent Integration)</option>
                    <option value="gpt-4o">GPT-4o (OpenAI Direct)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-300">Agent System Prompt</label>
                    <label className="flex items-center space-x-2 text-xs text-stone-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRepairEnabled}
                        onChange={(e) => setAutoRepairEnabled(e.target.checked)}
                        className="rounded-xs bg-stone-950 border-stone-800 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Enable Auto-Repair on Selector Failures</span>
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden focus:border-amber-600 resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'cli' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <span>CLI Terminal & Tracy Runner Configuration</span>
                  </h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Run Tracy E2E CLI commands directly or export Playwright script configs.
                  </p>
                </div>

                <div className="h-[420px] bg-stone-950 rounded-[6px] border border-stone-800 overflow-hidden">
                  <CliTerminal
                    config={activeConfig}
                    onConfigChange={onWorkspaceConfigChange || (() => {})}
                    activeFlowPath={activeFlowPath}
                  />
                </div>
              </div>
            )}

            {activeTab === 'runtime' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm">Browser Execution Engine & Sandbox</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Configure Playwright headless browser instance, viewport dimensions, timeouts, and network host gate.
                  </p>
                </div>

                <div className="p-3 bg-stone-950 border border-emerald-800/60 rounded-[6px] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Globe className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-emerald-300 block">Chromium Playwright Execution Engine</span>
                      <span className="text-[10px] text-stone-400 font-mono">Google Chrome / Chromium Core Headless Service</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-800 rounded-xs">
                    Primary Engine
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-[6px] space-y-2">
                    <label className="flex items-center justify-between text-xs font-bold text-stone-200 cursor-pointer">
                      <span>Headless Mode Execution</span>
                      <input
                        type="checkbox"
                        checked={headless}
                        onChange={(e) => setHeadless(e.target.checked)}
                        className="w-4 h-4 rounded-xs bg-stone-900 border-stone-700 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                    </label>
                    <p className="text-[10px] text-stone-500">
                      Run tests silently in background process without opening visible browser GUI windows.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-[6px] space-y-1">
                    <label className="block text-xs font-bold text-stone-200">Default Timeout (ms)</label>
                    <input
                      type="number"
                      value={timeoutMs}
                      onChange={(e) => setTimeoutMs(Number(e.target.value))}
                      className="w-full p-1.5 bg-stone-900 border border-stone-800 rounded-[6px] text-xs text-stone-100 font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-300">Sandbox Viewport Dimensions (W x H)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 bg-stone-950 border border-stone-800 rounded-[6px] p-2">
                      <span className="text-xs text-stone-500 font-mono">W:</span>
                      <input
                        type="number"
                        value={viewportWidth}
                        onChange={(e) => setViewportWidth(Number(e.target.value))}
                        className="w-full bg-transparent text-xs text-stone-100 font-mono focus:outline-hidden"
                      />
                      <span className="text-xs text-stone-500 font-mono">px</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-stone-950 border border-stone-800 rounded-[6px] p-2">
                      <span className="text-xs text-stone-500 font-mono">H:</span>
                      <input
                        type="number"
                        value={viewportHeight}
                        onChange={(e) => setViewportHeight(Number(e.target.value))}
                        className="w-full bg-transparent text-xs text-stone-100 font-mono focus:outline-hidden"
                      />
                      <span className="text-xs text-stone-500 font-mono">px</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-300">
                      Host Header Gate (HTML_ANYTHING_ALLOWED_HOSTS)
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-stone-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowAnyHost}
                        onChange={(e) => setAllowAnyHost(e.target.checked)}
                        className="rounded-xs bg-stone-950 border-stone-800 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Allow Any Host (1)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    disabled={allowAnyHost}
                    value={allowedHosts}
                    onChange={(e) => setAllowedHosts(e.target.value)}
                    placeholder="localhost, *.example.com"
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden focus:border-amber-600 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-stone-500">
                    Host validation security gate to restrict automated testing requests strictly to approved domains.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'env' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm">Environment Variables & Secrets</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Define variables accessible to YAML E2E flows via <code>${`{env.VAR_NAME}`}</code>.
                  </p>
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-[6px] flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="KEY_NAME e.g. STAGING_TOKEN"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                    className="flex-1 p-2 bg-stone-900 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Value e.g. secret123"
                    value={newEnvVal}
                    onChange={(e) => setNewEnvVal(e.target.value)}
                    className="flex-1 p-2 bg-stone-900 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden"
                  />
                  <button
                    onClick={handleAddEnvVar}
                    className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] border border-amber-600 flex items-center space-x-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {envVars.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-stone-950 border border-stone-800/80 rounded-[6px] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center space-x-3">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-stone-100">{item.key}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-stone-400 bg-stone-900 px-2.5 py-1 rounded-[6px] border border-stone-800">
                          {item.masked ? '••••••••••••' : item.value}
                        </span>
                        <button
                          onClick={() => handleToggleMask(idx)}
                          className="p-1 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded-[6px] cursor-pointer"
                          title="Toggle visibility"
                        >
                          {item.masked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRemoveEnvVar(idx)}
                          className="p-1 hover:bg-rose-950 text-stone-500 hover:text-rose-400 rounded-[6px] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'artifacts' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm">Outputs & Report Surfaces</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Configure test artifact generation, screenshots, video recording, and export formats.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-300">Test Output Directory</label>
                    <input
                      type="text"
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-300">Video Recording</label>
                    <select
                      value={videoMode}
                      onChange={(e) => setVideoMode(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                    >
                      <option value="on-failure">On Test Failure Only</option>
                      <option value="always">Always Record Full Session</option>
                      <option value="never">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-300">Screenshot Mode</label>
                    <select
                      value={screenshotMode}
                      onChange={(e) => setScreenshotMode(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                    >
                      <option value="full-page">Full Scrollable Page</option>
                      <option value="viewport">Current Viewport</option>
                      <option value="element-only">Target Element Only</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-300">Export Report Format</label>
                    <select
                      value={reportFormat}
                      onChange={(e) => setReportFormat(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                    >
                      <option value="html">Interactive HTML Report</option>
                      <option value="junit">JUnit XML Format</option>
                      <option value="json">Raw JSON Report</option>
                      <option value="markdown">Markdown Summary Document</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <span>Storage & Local Save Configuration</span>
                  </h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Configure where Tracy saves project data, DOM snapshots, flows, and generated Playwright code.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-300 flex items-center space-x-2">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Default Project Save Location</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={defaultSaveLocation}
                      onChange={(e) => setDefaultSaveLocation(e.target.value)}
                      placeholder="C:\Users\you\tracy-projects\"
                      className="flex-1 p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden focus:border-amber-600"
                    />
                    <button
                      type="button"
                      onClick={() => setDefaultSaveLocation('')}
                      className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-[6px] border border-stone-700 text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    All new projects will save to this location by default. Each project gets a unique subfolder.
                  </p>
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-[6px] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-200 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Auto-Save Project Data</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-stone-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                        className="rounded-xs bg-stone-900 border-stone-700 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Enabled</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Automatically save flows, DOM snapshots, and execution results to local disk.
                  </p>

                  {autoSaveEnabled && (
                    <div className="space-y-1 pt-2 border-t border-stone-800">
                      <label className="block text-[10px] font-bold text-stone-300">Auto-Save Interval (seconds)</label>
                      <input
                        type="number"
                        value={autoSaveInterval}
                        onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                        min={5}
                        max={300}
                        className="w-24 p-1.5 bg-stone-900 border border-stone-800 rounded-[6px] text-xs text-stone-100 font-mono focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-300">What Gets Saved Locally</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: FileSpreadsheet, label: 'Flow YAML files', desc: '.yaml test definitions' },
                      { icon: Database, label: 'DOM Snapshots', desc: 'Pre-mined page structures' },
                      { icon: Terminal, label: 'Playwright Code', desc: 'Generated test scripts' },
                      { icon: FolderOpen, label: 'Project Config', desc: 'Settings & metadata' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] flex items-start space-x-2">
                        <item.icon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-stone-200 block">{item.label}</span>
                          <span className="text-[10px] text-stone-500">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm">75+ E2E Skill Templates</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Pre-built agent skills guiding AI test generation.
                  </p>
                </div>

                <div className="space-y-3">
                  {skillTemplates.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-3.5 bg-stone-950 border border-stone-800 rounded-[6px] flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-stone-100 text-xs">{skill.name}</span>
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-300 text-[10px] font-mono rounded-[6px] border border-amber-800">
                            {skill.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400">{skill.desc}</p>
                      </div>

                      <button
                        onClick={() => alert(`Activated template: ${skill.name}`)}
                        className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs rounded-[6px] border border-stone-800 shrink-0 cursor-pointer"
                      >
                        Use Skill
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-stone-500 font-mono flex items-center space-x-1">
            {saveToast && (
              <span className="text-emerald-400 font-bold flex items-center space-x-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Settings saved successfully!</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-[6px] border border-stone-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] shadow-md border border-amber-600 transition-all active:scale-95 cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
