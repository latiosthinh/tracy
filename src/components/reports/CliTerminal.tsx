import React, { useState } from 'react';
import { Terminal, Sliders, Play, Settings, Check, Copy, FileCode } from 'lucide-react';
import { WorkspaceConfig } from '../../types/autoflow';

interface CliTerminalProps {
  config: WorkspaceConfig;
  onConfigChange: (updatedConfig: WorkspaceConfig) => void;
  activeFlowPath: string;
}

export const CliTerminal: React.FC<CliTerminalProps> = ({
  config,
  onConfigChange,
  activeFlowPath,
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'cli' | 'config'>('cli');
  const [cliOutput, setCliOutput] = useState<string[]>([
    '$ tracy doctor',
    '✅ Node.js v20.11.0 (>= 18 required)',
    '✅ Playwright v1.48.0',
    '✅ Chromium v131.0.6778.33',
    '✅ Tracy Core E2E Engine Ready',
    'Ready for execution.',
  ]);
  const [isRunningCli, setIsRunningCli] = useState(false);

  const cliCommand = `tracy test ${activeFlowPath} --browser ${config.browser} ${config.headless ? '--headless' : '--headed'} --parallel ${config.parallel} --retries ${config.retries}`;

  const handleRunCliCommand = () => {
    setIsRunningCli(true);
    setCliOutput(prev => [
      ...prev,
      `$ ${cliCommand}`,
      `[Tracy] Loading workspace config...`,
      `[Tracy] Found 1 target flow file: ${activeFlowPath}`,
      `[Tracy] Launching ${config.browser} instance...`,
      `[Tracy] Step 1/20: navigate -> /products ... PASSED (120ms)`,
      `[Tracy] Step 2/20: click -> "Add to Cart" ... PASSED (45ms)`,
      `[Tracy] Step 3/20: assertVisible -> "Order Confirmed!" ... PASSED (80ms)`,
      `✅ Suite PASSED in 0.84s (3 steps executed, 0 failed)`,
    ]);
    setTimeout(() => setIsRunningCli(false), 800);
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 font-sans text-xs rounded-[6px] border border-stone-800 overflow-hidden">
      {/* Subtab Toggle Header */}
      <div className="bg-stone-900 px-4 py-2 border-b border-stone-800 flex items-center space-x-4">
        <button
          onClick={() => setSelectedSubTab('cli')}
          className={`flex items-center space-x-1.5 py-1 text-xs font-bold border-b-2 transition-all ${
            selectedSubTab === 'cli' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Interactive CLI Runner</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('config')}
          className={`flex items-center space-x-1.5 py-1 text-xs font-bold border-b-2 transition-all ${
            selectedSubTab === 'config' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Workspace config.yaml</span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {selectedSubTab === 'cli' ? (
          <div className="space-y-4">
            {/* CLI Command Box */}
            <div className="bg-stone-900 p-3 rounded-[6px] border border-stone-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Generated Command String</span>
              <div className="p-2.5 bg-stone-950 rounded-[6px] border border-stone-800 font-mono text-amber-300 text-xs flex items-center justify-between">
                <span>$ {cliCommand}</span>
                <button
                  onClick={handleRunCliCommand}
                  disabled={isRunningCli}
                  className="px-3 py-1 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-amber-50 font-sans font-bold text-xs rounded-[6px] border border-amber-600 shadow-xs flex items-center space-x-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute CLI</span>
                </button>
              </div>
            </div>

            {/* Terminal Output Stream */}
            <div className="bg-stone-950 p-4 rounded-[6px] border border-stone-900 font-mono text-stone-200 text-xs space-y-1 h-64 overflow-y-auto shadow-inner">
              {cliOutput.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.startsWith('$')
                      ? 'text-amber-400 font-bold'
                      : line.includes('✅')
                      ? 'text-emerald-400 font-bold'
                      : 'text-stone-300'
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* config.yaml Workspace Config Form */
          <div className="bg-stone-900 p-4 rounded-[6px] border border-stone-800 space-y-4">
            <h3 className="font-bold text-amber-100 text-sm flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>Workspace Configuration (config.yaml)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-400 text-[11px] font-bold mb-1">Target Browser</label>
                <select
                  value={config.browser}
                  onChange={e => onConfigChange({ ...config, browser: e.target.value as any })}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] p-2 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                >
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                  <option value="webkit">WebKit (Safari)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-400 text-[11px] font-bold mb-1">Parallel Workers</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={config.parallel}
                  onChange={e => onConfigChange({ ...config, parallel: parseInt(e.target.value) || 1 })}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] p-2 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-400 text-[11px] font-bold mb-1">Step Timeout (ms)</label>
                <input
                  type="number"
                  value={config.timeout}
                  onChange={e => onConfigChange({ ...config, timeout: parseInt(e.target.value) || 10000 })}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] p-2 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-400 text-[11px] font-bold mb-1">Max Step Retries</label>
                <input
                  type="number"
                  value={config.retries}
                  onChange={e => onConfigChange({ ...config, retries: parseInt(e.target.value) || 0 })}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] p-2 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="headless-toggle"
                checked={config.headless}
                onChange={e => onConfigChange({ ...config, headless: e.target.checked })}
                className="rounded-xs border-stone-700 bg-stone-950 text-amber-600"
              />
              <label htmlFor="headless-toggle" className="text-stone-300 font-semibold cursor-pointer">
                Run Headless Mode by Default
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
