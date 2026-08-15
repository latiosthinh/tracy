import React, { useState, useRef } from 'react';
import {
  Paperclip,
  Database,
  Upload,
  X,
  FileText,
  FileCode
} from 'lucide-react';
import { VoiceInputButton } from '@/src/components/ai/VoiceInputButton';
import { Project } from '@/src/types/autoflow';
import { Button } from '@/src/components/ui/Button';
import { Textarea } from '@/src/components/ui/Input';
import { useTranslation } from '@/src/hooks/useTranslation';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
}

interface AiPromptInputProps {
  prompt: string;
  setPrompt: (value: string | ((prev: string) => string)) => void;
  attachedFiles: AttachedFile[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  domContext: string | null;
  copilotScope: 'project' | 'flow';
  activeProject: Project;
}

export const AiPromptInput: React.FC<AiPromptInputProps> = ({
  prompt,
  setPrompt,
  attachedFiles,
  setAttachedFiles,
  domContext,
  copilotScope,
  activeProject
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) return;
        setAttachedFiles(prev => [
          ...prev,
          {
            id: `file-${Date.now()}-${file.name}`,
            name: file.name,
            size: file.size,
            type: file.type || 'text/plain',
            content,
          }
        ]);
      };
      reader.readAsText(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block font-bold text-stone-300 text-xs">
          {t('copilot.contextLabel')}
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && processFiles(e.target.files)}
            multiple
            className="hidden"
            accept=".txt,.md,.yaml,.yml,.json,.js,.ts,.tsx,.csv,.log"
          />
          <Button
            type="button"
            variant="icon"
            onClick={() => fileInputRef.current?.click()}
            title={t('copilot.attachFilesTitle')}
            aria-label={t('copilot.attachFilesTitle')}
            className="text-amber-400 hover:text-amber-300 border border-stone-800"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </Button>
          {domContext && (
            <Button
              type="button"
              variant="icon"
              onClick={() => {
                if (!attachedFiles.some(f => f.name === 'DOM_Snapshots.txt')) {
                  setAttachedFiles(prev => [
                    ...prev,
                    {
                      id: `dom-snap-${Date.now()}`,
                      name: 'DOM_Snapshots.txt',
                      size: new Blob([domContext]).size,
                      type: 'text/plain',
                      content: domContext
                    }
                  ]);
                }
              }}
              className="text-cyan-400 hover:text-cyan-300 border border-stone-800"
              title={t('copilot.attachDomTitle')}
              aria-label={t('copilot.attachDomTitle')}
            >
              <Database className="w-3.5 h-3.5" />
            </Button>
          )}
          <VoiceInputButton
            onTranscript={(transcript) => {
              setPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
            }}
            size="sm"
            title={t('copilot.voiceDictateTitle')}
          />
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-[8px] border transition-all ${isDragging
            ? 'border-dashed border-amber-500 bg-amber-950/30 ring-2 ring-amber-500/30'
            : 'border-stone-800 bg-stone-900 focus-within:border-amber-600'
          }`}
      >
        <Textarea
          rows={5}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={
            copilotScope === 'project'
              ? t('copilot.projectPromptPlaceholder', { name: activeProject.name })
              : t('copilot.flowPromptPlaceholder')
          }
          className="w-full bg-transparent border-none min-h-[120px] max-h-[350px] resize-y"
        />

        {isDragging && (
          <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-xs rounded-[8px] flex flex-col items-center justify-center text-amber-200 font-mono text-xs pointer-events-none p-4 text-center z-10">
            <Upload className="w-6 h-6 text-amber-400 animate-bounce mb-1" />
            <span className="font-bold">{t('copilot.dropFiles')}</span>
            <span className="text-[10px] text-stone-400">{t('copilot.dropSupported')}</span>
          </div>
        )}
      </div>

      {attachedFiles.length > 0 && (
        <div className="mt-2 space-y-1.5 bg-stone-900/60 p-2 rounded-[6px] border border-stone-800/80">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono font-bold">
            <span className="flex items-center space-x-1">
              <Paperclip className="w-3 h-3 text-amber-400" />
              <span>{t('copilot.attachedCount', { count: attachedFiles.length })}</span>
            </span>
            <button
              type="button"
              onClick={() => setAttachedFiles([])}
              className="text-[10px] text-stone-500 hover:text-rose-400 font-normal hover:underline cursor-pointer"
            >
              {t('copilot.clearAll')}
            </button>
          </div>
          <div className="max-h-[100px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {attachedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between bg-stone-800 px-2 py-1.5 rounded text-[11px] group">
                <div className="flex items-center space-x-2 truncate">
                  {file.name.endsWith('.yaml') || file.name.endsWith('.yml') ? (
                    <FileCode className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : file.name.endsWith('.json') ? (
                    <FileCode className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : file.name === 'DOM_Snapshots.txt' ? (
                    <Database className="w-3 h-3 text-cyan-400 shrink-0" />
                  ) : (
                    <FileText className="w-3 h-3 text-stone-400 shrink-0" />
                  )}
                  <span className="text-stone-300 font-mono truncate">{file.name}</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-stone-500 font-mono">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(prev => prev.filter(f => f.id !== file.id))}
                    className="text-stone-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label={t('common.delete')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
