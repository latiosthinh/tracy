import React from 'react';
import { ChevronRight, Cloud, Download } from 'lucide-react';
import { useAgentStore } from '@/src/stores/agentStore';
import { useAiConfigStore } from '@/src/stores/aiConfigStore';
import { AgentSelector } from '@/src/components/shared/AgentSelector';
import { useEnvironment } from '@/src/hooks/useEnvironment';
import { useTranslation } from '@/src/hooks/useTranslation';

export const WelcomeSetup: React.FC = () => {
  const { t } = useTranslation();
  const detectedAgents = useAgentStore((s) => s.detectedAgents);
  const selectedAgentId = useAiConfigStore((s) => s.selectedAgentId);
  const selectAgent = useAiConfigStore((s) => s.selectAgent);

  const { isWeb } = useEnvironment();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 font-sans text-stone-100 p-6 h-full w-full overflow-y-auto">
      <div className="w-full max-w-3xl flex flex-col space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-500/80 via-amber-700/60 to-stone-900 p-0.5 shadow-xl shadow-amber-950/60 mb-2 border border-amber-600/50">
            <div className="w-full h-full bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 rounded-[14px] flex items-center justify-center relative overflow-hidden border border-amber-500/20">
              <svg viewBox="0 0 64 64" className="w-9 h-9 text-amber-300 drop-shadow-sm" fill="none">
                <path
                  d="M22 28 V20 C22 17 24.5 15 27.5 15 H36.5 C39.5 15 42 17 42 20 V29 C42 32 39.5 34 36.5 34 H32 V41"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* 4-wings sparkle star */}
                <path
                  d="M32 44.5 Q32 50 37.5 50 Q32 50 32 55.5 Q32 50 26.5 50 Q32 50 32 44.5 Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold font-serif text-amber-100 tracking-tight">
            {t('setup.welcomeTitle')}
          </h1>
          {isWeb ? (
            <div className="space-y-3">
              <p className="text-stone-400 max-w-lg mx-auto">
                {t('setup.browserNotice')}
              </p>
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-950/50 border border-sky-800/40 rounded-md max-w-lg mx-auto text-xs text-sky-300">
                <Cloud className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('setup.browserCapabilities')}</span>
              </div>
              <a
                href="/proqa-setup.exe"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-sm rounded-[6px] transition-all shadow-lg border border-amber-600 cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>{t('setup.downloadDesktop')}</span>
              </a>
            </div>
          ) : (
            <p className="text-stone-400 max-w-lg mx-auto">
              {t('setup.desktopNotice')}
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
            type="button"
            onClick={() => selectAgent(selectedAgentId)}
            disabled={!selectedAgentId}
            className={`px-8 py-3.5 rounded-lg font-bold text-sm flex items-center space-x-2 transition-all shadow-xl ${
              selectedAgentId
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-amber-900/40'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-50'
            }`}
          >
            <span>{t('setup.continueToStudio')}</span>
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
