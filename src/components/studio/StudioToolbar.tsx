import React from 'react';
import { Play, Pause, RotateCcw, Eye, Monitor } from 'lucide-react';
import type { DevicePreset } from '../../types/ui';

interface StudioToolbarProps {
  targetUrl: string;
  onUpdateTargetUrl: (url: string) => void;
  isExecuting: boolean;
  onStartRun: () => void;
  onPauseRun: () => void;
  onResetRun: () => void;
  inspectMode: boolean;
  onToggleInspectMode: () => void;
  devicePreset: DevicePreset;
  onDevicePresetChange: (preset: DevicePreset) => void;
}

const DEVICE_PRESETS: DevicePreset[] = [
  'Desktop 1440',
  'Laptop 1280',
  'Tablet iPad',
  'Mobile iPhone 14',
  'Mobile Pixel 7',
];

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
  targetUrl,
  onUpdateTargetUrl,
  isExecuting,
  onStartRun,
  onPauseRun,
  onResetRun,
  inspectMode,
  onToggleInspectMode,
  devicePreset,
  onDevicePresetChange,
}) => {
  return (
    <div className="bg-stone-900 border-b border-stone-800 px-3 py-1.5 flex items-center justify-between gap-3 shrink-0 text-xs font-mono select-none">
      {/* Target URL Bar */}
      <div className="flex items-center space-x-2 flex-1 max-w-xl">
        <span className="text-stone-400 font-bold text-[11px] uppercase tracking-wider shrink-0">
          Target URL:
        </span>
        <input
          type="text"
          value={targetUrl}
          onChange={(e) => onUpdateTargetUrl(e.target.value)}
          placeholder="http://localhost:3000"
          className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500/80 rounded-[6px] px-2.5 py-1 text-stone-200 text-xs font-mono focus:outline-none transition-colors"
        />
      </div>

      {/* Execution & Inspection Controls */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Inspect Mode Toggle */}
        <button
          onClick={onToggleInspectMode}
          className={`px-2.5 py-1 rounded-[6px] border flex items-center space-x-1.5 font-bold transition-all cursor-pointer ${
            inspectMode
              ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 shadow-xs shadow-cyan-500/20'
              : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
          title="Toggle Element Inspector mode"
        >
          <Eye className={`w-3.5 h-3.5 ${inspectMode ? 'text-cyan-400 animate-pulse' : 'text-stone-400'}`} />
          <span>Inspect</span>
        </button>

        {/* Device Preset Selector */}
        <div className="relative flex items-center bg-stone-950 border border-stone-800 rounded-[6px] px-2 py-1">
          <Monitor className="w-3.5 h-3.5 text-stone-400 mr-1.5 shrink-0" />
          <select
            value={devicePreset}
            onChange={(e) => onDevicePresetChange(e.target.value as DevicePreset)}
            className="bg-transparent text-stone-300 text-xs font-mono focus:outline-none cursor-pointer pr-1"
          >
            {DEVICE_PRESETS.map((dp) => (
              <option key={dp} value={dp} className="bg-stone-900 text-stone-200">
                {dp}
              </option>
            ))}
          </select>
        </div>

        {/* Run / Pause / Reset Actions */}
        {isExecuting ? (
          <button
            onClick={onPauseRun}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-[6px] flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={onStartRun}
            className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-extrabold rounded-[6px] flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Flow</span>
          </button>
        )}

        <button
          onClick={onResetRun}
          className="p-1.5 bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-stone-200 rounded-[6px] border border-stone-800 transition-colors cursor-pointer"
          title="Reset Flow execution state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
