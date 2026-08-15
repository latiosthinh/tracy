import React, { useState } from 'react';
import { Bot, Terminal, Key, CheckCircle2, Eye, EyeOff, Plug, PlugZap } from 'lucide-react';
import type { DetectedAgent as RendererDetectedAgent } from '@/src/lib/ipc';
import { agentsByCategory, getAgentDef, isValidModelId } from '@/src/lib/aiRegistry';
import { tracyApi } from '@/src/lib/ipc';
import { useAiConfigStore } from '@/src/stores/aiConfigStore';

interface AgentSelectorProps {
  detectedAgents: RendererDetectedAgent[];
  size?: 'sm' | 'md';
}

type AgentTab = 'local-cli' | 'cloud-api';

/** Extended type for merged CLI defs (registry + detection extras). */
interface MergedCliDef extends Omit<RendererDetectedAgent, 'id'> {
  id: string;
  def?: import('@/src/lib/aiRegistry').AgentDef;
  version?: string;
  path?: string;
  installed: boolean;
}

/** Merged local CLI defs (from registry + detection results). */
function mergedCliDefs(
  detected: RendererDetectedAgent[],
): MergedCliDef[] {
  const cliDefs = agentsByCategory('local-cli');
  return cliDefs.map((def) => {
    const found = detected.find((d) => d.id === def.id);
    return {
      id: def.id,
      name: def.displayName,
      cli_binary: def.cliBinary || '',
      icon_name: def.iconName,
      category: 'local-cli',
      description: def.description,
      installed: !!found && !!found.path,
      path: found?.path,
      version: (found as MergedCliDef & { version?: string })?.version,
      def,
    };
  });
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ detectedAgents, size = 'md' }) => {
  const [agentTab, setAgentTab] = useState<AgentTab>('local-cli');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; loading: boolean; error?: string }>({ ok: false, loading: false });
  const [endpointOverride, setEndpointOverride] = useState('');

  // aiConfigStore hooks — all reads/writes go through here
  const selectedAgentId = useAiConfigStore((s) => s.selectedAgentId);
  const selectAgent = useAiConfigStore((s) => s.selectAgent);
  const agentCredentials = useAiConfigStore((s) => s.agentCredentials);
  const agentModels = useAiConfigStore((s) => s.agentModels);
  const setCredential = useAiConfigStore((s) => s.setCredential);
  const setModel = useAiConfigStore((s) => s.setModel);

  const isSm = size === 'sm';

  // Merge local CLI definitions with detection results
  const cliMerged = mergedCliDefs(detectedAgents);
  const cloudDefs = agentsByCategory('cloud-api');

  // Current active def (from registry)
  const activeDef = selectedAgentId ? getAgentDef(selectedAgentId) : null;

  // Current credentials from store
  const currentCred = selectedAgentId ? agentCredentials[selectedAgentId] || {} : {};
  const currentModel = selectedAgentId ? agentModels[selectedAgentId] || '' : '';

  const handleSelectAgent = (id: string) => {
    selectAgent(id);
    setShowApiKey(false);
    setEndpointOverride('');
    setTestResult({ ok: false, loading: false });
  };

  const handleTestConnection = async () => {
    if (!selectedAgentId || !currentCred.apiKey) return;
    setTestResult({ ok: false, loading: true });
    try {
      const result = await tracyApi.testAiConnection({
        agentId: selectedAgentId,
        apiKey: currentCred.apiKey,
        customEndpoint: endpointOverride || currentCred.customEndpoint,
        model: currentModel,
      });
      setTestResult({ ok: result.ok, loading: false, error: result.errorMessage });
    } catch {
      setTestResult({ ok: false, loading: false, error: 'Connection test failed' });
    }
  };

  const canTestConnection = !!currentCred.apiKey && activeDef && activeDef.protocol !== 'google';

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className={`grid grid-cols-2 gap-2 bg-stone-950 rounded-[6px] border border-stone-800 ${isSm ? 'p-1' : 'p-1.5'}`}>
        <button
          type="button"
          onClick={() => setAgentTab('local-cli')}
          className={`font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            isSm ? 'py-2 px-3 text-xs rounded-[4px]' : 'py-3 px-4 text-sm rounded-md'
          } ${
            agentTab === 'local-cli'
              ? 'bg-amber-800 text-amber-100 shadow-md border border-amber-600/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Terminal className={`${isSm ? 'w-4 h-4' : 'w-4 h-4'} text-emerald-400`} />
          <span>Local CLI Agents</span>
        </button>

        <button
          type="button"
          onClick={() => setAgentTab('cloud-api')}
          className={`font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            isSm ? 'py-2 px-3 text-xs rounded-[4px]' : 'py-3 px-4 text-sm rounded-md'
          } ${
            agentTab === 'cloud-api'
              ? 'bg-amber-800 text-amber-100 shadow-md border border-amber-600/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Key className={`${isSm ? 'w-4 h-4' : 'w-4 h-4'} text-amber-300`} />
          <span>Cloud API (BYOK)</span>
        </button>
      </div>

      {/* Agent grid */}
      <div className={`grid ${isSm ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        {agentTab === 'local-cli' ? (
          <>
            {cliMerged.length === 0 ? (
              <div className={`col-span-full text-center bg-stone-950/50 rounded-lg border border-stone-800/50 border-dashed ${isSm ? 'p-4' : 'p-8'}`}>
                <Bot className={`${isSm ? 'w-6 h-6' : 'w-8 h-8'} text-stone-600 mx-auto mb-3`} />
                <p className={`text-stone-400 ${isSm ? 'text-xs' : 'text-sm'}`}>No local CLI agents detected.</p>
              </div>
            ) : (
              cliMerged.map((def) => (
                <div
                  key={def.id}
                  onClick={() => def.installed && handleSelectAgent(def.id)}
                  className={`rounded-[6px] border transition-all ${isSm ? 'p-3' : 'p-4'} ${
                    !def.installed
                      ? 'bg-stone-950/50 border-stone-800/50 text-stone-600 opacity-50 cursor-not-allowed'
                      : selectedAgentId === def.id
                        ? 'bg-amber-950/60 border-amber-500 text-amber-50 ring-1 ring-amber-500/40 shadow-lg cursor-pointer transform scale-[1.02]'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-600 hover:bg-stone-900 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold flex items-center gap-2 ${isSm ? 'text-xs' : 'text-sm'}`}>
                      {def.name}
                      {!def.installed && (
                        <span className={`bg-stone-800 text-stone-400 rounded font-normal ${isSm ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}>
                          Not Installed
                        </span>
                      )}
                    </span>
                    {selectedAgentId === def.id && (
                      <CheckCircle2 className={`${isSm ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-amber-400`} />
                    )}
                  </div>
                  <p className={`${isSm ? 'text-[10px]' : 'text-xs'} font-mono text-stone-500 line-clamp-1`}>{def.cli_binary}</p>
                  {def.version && (
                    <p className={`${isSm ? 'text-[9px]' : 'text-[10px]'} font-mono text-emerald-500 line-clamp-1`}>v{def.version}</p>
                  )}
                </div>
              ))
            )}
          </>
        ) : (
          cloudDefs.map((def) => (
            <div
              key={def.id}
              onClick={() => handleSelectAgent(def.id)}
              className={`rounded-[6px] border transition-all cursor-pointer ${isSm ? 'p-3' : 'p-4'} ${
                selectedAgentId === def.id
                  ? 'bg-amber-950/60 border-amber-500 text-amber-50 ring-1 ring-amber-500/40 shadow-lg transform scale-[1.02]'
                  : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-600 hover:bg-stone-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold ${isSm ? 'text-xs' : 'text-sm'} text-amber-100`}>{def.displayName}</span>
                {selectedAgentId === def.id && (
                  <CheckCircle2 className={`${isSm ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-amber-400`} />
                )}
              </div>
              <p className={`${isSm ? 'text-[10px]' : 'text-xs'} text-stone-400`}>{def.description}</p>
            </div>
          ))
        )}
      </div>

      {/* Dynamic fields for selected agent */}
      {activeDef && selectedAgentId && (
        <div className="space-y-3 pt-2 border-t border-stone-800 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* API Key input */}
          {activeDef.needsApiKey && (
            <div className="space-y-2">
              <label className={`block font-bold text-stone-300 ${isSm ? 'text-xs' : 'text-sm'}`}>
                API Key ({activeDef.displayName})
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={currentCred.apiKey || ''}
                  onChange={(e) => {
                    setCredential(selectedAgentId, { apiKey: e.target.value });
                  }}
                  placeholder="sk-..."
                  className={`w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] font-mono focus:outline-hidden focus:border-amber-600 ${
                    isSm ? 'p-2.5 pr-10 text-xs' : 'px-4 py-3 pr-12 text-sm shadow-inner'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className={`absolute text-stone-400 hover:text-stone-100 cursor-pointer ${
                    isSm ? 'right-3 top-2.5' : 'right-4 top-3.5'
                  }`}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className={`${isSm ? 'text-[10px]' : 'text-xs'} text-stone-500`}>
                Keys are stored encrypted on this device (desktop) / kept in this browser session only (web).
              </p>
              {/* Test connection button (HTTP-only, needs API key) */}
              {canTestConnection && (
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={!currentCred.apiKey || testResult.loading}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] border font-bold text-xs transition-all cursor-pointer ${
                    testResult.loading
                      ? 'bg-stone-800 text-stone-400 border-stone-700'
                      : testResult.ok === true
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : testResult.error
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : 'bg-stone-900 text-amber-300 border-stone-700 hover:bg-stone-800'
                  }`}
                >
                  {testResult.loading ? (
                    <PlugZap className="w-3.5 h-3.5 animate-spin" />
                  ) : testResult.ok === true ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : testResult.error ? (
                    <Plug className="w-3.5 h-3.5" />
                  ) : (
                    <Plug className="w-3.5 h-3.5" />
                  )}
                  <span>{testResult.loading ? 'Testing…' : testResult.ok === true ? 'Connected!' : testResult.error ?? 'Test Connection'}</span>
                </button>
              )}
            </div>
          )}

          {/* Endpoint input */}
          {activeDef.needsEndpoint && (
            <div className="space-y-2">
              <label className={`block font-bold text-stone-300 ${isSm ? 'text-xs' : 'text-sm'}`}>
                Custom Endpoint
              </label>
              <input
                type="text"
                value={endpointOverride !== '' ? endpointOverride : (currentCred.customEndpoint || activeDef.defaultEndpoint || '')}
                onChange={(e) => setEndpointOverride(e.target.value)}
                onBlur={() => setCredential(selectedAgentId, { customEndpoint: endpointOverride })}
                placeholder={activeDef.defaultEndpoint || 'http://localhost:11434'}
                className={`w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] font-mono focus:outline-hidden focus:border-amber-600 ${
                  isSm ? 'p-2.5 text-xs' : 'px-4 py-3 text-sm'
                }`}
              />
              <p className={`${isSm ? 'text-[10px]' : 'text-xs'} text-stone-500`}>
                OpenAI-compatible gateway URL (e.g., Ollama, LM Studio).
              </p>
            </div>
          )}

          {/* Model selector */}
          {activeDef.models.length > 0 && (
            <div className="space-y-2">
              <label className={`block font-bold text-stone-300 ${isSm ? 'text-xs' : 'text-sm'}`}>
                Model
              </label>
              <select
                value={currentModel || activeDef.defaultModel}
                onChange={(e) => setModel(selectedAgentId, e.target.value)}
                className={`w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] focus:outline-hidden cursor-pointer ${
                  isSm ? 'p-2.5 text-xs' : 'px-4 py-3 text-sm'
                }`}
              >
                {activeDef.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {activeDef.allowsCustomModel && (
            <div className="space-y-2">
              <label className={`block font-bold text-stone-300 ${isSm ? 'text-xs' : 'text-sm'}`}>
                Model Name
              </label>
              <input
                type="text"
                value={currentModel || activeDef.defaultModel}
                onChange={(e) => setModel(selectedAgentId, e.target.value)}
                placeholder={activeDef.defaultModel}
                className={`w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] font-mono focus:outline-hidden focus:border-amber-600 ${
                  isSm ? 'p-2.5 text-xs' : 'px-4 py-3 text-sm'
                }`}
              />
              {(currentModel || activeDef.defaultModel).length > 0 && !isValidModelId(currentModel || activeDef.defaultModel) && (
                <p className="text-rose-400 text-[10px]">Invalid model name format</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
