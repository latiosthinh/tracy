import React from 'react';
import { Bot, Key, Terminal, Cpu, Loader2, CheckCircle2, EyeOff, Eye } from 'lucide-react';
import { AgentProvider } from '@/src/components/ai/AiCopilot';
import { Input } from '@/src/components/ui/Input';

interface AiAgentSelectorProps {
  agentProvider: AgentProvider;
  setAgentProvider: (prov: AgentProvider) => void;
  providerCategoryTab: 'local-agent-cli' | 'byok';
  setProviderCategoryTab: (tab: 'local-agent-cli' | 'byok') => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  customEndpoint: string;
  setCustomEndpoint: (endpoint: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  isDetectingCli: boolean;
  handleCheckLocalCli: () => void;
  onClose: () => void;
}

export const AiAgentSelector: React.FC<AiAgentSelectorProps> = ({
  agentProvider,
  setAgentProvider,
  providerCategoryTab,
  setProviderCategoryTab,
  apiKey,
  setApiKey,
  customEndpoint,
  setCustomEndpoint,
  selectedModel: _selectedModel,
  setSelectedModel,
  showApiKey,
  setShowApiKey,
  isDetectingCli,
  handleCheckLocalCli,
  onClose,
}) => {
  const handleSelectProvider = (prov: AgentProvider) => {
    setAgentProvider(prov);
    setSelectedModel(prov);
    onClose();
  };

  return (
    <div className="absolute top-10 right-0 w-80 bg-stone-900 border border-stone-700 shadow-2xl rounded-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
      <div className="flex space-x-1 p-1 bg-stone-950 rounded-lg border border-stone-800 mb-3">
        <button
          type="button"
          onClick={() => setProviderCategoryTab('local-agent-cli')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded flex items-center justify-center space-x-1.5 transition-colors ${
            providerCategoryTab === 'local-agent-cli'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Bot className="w-4 h-4 text-emerald-300" />
          <span>Local Agent CLI</span>
        </button>
        <button
          type="button"
          onClick={() => setProviderCategoryTab('byok')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded flex items-center justify-center space-x-1.5 transition-colors ${
            providerCategoryTab === 'byok'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Key className="w-4 h-4 text-amber-300" />
          <span>BYOK (Bring Your Own Key)</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {providerCategoryTab === 'local-agent-cli' ? (
          <>
            {[
              { id: 'cursor-cli', name: 'Cursor CLI', sub: 'Cursor Subprocess' },
              { id: 'claude-code', name: 'Claude Code', sub: 'System PATH' },
              { id: 'command-code', name: 'CommandCode', sub: 'Terminal Runner' },
              { id: 'open-code', name: 'OpenCode', sub: 'Code Interpreter' },
              { id: 'gemini-cli', name: 'Gemini CLI', sub: 'Gemini Terminal' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectProvider(item.id as AgentProvider)}
                className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  agentProvider === item.id
                    ? 'bg-amber-950/60 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-300">
                  <Terminal className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">{item.name}</span>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] text-stone-400 font-mono truncate">{item.sub}</span>
                </div>
              </button>
            ))}
          </>
        ) : (
          <>
            {[
              { id: 'cursor-sdk', name: 'Cursor API', sub: 'Cursor Cloud API' },
              { id: 'byok-claude', name: 'Claude API', sub: 'Anthropic Sonnet' },
              { id: 'byok-gemini', name: 'Gemini API', sub: 'Gemini 2.5 / 3.6' },
              { id: 'byok-mimo', name: 'MiMo API', sub: 'MiMo Multimodal' },
              { id: 'byok-openai', name: 'OpenAI API', sub: 'GPT-4o / O3' },
              { id: 'custom-gateway', name: 'Custom REST', sub: 'Local REST Proxy' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectProvider(item.id as AgentProvider)}
                className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  agentProvider === item.id
                    ? 'bg-amber-950/60 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-300">
                  <Key className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-[10px] text-stone-400 font-mono mt-1 truncate">{item.sub}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {agentProvider === 'local-agent-cli' && (
        <div className="p-2 bg-stone-950 border border-stone-800 rounded-[6px] flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-bold text-stone-200 text-xs block">Local Agent CLI Active</span>
              <span className="text-[10px] font-mono text-stone-400">Listening on http://localhost:11434</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCheckLocalCli}
            disabled={isDetectingCli}
            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-[11px] rounded-[4px] border border-stone-800 flex items-center space-x-1"
          >
            {isDetectingCli ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3 text-amber-400" />}
            <span>Detect CLI</span>
          </button>
        </div>
      )}

      <div className="space-y-2 pt-1 border-t border-stone-800/80">
        {agentProvider.startsWith('byok-') && (
          <div>
            <label className="block text-[10px] font-bold text-stone-300 mb-1">
              Custom API Key ({agentProvider.toUpperCase()})
            </label>
            <div className="relative flex items-center">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="pr-8"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 text-stone-500 hover:text-stone-300"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {(agentProvider === 'local-agent-cli' || agentProvider === 'custom-gateway') && (
          <div>
            <label className="block text-[10px] font-bold text-stone-300 mb-1">
              Local Agent Endpoint URL
            </label>
            <Input
              type="url"
              value={customEndpoint}
              onChange={e => setCustomEndpoint(e.target.value)}
              placeholder="http://localhost:11434/v1"
            />
          </div>
        )}
      </div>
    </div>
  );
};
