import React from 'react';
import {
  BookOpen,
  X,
  Code2,
  MousePointer,
  ShieldCheck
} from 'lucide-react';
import { useTranslation } from '@/src/hooks/useTranslation';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="docs-modal-title"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-stone-900 border border-stone-800 rounded-[6px] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans text-xs text-stone-200">
        {/* Modal Header */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <h2 id="docs-modal-title" className="font-serif font-bold text-amber-100 text-sm">{t('docs.modalTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('docs.close')}
            className="p-1 text-stone-400 hover:text-stone-100 rounded-[6px] hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Section 1: E2E Flow YAML Architecture */}
          <div className="space-y-2">
            <h3 className="font-bold text-amber-300 text-xs flex items-center space-x-1.5 uppercase tracking-wider">
              <Code2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>{t('docs.structureTitle')}</span>
            </h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              {t('docs.structureDesc')}
            </p>

            <pre className="p-3 bg-stone-950 rounded-[6px] border border-stone-800 font-mono text-amber-200 text-xs">
{`url: https://example.com
tags: [smoke, checkout]
env:
  USER_EMAIL: test@example.com
browser: chromium
viewport: { width: 1280, height: 720 }
---
- navigate: /login
- inputText:
    selector: { label: "Email Address" }
    text: \${USER_EMAIL}
- click: "Sign In"
- assertVisible: "Welcome back"`}
            </pre>
          </div>

          {/* Section 2: Selector Priority */}
          <div className="space-y-2">
            <h3 className="font-bold text-amber-300 text-xs flex items-center space-x-1.5 uppercase tracking-wider">
              <MousePointer className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>{t('docs.selectorTitle')}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-stone-950 rounded-[6px] border border-stone-800 space-y-1">
                <span className="font-bold text-amber-400 font-mono">{t('docs.testIdTitle')}</span>
                <p className="text-stone-400">{t('docs.testIdDesc')}</p>
              </div>
              <div className="p-2.5 bg-stone-950 rounded-[6px] border border-stone-800 space-y-1">
                <span className="font-bold text-emerald-400 font-mono">{t('docs.roleTitle')}</span>
                <p className="text-stone-400">{t('docs.roleDesc')}</p>
              </div>
              <div className="p-2.5 bg-stone-950 rounded-[6px] border border-stone-800 space-y-1">
                <span className="font-bold text-amber-400 font-mono">{t('docs.textTitle')}</span>
                <p className="text-stone-400">{t('docs.textDesc')}</p>
              </div>
              <div className="p-2.5 bg-stone-950 rounded-[6px] border border-stone-800 space-y-1">
                <span className="font-bold text-rose-400 font-mono">{t('docs.cssIdTitle')}</span>
                <p className="text-stone-400">{t('docs.cssIdDesc')}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Commands Quick Ref */}
          <div className="space-y-2">
            <h3 className="font-bold text-amber-300 text-xs flex items-center space-x-1.5 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>{t('docs.commandsTitle')}</span>
            </h3>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="p-2 bg-stone-950 rounded-[6px] border border-stone-800 flex justify-between">
                <span className="text-amber-400 font-bold">navigate: /path</span>
                <span className="text-stone-400 font-sans">{t('docs.cmdNavDesc')}</span>
              </div>
              <div className="p-2 bg-stone-950 rounded-[6px] border border-stone-800 flex justify-between">
                <span className="text-amber-400 font-bold">click: &quot;Sign In&quot;</span>
                <span className="text-stone-400 font-sans">{t('docs.cmdClickDesc')}</span>
              </div>
              <div className="p-2 bg-stone-950 rounded-[6px] border border-stone-800 flex justify-between">
                <span className="text-amber-400 font-bold">inputText: {`{ selector, text }`}</span>
                <span className="text-stone-400 font-sans">{t('docs.cmdInputDesc')}</span>
              </div>
              <div className="p-2 bg-stone-950 rounded-[6px] border border-stone-800 flex justify-between">
                <span className="text-amber-400 font-bold">assertVisible: &quot;Welcome&quot;</span>
                <span className="text-stone-400 font-sans">{t('docs.cmdAssertDesc')}</span>
              </div>
              <div className="p-2 bg-stone-950 rounded-[6px] border border-stone-800 flex justify-between">
                <span className="text-amber-400 font-bold">interceptNetwork: {`{ url, response }`}</span>
                <span className="text-stone-400 font-sans">{t('docs.cmdMockDesc')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-stone-400">{t('docs.footerNote')}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] border border-amber-600 cursor-pointer"
          >
            {t('docs.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
};
