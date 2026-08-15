import React, { useState } from 'react';
import {
  MousePointer,
  Sparkles,
  Copy,
  Check,
  PlusCircle
} from 'lucide-react';
import { InspectedElement, CommandType } from '@/src/types/autoflow';
import { useTranslation } from '@/src/hooks/useTranslation';

interface ElementInspectorProps {
  element: InspectedElement | null;
  onInsertStep?: (command: CommandType, selector: any, textValue?: string) => void;
  onClose?: () => void;
}

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  element,
  onInsertStep,
  onClose,
}) => {
  const { t } = useTranslation();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<CommandType>('leftClick');
  const [inputTextValue, setInputTextValue] = useState('');

  if (!element) {
    return (
      <div className="p-4 bg-stone-900 text-stone-300 rounded-[6px] border border-stone-800 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MousePointer className="w-4 h-4 text-amber-400 animate-pulse" aria-hidden="true" />
          <span>
            <strong className="text-amber-100">{t('studio.inspectModeActive')}</strong> {t('studio.inspectModeDesc')}
          </span>
        </div>
      </div>
    );
  }

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsert = (selectorData: any) => {
    if (onInsertStep) {
      onInsertStep(selectedAction, selectorData, inputTextValue || element.text);
    }
  };

  return (
    <div className="bg-stone-900 text-stone-100 rounded-[6px] border border-stone-800 shadow-xl overflow-hidden text-xs">
      {/* Header */}
      <div className="bg-stone-800/80 px-4 py-2.5 border-b border-stone-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" aria-hidden="true" />
          <span className="font-bold text-amber-100 tracking-tight text-sm">{t('studio.inspectedElement')}</span>
          <span className="font-mono text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded-sm border border-amber-700/50">
            &lt;{element.tagName}&gt;
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 px-2 py-0.5 rounded-sm bg-stone-700/50 cursor-pointer"
          >
            {t('common.close')}
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Element Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-stone-950 p-2 rounded-[6px] border border-stone-800">
            <span className="text-stone-500 block text-[10px] font-semibold uppercase">{t('studio.visibleText')}</span>
            <span className="font-medium text-stone-200 truncate block">
              {element.text || t('studio.noText')}
            </span>
          </div>

          <div className="bg-stone-950 p-2 rounded-[6px] border border-stone-800">
            <span className="text-stone-500 block text-[10px] font-semibold uppercase">{t('studio.dataTestId')}</span>
            <span className="font-mono text-amber-400 font-bold truncate block">
              {element.testId || t('studio.none')}
            </span>
          </div>

          <div className="bg-stone-950 p-2 rounded-[6px] border border-stone-800">
            <span className="text-stone-500 block text-[10px] font-semibold uppercase">{t('studio.ariaRole')}</span>
            <span className="font-mono text-emerald-400 truncate block">
              {element.role || 'element'}
            </span>
          </div>

          <div className="bg-stone-950 p-2 rounded-[6px] border border-stone-800">
            <span className="text-stone-500 block text-[10px] font-semibold uppercase">{t('studio.bounds')}</span>
            <span className="font-mono text-stone-400 truncate block">
              {element.rect.width}x{element.rect.height}
            </span>
          </div>
        </div>

        {/* Action Choice Generator */}
        <div className="bg-stone-950/60 p-3 rounded-[6px] border border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <label htmlFor="inspector-action-select" className="text-stone-400 font-semibold text-[11px]">{t('studio.generateAction')}</label>
            <select
              id="inspector-action-select"
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value as CommandType)}
              className="bg-stone-800 border border-stone-700 text-stone-100 text-xs rounded-md px-2 py-1 font-semibold focus:outline-hidden focus:border-amber-600"
            >
              <option value="leftClick">leftClick</option>
              <option value="fill">fill</option>
              <option value="assertVisible">assertVisible</option>
              <option value="assertNotVisible">assertNotVisible</option>
              <option value="copyTextFrom">copyTextFrom</option>
              <option value="selectOption">selectOption</option>
            </select>
          </div>

          {selectedAction === 'fill' && (
            <input
              type="text"
              placeholder={t('studio.typePlaceholder')}
              aria-label={t('studio.typePlaceholder')}
              value={inputTextValue}
              onChange={e => setInputTextValue(e.target.value)}
              className="bg-stone-800 border border-stone-700 text-stone-100 text-xs rounded-md px-2 py-1 w-48"
            />
          )}
        </div>

        {/* Ranked Selector Recommendations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-300 text-[11px] flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>{t('studio.recommendedSelectors')}</span>
            </span>
          </div>

          <div className="space-y-2">
            {element.suggestedSelectors.map((sel, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-[6px] border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                  sel.rating === 'best'
                    ? 'bg-amber-950/40 border-amber-600/50'
                    : sel.rating === 'recommended'
                    ? 'bg-stone-950 border-stone-800'
                    : 'bg-stone-950/60 border-stone-800/80'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-xs tracking-wider ${
                        sel.rating === 'best'
                          ? 'bg-amber-700 text-amber-50'
                          : sel.rating === 'recommended'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {sel.rating === 'best' ? t('studio.best') : sel.rating === 'recommended' ? t('studio.recommended') : sel.type}
                    </span>
                    <span className="font-mono text-xs font-bold text-stone-100">
                      {sel.type}: "{sel.value}"
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400">{sel.description}</p>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleCopy(sel.yamlSnippet, idx)}
                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-md font-medium text-[10px] flex items-center space-x-1 border border-stone-700 cursor-pointer"
                  >
                    {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                    <span>{copiedIndex === idx ? t('studio.copied') : t('studio.copySnippet')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsert(sel.type === 'text' ? sel.value : { [sel.type]: sel.value })}
                    className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 text-amber-50 rounded-md font-bold text-[10px] flex items-center space-x-1 border border-amber-600 shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('studio.insertStep')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
