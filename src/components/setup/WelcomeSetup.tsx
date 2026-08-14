import React, { useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useAgentStore } from '@/src/stores/agentStore';
import { AgentSelector } from '@/src/components/shared/AgentSelector';

export const WelcomeSetup: React.FC = () => {
  const detectedAgents = useAgentStore((s) => s.detectedAgents);
  const setSelectedAgentId = useAgentStore((s) => s.setSelectedAgentId);

  const [settingsAgentTab, setSettingsAgentTab] = useState<'local-agent-cli' | 'byok'>('local-agent-cli');
  const [agentProvider, setAgentProvider] = useState<string>('');
  
  // Dummy states for BYOK, ideally these sync with a secure store in a real app
  const [geminiApiKey, setGeminiApiKey] = useState('');
  
  const handleContinue = () => {
    if (agentProvider) {
      setSelectedAgentId(agentProvider);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 font-sans text-stone-100 p-6 h-full w-full overflow-y-auto">
      <div className="w-full max-w-3xl flex flex-col space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl shadow-amber-900/20 mb-2 border border-amber-400/30">
            <Sparkles className="w-8 h-8 text-amber-50" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-amber-100 tracking-tight">
            Welcome to Tracy Studio
          </h1>
          <p className="text-stone-400 max-w-lg mx-auto">
            Before we begin, you need to configure your AI execution engine. Tracy can orchestrate local CLI agents or use cloud GenAI APIs directly.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6">
          <AgentSelector
            detectedAgents={detectedAgents}
            agentTab={settingsAgentTab}
            setAgentTab={setSettingsAgentTab}
            agentProvider={agentProvider}
            setAgentProvider={setAgentProvider}
            apiKey={geminiApiKey}
            setApiKey={setGeminiApiKey}
            size="md"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleContinue}
            disabled={!agentProvider}
            className={`px-8 py-3.5 rounded-lg font-bold text-sm flex items-center space-x-2 transition-all shadow-xl ${
              agentProvider
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-amber-900/40'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-50'
            }`}
          >
            <span>Continue to Studio</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
