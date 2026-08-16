import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  CircleDot,
  MousePointer,
  Pickaxe,
  Drill,
  Database,
  ShieldCheck,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  ExternalLink,
  Columns2,
  Rows2
} from 'lucide-react';
import type { DevicePreset } from '@/src/types/ui';
import { IconButton } from '@/src/components/ui/IconButton';
import { useEnvironment } from '@/src/hooks/useEnvironment';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useUiStore } from '@/src/stores/uiStore';

interface StudioToolbarProps {
  targetPath: string;
  setTargetPath: (path: string) => void;
  embedUrlInput: string;
  setEmbedUrlInput: (url: string) => void;
  recordMode: boolean;
  toggleRecordMode: () => void;
  inspectMode: boolean;
  toggleInspectMode: () => void;
  devicePreset: DevicePreset;
  setDevicePreset: (preset: DevicePreset) => void;
  isMining: boolean;
  handleMineDOM: () => void;
  setShowBatchMiner: (show: boolean) => void;
  domSnapshotsCount: number;
  showDomMiner: boolean;
  setShowDomMiner: (show: boolean) => void;
  mineProgressMessage: string | null;
}

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
  targetPath,
  setTargetPath,
  embedUrlInput,
  setEmbedUrlInput,
  recordMode,
  toggleRecordMode,
  inspectMode,
  toggleInspectMode,
  devicePreset,
  setDevicePreset,
  isMining,
  handleMineDOM,
  setShowBatchMiner,
  domSnapshotsCount,
  showDomMiner,
  setShowDomMiner,
  mineProgressMessage,
}) => {
  const { isWeb } = useEnvironment();
  const { t } = useTranslation();
  const splitOrientation = useUiStore((s) => s.splitOrientation);
  const toggleSplitOrientation = useUiStore((s) => s.toggleSplitOrientation);

  return (
    <div className="bg-stone-950 px-3 py-2.5 border-b border-stone-800 flex items-center justify-between shrink-0 font-sans w-full relative">
      <div className="flex items-center space-x-3 flex-1 justify-start overflow-hidden">
        <div className="flex items-center space-x-3 shrink-0 text-stone-400 bg-stone-900 border border-stone-800 rounded-[6px] px-2.5 py-1.5 shadow-xs">
          <IconButton
            onClick={() => setTargetPath('/')}
            className="hover:text-stone-100 transition-colors cursor-pointer"
            titleKey="toolbar.navBack"
            icon={ArrowLeft}
            iconClassName="w-3.5 h-3.5"
          />
          <IconButton
            className="text-stone-600 cursor-not-allowed" 
            titleKey="toolbar.navForward" 
            icon={ArrowRight}
            iconClassName="w-3.5 h-3.5"
            disabled
          />
          <IconButton
            onClick={() => {
              const cur = targetPath;
              setTargetPath('');
              setTimeout(() => setTargetPath(cur), 50);
            }}
            className="hover:text-stone-100 transition-colors cursor-pointer"
            titleKey="toolbar.reload"
            icon={RotateCcw}
            iconClassName="w-3 h-3"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs shrink-0 bg-stone-900 border border-stone-800 rounded-[6px] px-2.5 py-1.5 shadow-xs">
          <IconButton
            onClick={() => {
              toggleRecordMode();
              if (inspectMode) toggleInspectMode();
            }}
            titleKey={recordMode ? 'toolbar.recordOn' : 'toolbar.recordOff'}
            className={`font-bold transition-colors cursor-pointer ${recordMode ? 'text-rose-500' : 'text-stone-400 hover:text-rose-400'
              }`}
            icon={CircleDot}
            iconClassName={`w-3.5 h-3.5 ${recordMode ? 'text-rose-500 animate-ping' : 'text-rose-400'}`}
          />

          <IconButton
            onClick={() => {
              toggleInspectMode();
              if (recordMode) toggleRecordMode();
            }}
            titleKey={inspectMode ? 'toolbar.inspectOn' : 'toolbar.inspectOff'}
            className={`font-bold transition-colors cursor-pointer ${inspectMode ? 'text-amber-500' : 'text-stone-400 hover:text-amber-400'
              }`}
            icon={MousePointer}
            iconClassName={`w-3.5 h-3.5 ${inspectMode ? 'text-amber-400 animate-pulse' : ''}`}
          />

          <div className="w-px h-4 bg-stone-700"></div>

          <div className="relative group/miner flex items-center gap-3">
            {isWeb && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-stone-800 text-stone-300 text-[10px] rounded whitespace-nowrap opacity-0 group-hover/miner:opacity-100 pointer-events-none transition-opacity shadow-lg border border-stone-700">
                {t('toolbar.domMiningRequiresDesktop')}
              </span>
            )}
            <IconButton
              onClick={isWeb ? undefined : handleMineDOM}
              disabled={isMining || isWeb}
              className={`transition-all ${isWeb ? 'cursor-not-allowed text-stone-600' : 'cursor-pointer text-amber-500 hover:text-amber-400 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}
              titleKey="toolbar.mineUrl"
              icon={Pickaxe}
            >
              {isMining && !mineProgressMessage ? (
                <span className="w-3.5 h-3.5 block animate-spin">⛏</span>
              ) : (
                <Pickaxe className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </IconButton>

            <IconButton
              onClick={isWeb ? undefined : () => setShowBatchMiner(true)}
              disabled={isMining || isWeb}
              className={`ml-2 transition-all ${isWeb ? 'cursor-not-allowed text-stone-600' : 'cursor-pointer text-amber-500 hover:text-amber-400 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}
              titleKey="toolbar.batchMine"
              icon={Drill}
              iconClassName="w-3.5 h-3.5"
            />

            <IconButton
              onClick={isWeb ? undefined : () => setShowDomMiner(!showDomMiner)}
              className={`transition-colors ${isWeb ? 'cursor-not-allowed text-stone-600' : `transition-colors cursor-pointer ${showDomMiner ? 'text-green-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-green-500 hover:text-green-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.3)]'}`}`}
              titleKey="toolbar.viewSnapshots"
              disabled={!domSnapshotsCount || isWeb}
              icon={Database}
              iconClassName="w-3.5 h-3.5"
            />
          </div>

        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!embedUrlInput.trim()) return;
          let raw = embedUrlInput.trim();
          if (raw.startsWith('http://') || raw.startsWith('https://')) {
            setTargetPath(raw);
          } else if ((raw.includes('.') || raw.includes('localhost')) && !raw.includes(' ') && !raw.startsWith('/')) {
            const url = raw.startsWith('localhost') || raw.startsWith('127.0.0.1') ? `http://${raw}` : `https://${raw}`;
            setTargetPath(url);
          } else {
            if (!raw.startsWith('/')) raw = '/' + raw;
            setTargetPath(raw);
          }
        }}
        className="w-full max-w-xl flex items-center space-x-1.5 px-4 shrink-0"
      >
        <div className="w-full bg-stone-900 border border-stone-800 focus-within:border-amber-600/80 rounded-[6px] px-2.5 py-1 flex items-center space-x-2 shadow-inner">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={embedUrlInput}
            onChange={(e) => setEmbedUrlInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder={t('toolbar.urlPlaceholder')}
            aria-label={t('toolbar.urlPlaceholder')}
            className="w-full bg-transparent text-amber-50 font-mono text-xs focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-2 py-0.5 bg-amber-800 hover:bg-amber-700 text-amber-100 font-mono text-[10px] font-bold rounded-[4px] border border-amber-600/80 shrink-0 cursor-pointer"
          >
            {t('toolbar.go')}
          </button>
        </div>
      </form>

      <div className="flex items-center space-x-3 flex-1 justify-end overflow-hidden">
        <div className="flex items-center space-x-3 text-xs shrink-0 bg-stone-900 border border-stone-800 rounded-[6px] px-2.5 py-1.5 shadow-xs">
          <IconButton
            onClick={() => setDevicePreset('Desktop 1440')}
            className={`transition-colors cursor-pointer ${devicePreset === 'Desktop 1440' ? 'text-amber-500' : 'text-stone-400 hover:text-amber-400'
              }`}
            titleKey="toolbar.desktopPreset"
            icon={Monitor}
            iconClassName="w-3.5 h-3.5"
          />
          <IconButton
            onClick={() => setDevicePreset('Laptop 1280')}
            className={`transition-colors cursor-pointer ${devicePreset === 'Laptop 1280' ? 'text-amber-500' : 'text-stone-400 hover:text-amber-400'
              }`}
            titleKey="toolbar.laptopPreset"
            icon={Laptop}
            iconClassName="w-3.5 h-3.5"
          />
          <IconButton
            onClick={() => setDevicePreset('Tablet iPad')}
            className={`transition-colors cursor-pointer ${devicePreset === 'Tablet iPad' ? 'text-amber-500' : 'text-stone-400 hover:text-amber-400'
              }`}
            titleKey="toolbar.tabletPreset"
            icon={Tablet}
            iconClassName="w-3.5 h-3.5"
          />
          <IconButton
            onClick={() => setDevicePreset('Mobile iPhone 14')}
            className={`transition-colors cursor-pointer ${devicePreset === 'Mobile iPhone 14' ? 'text-amber-500' : 'text-stone-400 hover:text-amber-400'
              }`}
            titleKey="toolbar.mobilePreset"
            icon={Smartphone}
            iconClassName="w-3.5 h-3.5"
          />

          <div className="w-px h-4 bg-stone-700"></div>

          <IconButton
            onClick={toggleSplitOrientation}
            className="transition-colors cursor-pointer text-stone-400 hover:text-amber-400"
            titleKey="layout.toggleSplit"
            icon={splitOrientation === 'horizontal' ? Rows2 : Columns2}
            iconClassName="w-3.5 h-3.5 text-amber-500"
          />

          <IconButton
            onClick={() => {
              if (targetPath) window.open(embedUrlInput, '_blank');
            }}
            className="transition-colors cursor-pointer text-stone-400 hover:text-stone-200"
            titleKey="toolbar.openExternal"
            icon={ExternalLink}
            iconClassName="w-3.5 h-3.5"
          />
        </div>
      </div>
    </div>
  );
};
