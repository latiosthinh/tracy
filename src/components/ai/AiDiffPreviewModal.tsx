import React from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { computeLineDiff, getDiffStats } from '@/src/utils/diffUtils';
import { useTranslation } from '@/src/hooks/useTranslation';
import { GitCompare, CheckCircle2, PlusCircle, X } from 'lucide-react';

export interface AiDiffPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalYaml: string;
  generatedYaml: string;
  onReplace: () => void;
  onAppend: () => void;
}

export const AiDiffPreviewModal: React.FC<AiDiffPreviewModalProps> = ({
  isOpen,
  onClose,
  originalYaml,
  generatedYaml,
  onReplace,
  onAppend,
}) => {
  const { t } = useTranslation();

  const diffLines = React.useMemo(
    () => computeLineDiff(originalYaml, generatedYaml),
    [originalYaml, generatedYaml]
  );

  const stats = React.useMemo(() => getDiffStats(diffLines), [diffLines]);
  const hasChanges = stats.additions > 0 || stats.deletions > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-amber-400" />
          <span>{t('copilot.diffPreview.modalTitle')}</span>
          <div className="flex items-center gap-1.5 ml-3 text-xs font-normal">
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              {t('copilot.diffPreview.additions', { count: stats.additions })}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">
              {t('copilot.diffPreview.deletions', { count: stats.deletions })}
            </span>
          </div>
        </div>
      }
      maxWidth="max-w-5xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-[6px] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('copilot.diffPreview.cancel')}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAppend}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-300 bg-stone-900 hover:bg-amber-950/80 border border-amber-600/80 rounded-[6px] transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('copilot.diffPreview.appendSteps')}</span>
            </button>
            <button
              type="button"
              onClick={onReplace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-500 hover:bg-amber-400 rounded-[6px] transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('copilot.diffPreview.replaceFlow')}</span>
            </button>
          </div>
        </div>
      }
    >
      {!hasChanges ? (
        <div className="py-12 text-center text-stone-400 text-sm">
          {t('copilot.diffPreview.noChanges')}
        </div>
      ) : (
        <div className="font-mono text-xs border border-stone-800 rounded-[6px] bg-stone-950 overflow-x-auto select-text">
          <div className="grid grid-cols-[3rem_3rem_1fr] border-b border-stone-800 bg-stone-900/80 px-2 py-1.5 text-stone-400 font-sans font-semibold text-[11px]">
            <span className="text-center">{t('copilot.diffPreview.activeFlow')}</span>
            <span className="text-center">{t('copilot.diffPreview.aiGenerated')}</span>
            <span className="pl-2">{t('diff.content')}</span>
          </div>
          <div className="divide-y divide-stone-900/40">
            {diffLines.map((line, idx) => {
              const isAdded = line.type === 'added';
              const isRemoved = line.type === 'removed';
              const bgClass = isAdded
                ? 'bg-emerald-950/30 text-emerald-200'
                : isRemoved
                ? 'bg-rose-950/30 text-rose-200 line-through opacity-80'
                : 'text-stone-300 hover:bg-stone-900/50';

              const prefix = isAdded ? '+' : isRemoved ? '-' : ' ';

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-[3rem_3rem_1fr] px-2 py-0.5 font-mono items-center ${bgClass}`}
                >
                  <span className="text-stone-500 text-right pr-2 select-none">
                    {line.originalLineNumber ?? ''}
                  </span>
                  <span className="text-stone-500 text-right pr-2 select-none border-r border-stone-800/60">
                    {line.modifiedLineNumber ?? ''}
                  </span>
                  <div className="pl-2 flex items-center whitespace-pre overflow-hidden text-ellipsis">
                    <span className="w-4 select-none font-bold shrink-0 text-stone-500">
                      {prefix}
                    </span>
                    <span>{line.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
};
