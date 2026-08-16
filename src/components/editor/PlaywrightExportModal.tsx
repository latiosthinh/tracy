import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { useTranslation } from '@/src/hooks/useTranslation';
import { FileCode2, Copy, Check, Download } from 'lucide-react';
import type { FlowFile } from '@/src/types/flow';
import { exportFlowToPlaywrightTs } from '@/src/utils/playwrightExporter';

export interface PlaywrightExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  flow: FlowFile;
  targetUrl?: string;
}

export const PlaywrightExportModal: React.FC<PlaywrightExportModalProps> = ({
  isOpen,
  onClose,
  flow,
  targetUrl,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const generatedCode = React.useMemo(() => {
    return exportFlowToPlaywrightTs(flow, targetUrl);
  }, [flow, targetUrl]);

  const lines = React.useMemo(() => {
    return generatedCode.split('\n');
  }, [generatedCode]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const rawName = flow.name ? flow.name.replace(/\.ya?ml$/i, '') : 'flow';
    const cleanName = rawName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const fileName = `${cleanName}.spec.ts`;

    const blob = new Blob([generatedCode], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-amber-400" />
          <span>{t('editor.playwrightExportTitle')}</span>
        </div>
      }
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-stone-500 font-mono">
            {lines.length} lines • TypeScript
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
              <span>{copied ? t('editor.copiedPlaywright') : t('common.copy')}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors cursor-pointer font-semibold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('editor.downloadSpec')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-700 hover:bg-stone-600 rounded transition-colors cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex bg-stone-950 border border-stone-800 rounded-lg overflow-hidden max-h-[60vh]">
        {/* Line numbers */}
        <div
          aria-hidden="true"
          className="w-10 bg-stone-950/80 py-3 text-right pr-2 select-none text-stone-600 font-mono text-xs border-r border-stone-900 leading-relaxed overflow-hidden shrink-0"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 p-3 overflow-auto font-mono text-xs leading-relaxed text-stone-200 whitespace-pre selection:bg-amber-700/50">
          <code>{generatedCode}</code>
        </div>
      </div>
    </Modal>
  );
};
