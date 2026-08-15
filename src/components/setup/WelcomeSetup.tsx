import React from 'react';
import { ChevronRight, Sparkles, Cloud, Download } from 'lucide-react';
import { useAgentStore } from '@/src/stores/agentStore';
import { useAiConfigStore } from '@/src/stores/aiConfigStore';
import { AgentSelector } from '@/src/components/shared/AgentSelector';
import { useEnvironment } from '@/src/hooks/useEnvironment';

export const WelcomeSetup: React.FC = () => {
  const detectedAgents = useAgentStore((s) => s.detectedAgents);
  const selectedAgentId = useAiConfigStore((s) => s.selectedAgentId);
  const selectAgent = useAiConfigStore((s) => s.selectAgent);

  const { isWeb } = useEnvironment();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 font-sans text-stone-100 p-6 h-full w-full overflow-y-auto">
      <div className="w-full max-w-3xl flex flex-col space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl shadow-amber-900/20 mb-2 border border-amber-400/30">
            <Sparkles className="w-8 h-8 text-amber-5" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-amber-100 tracking-tight">
            Welcome to Tracy Studio
          </h1>
          {isWeb ? (
            <div className="space-y-3">
              <p className="text-stone-400 max-w-lg mx-auto">
                You're running Tracy in your browser. Configure your AI provider below to generate test flows instantly.
              </p>
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-950/50 border border-sky-800/40 rounded-md max-w-lg mx-auto text-xs text-sky-300">
                <Cloud className="w-4 h-4 shrink-0" />
                <span>Browser mode — Playwright automation and DOM mining require the desktop app. Download it for full capabilities.</span>
              </div>
              <a
                href="/tracy-setup.exe"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-sm rounded-[6px] transition-all shadow-lg border border-amber-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4" />
                <span>Download Desktop App</span>
              </a>
            </div>
          ) : (
            <p className="text-stone-400 max-w-lg mx-auto">
              Before we begin, you need to configure your AI execution engine. Tracy can orchestrate local CLI agents or use cloud GenAI APIs directly.
            </p>
          )}
        </div>

        {/* Configuration Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6">
          <AgentSelector
            detectedAgents={detectedAgents}
            size="md"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <button
            onClick={() => selectAgent(selectedAgentId)}
            disabled={!selectedAgentId}
            className={`px-8 py-3.5 rounded-lg font-bold text-sm flex items-center space-x-2 transition-all shadow-xl ${
              selectedAgentId
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
