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
import type { WorkspaceConfig } from '@/src/types/index';
import { DEFAULT_WORKSPACE_CONFIG } from '@/src/data/defaultFlows';
import type { UiSettings } from '@/src/types/uiSettings';
import { DEFAULT_UI_SETTINGS } from '@/src/types/uiSettings';
import { CliTerminal } from '@/src/components/reports/CliTerminal';
import { UiSettingsPanel } from '@/src/components/settings/UiSettingsPanel';
import { useAgentStore } from '@/src/stores/agentStore';
import { AgentSelector } from '@/src/components/shared/AgentSelector';
import { useUiStore } from '@/src/stores/uiStore';
import { useTranslation } from '@/src/hooks/useTranslation';

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
  const { t } = useTranslation();
  const activeConfig = configProp || workspaceConfigProp || DEFAULT_WORKSPACE_CONFIG;
  const [activeTab, setActiveTab] = useState<'agents' | 'runtime' | 'env' | 'artifacts' | 'storage' | 'skills' | 'cli' | 'ui'>('agents');
  const [uiSettingsState, setUiSettingsState] = useState<UiSettings>(uiSettings);

  const detectedAgents = useAgentStore((s) => s.detectedAgents);
  const [systemPrompt, setSystemPrompt] = useState(
    t('settings.defaultSystemPrompt')
  );
  const [autoRepairEnabled, setAutoRepairEnabled] = useState(true);

  // Runtime & Browser State
  const [browserEngine] = useState<'chromium'>('chromium');
  const [headless, setHeadless] = useState<boolean>(activeConfig?.headless ?? false);
  const [viewportWidth, setViewportWidth] = useState<number>(activeConfig?.viewport?.width || 1280);
  const [viewportHeight, setViewportHeight] = useState<number>(activeConfig?.viewport?.height || 800);
  const [timeoutMs, setTimeoutMs] = useState<number>(activeConfig?.timeout || 10000);
  const [retries, _setRetries] = useState<number>(activeConfig?.retries ?? 2);
  const [allowedHosts, setAllowedHosts] = useState('localhost, *.example.com');
  const [allowAnyHost, setAllowAnyHost] = useState(true);

  // Environment Variables State
  const [envVars, setEnvVars] = useState<{ key: string; value: string; masked: boolean }[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  // Artifacts State
  const [outputDir, setOutputDir] = useState(activeConfig?.testOutputDir || 'test-results');
  const [videoMode, setVideoMode] = useState<'on-failure' | 'always' | 'never'>('on-failure');
  const [screenshotMode, setScreenshotMode] = useState<'full-page' | 'viewport' | 'element-only'>('full-page');
  const [reportFormat, setReportFormat] = useState<'html' | 'json' | 'junit' | 'markdown'>('html');

  // Storage State
  const defaultSaveLocation = useUiStore((s) => s.defaultSaveLocation);
  const setDefaultSaveLocation = useUiStore((s) => s.setDefaultSaveLocation);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);

  // Skill Templates
  const skillTemplates = [
    { id: 'skill-1', name: t('settings.skills.ecommerce.name'), category: t('settings.skills.ecommerce.category'), desc: t('settings.skills.ecommerce.desc') },
    { id: 'skill-2', name: t('settings.skills.auth.name'), category: t('settings.skills.auth.category'), desc: t('settings.skills.auth.desc') },
    { id: 'skill-3', name: t('settings.skills.network.name'), category: t('settings.skills.network.category'), desc: t('settings.skills.network.desc') },
    { id: 'skill-4', name: t('settings.skills.responsive.name'), category: t('settings.skills.responsive.category'), desc: t('settings.skills.responsive.desc') },
    { id: 'skill-5', name: t('settings.skills.a11y.name'), category: t('settings.skills.a11y.category'), desc: t('settings.skills.a11y.desc') },
  ];

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans text-stone-100"
    >
      <div className="bg-stone-900 border border-stone-800 rounded-[6px] w-full max-w-4xl h-[85vh] max-h-[750px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-950/80 text-amber-400 rounded-[6px] border border-amber-700/50">
              <Sliders className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="font-serif font-bold text-amber-100 text-lg tracking-tight">
                {t('settings.modalTitle')}
              </h2>
              <p className="text-stone-400 text-xs font-mono">
                {t('settings.modalSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('settings.close')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-[6px] hover:bg-stone-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Tabs */}
          <div role="tablist" aria-orientation="vertical" className="w-56 bg-stone-950/60 border-r border-stone-800 p-3 space-y-1 shrink-0 overflow-y-auto">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'agents'}
              onClick={() => setActiveTab('agents')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'agents'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Bot className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{t('settings.tabAgents')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cli'}
              onClick={() => setActiveTab('cli')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'cli'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Terminal className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{t('settings.tabCli')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'runtime'}
              onClick={() => setActiveTab('runtime')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'runtime'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{t('settings.tabRuntime')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'env'}
              onClick={() => setActiveTab('env')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'env'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Key className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{t('settings.tabEnv')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'artifacts'}
              onClick={() => setActiveTab('artifacts')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'artifacts'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{t('settings.tabArtifacts')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'storage'}
              onClick={() => setActiveTab('storage')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'storage'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <HardDrive className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{t('settings.tabStorage')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ui'}
              onClick={() => setActiveTab('ui')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'ui'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Palette className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{t('settings.tabUi')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'skills'}
              onClick={() => setActiveTab('skills')}
              className={`w-full px-3 py-2.5 rounded-[6px] text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === 'skills'
                  ? 'bg-amber-800 text-amber-50 shadow-md border border-amber-600/60'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{t('settings.tabSkills')}</span>
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
                  <h3 className="font-bold text-amber-100 text-sm">{t('settings.agentsTitle')}</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {t('settings.agentsDesc')}
                  </p>
                </div>

                {/* Unified Agent Selector — reads/writes aiConfigStore */}
                <AgentSelector detectedAgents={detectedAgents} size="md" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="agent-system-prompt" className="text-xs font-bold text-stone-300">{t('settings.systemPrompt')}</label>
                    <label htmlFor="enable-auto-repair" className="flex items-center space-x-2 text-xs text-stone-400 cursor-pointer">
                      <input
                        id="enable-auto-repair"
                        type="checkbox"
                        checked={autoRepairEnabled}
                        onChange={(e) => setAutoRepairEnabled(e.target.checked)}
                        className="rounded-xs bg-stone-950 border-stone-800 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                      <span>{t('settings.autoRepair')}</span>
                    </label>
                  </div>
                  <textarea
                    id="agent-system-prompt"
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
                    <Terminal className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <span>{t('settings.cliTitle')}</span>
                  </h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {t('settings.cliDesc')}
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
                  <h3 className="font-bold text-amber-100 text-sm">{t('settings.runtimeTitle')}</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {t('settings.runtimeDesc')}
                  </p>
                </div>

                <div className="p-3 bg-stone-950 border border-emerald-800/60 rounded-[6px] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Globe className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <div>
                      <span className="font-bold text-xs text-emerald-300 block">{t('settings.chromiumEngine')}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{t('settings.chromiumEngineDesc')}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-800 rounded-xs">
                    {t('settings.primaryEngine')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-[6px] space-y-2">
                    <label htmlFor="headless-mode-toggle" className="flex items-center justify-between text-xs font-bold text-stone-200 cursor-pointer">
                      <span>{t('settings.headlessMode')}</span>
                      <input
                        id="headless-mode-toggle"
                        type="checkbox"
                        checked={headless}
                        onChange={(e) => setHeadless(e.target.checked)}
                        className="w-4 h-4 rounded-xs bg-stone-900 border-stone-700 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                    </label>
                    <p className="text-[10px] text-stone-500">
                      {t('settings.headlessDesc')}
                    </p>
                  </div>

                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-[6px] space-y-1">
                    <label htmlFor="default-timeout-input" className="block text-xs font-bold text-stone-200">{t('settings.defaultTimeout')}</label>
                    <input
                      id="default-timeout-input"
                      type="number"
                      value={timeoutMs}
                      onChange={(e) => setTimeoutMs(Number(e.target.value))}
                      className="w-full p-1.5 bg-stone-900 border border-stone-800 rounded-[6px] text-xs text-stone-100 font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-300">{t('settings.sandboxViewport')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 bg-stone-950 border border-stone-800 rounded-[6px] p-2">
                      <label htmlFor="viewport-width-input" className="text-xs text-stone-500 font-mono">{t('settings.width')}</label>
                      <input
                        id="viewport-width-input"
                        type="number"
                        value={viewportWidth}
                        onChange={(e) => setViewportWidth(Number(e.target.value))}
                        className="w-full bg-transparent text-xs text-stone-100 font-mono focus:outline-hidden"
                      />
                      <span className="text-xs text-stone-500 font-mono">{t('settings.px')}</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-stone-950 border border-stone-800 rounded-[6px] p-2">
                      <label htmlFor="viewport-height-input" className="text-xs text-stone-500 font-mono">{t('settings.height')}</label>
                      <input
                        id="viewport-height-input"
                        type="number"
                        value={viewportHeight}
                        onChange={(e) => setViewportHeight(Number(e.target.value))}
                        className="w-full bg-transparent text-xs text-stone-100 font-mono focus:outline-hidden"
                      />
                      <span className="text-xs text-stone-500 font-mono">{t('settings.px')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <label htmlFor="allowed-hosts-input" className="text-xs font-bold text-stone-300">
                      {t('settings.hostHeaderGate')}
                    </label>
                    <label htmlFor="allow-any-host-checkbox" className="flex items-center space-x-2 text-xs text-stone-400 cursor-pointer">
                      <input
                        id="allow-any-host-checkbox"
                        type="checkbox"
                        checked={allowAnyHost}
                        onChange={(e) => setAllowAnyHost(e.target.checked)}
                        className="rounded-xs bg-stone-950 border-stone-800 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                      <span>{t('settings.allowAnyHost')}</span>
                    </label>
                  </div>
                  <input
                    id="allowed-hosts-input"
                    type="text"
                    disabled={allowAnyHost}
                    value={allowedHosts}
                    onChange={(e) => setAllowedHosts(e.target.value)}
                    placeholder={t('settings.hostHeaderPlaceholder')}
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden focus:border-amber-600 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-stone-500">
                    {t('settings.hostHeaderDesc')}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'env' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm">{t('settings.envTitle')}</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {t('settings.envDesc')}
                  </p>
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-[6px] flex items-center gap-2">
                  <input
                    type="text"
                    aria-label="Environment variable key"
                    placeholder={t('settings.envKeyPlaceholder')}
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                    className="flex-1 p-2 bg-stone-900 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden"
                  />
                  <input
                    type="text"
                    aria-label="Environment variable value"
                    placeholder={t('settings.envValPlaceholder')}
                    value={newEnvVal}
                    onChange={(e) => setNewEnvVal(e.target.value)}
                    className="flex-1 p-2 bg-stone-900 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddEnvVar}
                    className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] border border-amber-600 flex items-center space-x-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('settings.addEnv')}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {envVars.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-stone-950 border border-stone-800/80 rounded-[6px] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center space-x-3">
                        <Key className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <span className="font-bold text-stone-100">{item.key}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-stone-400 bg-stone-900 px-2.5 py-1 rounded-[6px] border border-stone-800">
                          {item.masked ? '••••••••••••' : item.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleMask(idx)}
                          className="p-1 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded-[6px] cursor-pointer"
                          aria-label={t('settings.toggleMask')}
                          title={t('settings.toggleMask')}
                        >
                          {item.masked ? <Eye className="w-3.5 h-3.5" aria-hidden="true" /> : <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveEnvVar(idx)}
                          aria-label={t('settings.removeEnv')}
                          className="p-1 hover:bg-rose-950 text-stone-500 hover:text-rose-400 rounded-[6px] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
                  <h3 className="font-bold text-amber-100 text-sm">{t('settings.artifactsTitle')}</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {t('settings.artifactsDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="test-output-dir-input" className="block text-xs font-bold text-stone-300">{t('settings.outputDir')}</label>
                    <input
                      id="test-output-dir-input"
                      type="text"
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="video-recording-mode-select" className="block text-xs font-bold text-stone-300">{t('settings.videoRecording')}</label>
                    <select
                      id="video-recording-mode-select"
                      value={videoMode}
                      onChange={(e) => setVideoMode(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                    >
                      <option value="on-failure">{t('settings.videoOnFailure')}</option>
                      <option value="always">{t('settings.videoAlways')}</option>
                      <option value="never">{t('settings.videoNever')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="screenshot-mode-select" className="block text-xs font-bold text-stone-300">{t('settings.screenshotMode')}</label>
                    <select
                      id="screenshot-mode-select"
                      value={screenshotMode}
                      onChange={(e) => setScreenshotMode(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                    >
                      <option value="full-page">{t('settings.screenshotFull')}</option>
                      <option value="viewport">{t('settings.screenshotViewport')}</option>
                      <option value="element-only">{t('settings.screenshotElement')}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="report-format-select" className="block text-xs font-bold text-stone-300">{t('settings.reportFormat')}</label>
                    <select
                      id="report-format-select"
                      value={reportFormat}
                      onChange={(e) => setReportFormat(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-stone-100 focus:outline-hidden cursor-pointer"
                    >
                      <option value="html">{t('settings.reportHtml')}</option>
                      <option value="junit">{t('settings.reportJunit')}</option>
                      <option value="json">{t('settings.reportJson')}</option>
                      <option value="markdown">{t('settings.reportMarkdown')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-amber-100 text-sm flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <span>{t('settings.storageTitle')}</span>
                  </h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {t('settings.storageDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="default-save-location-input" className="block text-xs font-bold text-stone-300 flex items-center space-x-2">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>{t('settings.defaultSaveLocation')}</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="default-save-location-input"
                      type="text"
                      value={defaultSaveLocation}
                      onChange={(e) => setDefaultSaveLocation(e.target.value)}
                      placeholder={t('settings.saveLocationPlaceholder')}
                      className="flex-1 p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs font-mono text-stone-100 focus:outline-hidden focus:border-amber-600"
                    />
                    <button
                      type="button"
                      onClick={() => setDefaultSaveLocation('')}
                      className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-[6px] border border-stone-700 text-xs cursor-pointer"
                    >
                      {t('settings.clear')}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    {t('settings.saveLocationDesc')}
                  </p>
                </div>

                <div className="p-3 bg-stone-950 border border-stone-800 rounded-[6px] space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auto-save-enabled-checkbox" className="text-xs font-bold text-stone-200 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>{t('settings.autoSave')}</span>
                    </label>
                    <label htmlFor="auto-save-enabled-checkbox" className="flex items-center space-x-2 text-xs text-stone-400 cursor-pointer">
                      <input
                        id="auto-save-enabled-checkbox"
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                        className="rounded-xs bg-stone-900 border-stone-700 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                      <span>{t('settings.enabled')}</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    {t('settings.autoSaveDesc')}
                  </p>

                  {autoSaveEnabled && (
                    <div className="space-y-1 pt-2 border-t border-stone-800">
                      <label htmlFor="auto-save-interval-input" className="block text-[10px] font-bold text-stone-300">{t('settings.autoSaveInterval')}</label>
                      <input
                        id="auto-save-interval-input"
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
                  <h4 className="text-xs font-bold text-stone-300">{t('settings.whatGetsSaved')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: FileSpreadsheet, label: t('settings.flowYamlFiles'), desc: t('settings.flowYamlDesc') },
                      { icon: Database, label: t('settings.domSnapshots'), desc: t('settings.domSnapshotsDesc') },
                      { icon: Terminal, label: t('settings.playwrightCode'), desc: t('settings.playwrightCodeDesc') },
                      { icon: FolderOpen, label: t('settings.projectConfig'), desc: t('settings.projectConfigDesc') },
                    ].map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] flex items-start space-x-2">
                        <item.icon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
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
                  <h3 className="font-bold text-amber-100 text-sm">{t('settings.skillsTitle')}</h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {t('settings.skillsDesc')}
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
                        type="button"
                        onClick={() => alert(t('settings.activatedSkill', { name: skill.name }))}
                        className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs rounded-[6px] border border-stone-800 shrink-0 cursor-pointer"
                      >
                        {t('settings.useSkill')}
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
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('settings.savedSuccess')}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-[6px] border border-stone-700 transition-all cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] shadow-md border border-amber-600 transition-all active:scale-95 cursor-pointer"
            >
              {t('settings.saveSettings')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
