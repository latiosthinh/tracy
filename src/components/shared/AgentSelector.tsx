import React, { useState } from 'react';
import { Bot, Terminal, Key, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface AgentProvider {
  id: string;
  name: string;
  desc?: string;
  cli_binary?: string;
  installed?: boolean;
}

export type AgentTab = 'local-agent-cli' | 'byok';

interface AgentSelectorProps {
  detectedAgents: AgentProvider[];
  agentTab: AgentTab;
  setAgentTab: (tab: AgentTab) => void;
  agentProvider: string;
  setAgentProvider: (provider: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  size?: 'sm' | 'md';
}

const BYOK_PROVIDERS: AgentProvider[] = [
  { id: 'cursor-sdk', name: 'Cursor SDK / API', desc: 'Cursor Cloud API Key' },
  { id: 'byok-claude', name: 'Claude API', desc: 'Anthropic Claude 3.7 Sonnet' },
  { id: 'byok-gemini', name: 'Gemini API', desc: 'Google GenAI SDK' },
  { id: 'byok-mimo', name: 'Xiaomi MiMo API', desc: 'Xiaomi MiMo Multimodal AI' },
  { id: 'byok-openai', name: 'OpenAI API', desc: 'OpenAI GPT-4o Key' },
  { id: 'custom-gateway', name: 'Custom Gateway', desc: 'Custom REST Endpoint' },
];

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  detectedAgents,
  agentTab,
  setAgentTab,
  agentProvider,
  setAgentProvider,
  apiKey,
  setApiKey,
  size = 'md',
}) => {
  const [showApiKey, setShowApiKey] = useState(false);

  const handleTabChange = (tab: AgentTab) => {
    setAgentTab(tab);
    if (tab === 'local-agent-cli') {
      if (!['cursor-cli', 'claude-code', 'command-code', 'open-code', 'gemini-cli', 'local-agent-cli'].includes(agentProvider)) {
        setAgentProvider('local-agent-cli');
      }
    } else {
      if (!BYOK_PROVIDERS.map(p => p.id).includes(agentProvider)) {
        setAgentProvider('byok-gemini');
      }
    }
  };

  const isSm = size === 'sm';

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 gap-2 bg-stone-950 rounded-[6px] border border-stone-800 ${isSm ? 'p-1' : 'p-1.5'}`}>
        <button
          type="button"
          onClick={() => handleTabChange('local-agent-cli')}
          className={`font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            isSm ? 'py-2 px-3 text-xs rounded-[4px]' : 'py-3 px-4 text-sm rounded-md'
          } ${
            agentTab === 'local-agent-cli'
              ? 'bg-amber-800 text-amber-100 shadow-md border border-amber-600/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Terminal className={`${isSm ? 'w-4 h-4' : 'w-4 h-4'} text-emerald-400`} />
          <span>Local CLI Agents</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('byok')}
          className={`font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            isSm ? 'py-2 px-3 text-xs rounded-[4px]' : 'py-3 px-4 text-sm rounded-md'
          } ${
            agentTab === 'byok'
              ? 'bg-amber-800 text-amber-100 shadow-md border border-amber-600/80'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Key className={`${isSm ? 'w-4 h-4' : 'w-4 h-4'} text-amber-300`} />
          <span>Cloud API (BYOK)</span>
        </button>
      </div>

      <div className={`grid ${isSm ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        {agentTab === 'local-agent-cli' ? (
          <>
            {detectedAgents.length === 0 ? (
              <div className={`col-span-full text-center bg-stone-950/50 rounded-lg border border-stone-800/50 border-dashed ${isSm ? 'p-4' : 'p-8'}`}>
                <Bot className={`${isSm ? 'w-6 h-6' : 'w-8 h-8'} text-stone-600 mx-auto mb-3`} />
                <p className={`text-stone-400 ${isSm ? 'text-xs' : 'text-sm'}`}>Scanning your system for compatible AI CLI tools...</p>
              </div>
            ) : (
              detectedAgents.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => provider.installed && setAgentProvider(provider.id)}
                  className={`rounded-[6px] border transition-all ${isSm ? 'p-3' : 'p-4'} ${
                    !provider.installed
                      ? 'bg-stone-950/50 border-stone-800/50 text-stone-600 opacity-50 cursor-not-allowed'
                      : agentProvider === provider.id
                      ? 'bg-amber-950/60 border-amber-500 text-amber-50 ring-1 ring-amber-500/40 shadow-lg cursor-pointer transform scale-[1.02]'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-600 hover:bg-stone-900 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold flex items-center gap-2 ${isSm ? 'text-xs' : 'text-sm'}`}>
                      {provider.name}
                      {!provider.installed && (
                        <span className={`bg-stone-800 text-stone-400 rounded font-normal ${isSm ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}>
                          Not Installed
                        </span>
                      )}
                    </span>
                    {agentProvider === provider.id && (
                      <CheckCircle2 className={`${isSm ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-amber-400`} />
                    )}
                  </div>
                  <p className={`${isSm ? 'text-[10px]' : 'text-xs'} font-mono text-stone-500 line-clamp-1`}>{provider.cli_binary}</p>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            {BYOK_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                onClick={() => setAgentProvider(provider.id)}
                className={`rounded-[6px] border transition-all cursor-pointer ${isSm ? 'p-3' : 'p-4'} ${
                  agentProvider === provider.id
                    ? 'bg-amber-950/60 border-amber-500 text-amber-50 ring-1 ring-amber-500/40 shadow-lg transform scale-[1.02]'
                    : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-600 hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold ${isSm ? 'text-xs' : 'text-sm'} text-amber-100`}>{provider.name}</span>
                  {agentProvider === provider.id && (
                    <CheckCircle2 className={`${isSm ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-amber-400`} />
                  )}
                </div>
                <p className={`${isSm ? 'text-[10px]' : 'text-xs'} text-stone-400`}>{provider.desc}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {agentTab === 'byok' && agentProvider && (
        <div className={`space-y-2 pt-2 border-t border-stone-800 animate-in fade-in slide-in-from-top-4 duration-300`}>
          <label className={`block font-bold text-stone-300 ${isSm ? 'text-xs' : 'text-sm'}`}>
            Enter API Key for {agentProvider}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
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
            Managed securely via process.env. GEMINI_API_KEY is used for AI Copilot step generation.
          </p>
        </div>
      )}
    </div>
  );
};
