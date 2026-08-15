import React, { useState, useCallback, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { Project } from '@/src/types/project';
import { serializeProjects, downloadExport, validateImport, mergeImportedProjects } from '@/src/lib/export';
import { useTranslation } from '@/src/hooks/useTranslation';

interface ExportImportPanelProps {
  projects: Project[];
  onMergeProjects: (projects: Project[]) => void;
  onClose: () => void;
}

type ImportMode = 'merge' | 'overwrite';

export const ExportImportPanel: React.FC<ExportImportPanelProps> = ({
  projects,
  onMergeProjects,
  onClose,
}) => {
  const { t } = useTranslation();
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importStatus, setImportStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [projectCount, setProjectCount] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    try {
      const json = serializeProjects(projects);
      downloadExport(json);
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  }, [projects]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('validating');
    setImportMessage('');

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = validateImport(text);

      if (result.valid && result.payload) {
        setImportStatus('success');
        setProjectCount(result.projectCount ?? 0);
        setImportMessage(
          t('projects.importSuccessMsg', {
            count: result.projectCount ?? 0,
            plural: result.projectCount === 1 ? '' : 's',
          })
        );
      } else {
        setImportStatus('error');
        setImportMessage(result.error ?? t('projects.importUnknownError'));
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      setImportMessage(t('projects.importReadError'));
    };
    reader.readAsText(file);
  }, [t]);

  const handleImport = useCallback(() => {
    if (importStatus !== 'success' || !fileInputRef.current?.files?.[0]) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = validateImport(text);
      if (!result.valid || !result.payload) return;

      if (importMode === 'overwrite') {
        onMergeProjects(result.payload.projects);
      } else {
        const merged = mergeImportedProjects(projects, result.payload.projects);
        onMergeProjects(merged);
      }
      // Reset after successful import
      setImportStatus('idle');
      setImportMessage('');
      setProjectCount(0);
      setImportMode('merge');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    };
    reader.readAsText(fileInputRef.current.files[0]);
  }, [importMode, importStatus, projects, onMergeProjects, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-import-panel-title"
      className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-stone-900 border border-stone-800 rounded-[12px] w-full max-w-xl flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800 bg-stone-950 shrink-0">
          <h2 id="export-import-panel-title" className="text-amber-300 font-bold text-sm">
            {t('projects.exportImportHeader')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-100 rounded-[6px] hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* EXPORT SECTION */}
          <section>
            <h3 className="text-amber-100 font-bold text-sm mb-2 flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>{t('projects.exportHeading')}</span>
            </h3>
            <p className="text-stone-400 text-xs mb-3">
              {t('projects.exportDesc')}
            </p>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                isExporting
                  ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-amber-900/30'
              }`}
            >
              <span>{isExporting ? t('projects.exportingBtn') : t('projects.exportBtn')}</span>
            </button>
          </section>

          {/* IMPORT SECTION */}
          <section>
            <h3 className="text-amber-100 font-bold text-sm mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              <span>{t('projects.importHeading')}</span>
            </h3>
            <p className="text-stone-400 text-xs mb-3">
              {t('projects.importDesc')}
            </p>

            {/* Import mode selector */}
            <div className="flex gap-3 mb-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mr-2 accent-amber-600 cursor-pointer"
                />
                <span className="text-xs text-stone-300">{t('projects.importMerge')}</span>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  value="overwrite"
                  checked={importMode === 'overwrite'}
                  onChange={() => setImportMode('overwrite')}
                  className="mr-2 accent-amber-600 cursor-pointer"
                />
                <span className="text-xs text-stone-300">{t('projects.importOverwrite')}</span>
              </label>
            </div>

            {/* File input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              aria-label="Upload JSON file"
              onChange={handleFileChange}
              className="block w-full text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-stone-800 file:text-emerald-400 hover:file:bg-stone-700 cursor-pointer mb-3"
            />

            {/* Validation / status message */}
            {importStatus !== 'idle' && (
              <div role={importStatus === 'error' ? 'alert' : 'status'} className={`mb-3 px-3 py-2 rounded-md flex items-start gap-2 text-xs ${
                importStatus === 'error'
                  ? 'bg-red-950/60 border border-red-900/50 text-red-300'
                  : 'bg-emerald-950/60 border border-emerald-900/50 text-emerald-300'
              }`}>
                {importStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <span>{importMessage}</span>
              </div>
            )}

            {/* Import action */}
            {importStatus === 'success' && (
              <button
                type="button"
                onClick={handleImport}
                className="px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-500 text-stone-950 cursor-pointer shadow-emerald-900/30"
              >
                <span>{t('projects.importBtn', {
                  count: projectCount,
                  plural: projectCount !== 1 ? 's' : '',
                })}</span>
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
