import React from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { computeLineDiff, getDiffStats } from '@/src/utils/diffUtils';
import { useTranslation } from '@/src/hooks/useTranslation';
import { GitCompare, RotateCcw, Copy, Check } from 'lucide-react';

export interface YamlDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalYaml: string;
  modifiedYaml: string;
  onRevert?: () => void;
}

export const YamlDiffModal: React.FC<YamlDiffModalProps> = ({
  isOpen,
  onClose,
  originalYaml,
  modifiedYaml,
  onRevert,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const diffLines = React.useMemo(
    () => computeLineDiff(originalYaml, modifiedYaml),
    [originalYaml, modifiedYaml]
  );

  const stats = React.useMemo(() => getDiffStats(diffLines), [diffLines]);
  const hasChanges = stats.additions > 0 || stats.deletions > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(modifiedYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevert = () => {
    if (onRevert) {
      onRevert();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-amber-400" />
          <span>{t('diff.title')}</span>
          <div className="flex items-center gap-1.5 ml-3 text-xs font-normal">
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              {t('diff.additions', { count: stats.additions })}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">
              {t('diff.deletions', { count: stats.deletions })}
            </span>
          </div>
        </div>
      }
      maxWidth="max-w-5xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {onRevert && hasChanges && (
              <button
                type="button"
                onClick={handleRevert}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('diff.revert')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('common.copied') : t('diff.copyModified')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-700 hover:bg-stone-600 rounded transition-colors cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      }
    >
      {!hasChanges ? (
        <div className="py-12 text-center text-stone-400 text-sm">
          {t('diff.noChanges')}
        </div>
      ) : (
        <div className="font-mono text-xs border border-stone-800 rounded bg-stone-950 overflow-x-auto select-text">
          <div className="grid grid-cols-[3rem_3rem_1fr] border-b border-stone-800 bg-stone-900/80 px-2 py-1.5 text-stone-400 font-sans font-semibold text-[11px]">
            <span className="text-center">{t('diff.original')}</span>
            <span className="text-center">{t('diff.modified')}</span>
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
