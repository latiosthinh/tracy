import React from 'react';
import { Database, Pickaxe, X, Copy, Download, Drill, Info } from 'lucide-react';
import { IconButton } from '@/src/components/ui/IconButton';
import type { MinedPageData } from '@/src/types/index';
import { useEnvironment } from '@/src/hooks/useEnvironment';

interface DomMinerPanelProps {
  domSnapshots: Record<string, MinedPageData>;
  selectedSnapshotPath: string | null;
  setSelectedSnapshotPath: (path: string | null) => void;
  setShowDomMiner: (show: boolean) => void;
  setShowBatchMiner: (show: boolean) => void;
}

export const DomMinerPanel: React.FC<DomMinerPanelProps> = ({
  domSnapshots,
  selectedSnapshotPath,
  setSelectedSnapshotPath,
  setShowDomMiner,
  setShowBatchMiner
}) => {
  const { isWeb } = useEnvironment();
  return (
    <div className="h-[400px] border-t border-stone-800 bg-stone-950 flex flex-col shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-30">
      <div className="px-4 py-2 bg-stone-900 border-b border-stone-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-cyan-100 text-sm">DOM Snapshots</span>
          <span className="text-xs text-stone-400 font-mono">({Object.keys(domSnapshots).length})</span>
        </div>
        <div className="flex items-center space-x-1.5">
          {Object.keys(domSnapshots).length > 0 && (
            <>
              <IconButton
                onClick={() => {
                  const data = selectedSnapshotPath && domSnapshots[selectedSnapshotPath] 
                    ? domSnapshots[selectedSnapshotPath] 
                    : domSnapshots;
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                }}
                className="p-1.5 text-stone-400 hover:text-cyan-300 rounded hover:bg-stone-800 cursor-pointer transition-colors"
                titleKey="domMiner.copyJson"
                icon={Copy}
              />
              <IconButton
                onClick={() => {
                  const data = selectedSnapshotPath && domSnapshots[selectedSnapshotPath] 
                    ? domSnapshots[selectedSnapshotPath] 
                    : domSnapshots;
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tracy-dom-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="p-1.5 text-stone-400 hover:text-cyan-300 rounded hover:bg-stone-800 cursor-pointer transition-colors"
                titleKey="domMiner.downloadJson"
                icon={Download}
              />
              <IconButton
                onClick={() => setShowBatchMiner(true)}
                className="p-1.5 text-stone-400 hover:text-amber-400 rounded hover:bg-stone-800 cursor-pointer transition-colors"
                titleKey="domMiner.batchMine"
                icon={Drill}
              />
              <div className="w-px h-4 bg-stone-700 mx-1"></div>
            </>
          )}
          <IconButton
            onClick={() => setShowDomMiner(false)}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded hover:bg-stone-800 cursor-pointer"
            titleKey="domMiner.closePanel"
            icon={X}
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {Object.keys(domSnapshots).length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-500">
            <Pickaxe className="w-16 h-16 mb-4 opacity-20 text-amber-500" />
            <p className="text-lg">No DOM snapshots recorded.</p>
            {isWeb && (
              <div className="flex items-center gap-2 mt-3 px-4 py-2 bg-amber-950/50 border border-amber-800/50 rounded-md text-xs text-amber-300 max-w-sm text-center">
                <Info className="w-4 h-4 shrink-0" />
                DOM mining requires the Tracy desktop app — it uses Playwright to capture live page trees. In web mode you can only view pre-cached snapshots.
              </div>
            )}
            {!isWeb && <p className="text-sm mt-2">Use the Pickaxe or Drill button in the toolbar to mine pages.</p>}
          </div>
        ) : (
          <>
            {/* Left Pane: Snapshot List */}
            <div className="w-80 border-r border-stone-800 flex flex-col bg-stone-950 shrink-0">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {Object.entries(
                  Object.values(domSnapshots).reduce((acc, snap) => {
                    let p = '/';
                    try { p = new URL(snap.url).pathname; } catch(e) {}
                    if (!acc[p]) acc[p] = [];
                    acc[p].push(snap);
                    return acc;
                  }, {} as Record<string, typeof domSnapshots[string][]>)
                ).map(([pathGroup, snaps]) => (
                  <div key={pathGroup} className="bg-stone-900 border border-stone-800 rounded-md overflow-hidden">
                    <div className="bg-stone-800 px-3 py-1.5 border-b border-stone-700 font-bold text-stone-200 text-xs">
                      {pathGroup} <span className="text-stone-500 ml-1">({snaps.length})</span>
                    </div>
                    <div className="divide-y divide-stone-800/50">
                      {snaps.map((snap) => {
                        const isSelected = selectedSnapshotPath === snap.path;
                        return (
                          <div
                            key={snap.path}
                            onClick={() => setSelectedSnapshotPath(snap.path)}
                            className={`p-3 transition-colors cursor-pointer ${
                              isSelected ? 'bg-amber-900/20' : 'hover:bg-stone-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className={`font-medium truncate pr-2 text-xs ${isSelected ? 'text-amber-400' : 'text-stone-300'}`} title={snap.url}>
                                {snap.url}
                              </h4>
                              <span className="text-[10px] text-stone-500 whitespace-nowrap">
                                {new Date(snap.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex gap-3 text-[10px] text-stone-400">
                              <div><span className="text-stone-500">Nodes:</span> {snap.stats.totalNodes}</div>
                              <div><span className="text-emerald-500">Interactive:</span> {snap.stats.interactiveNodes}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Pane: Selected Snapshot Detail */}
            <div className="flex-1 flex flex-col bg-stone-900 overflow-hidden">
              {selectedSnapshotPath && domSnapshots[selectedSnapshotPath] ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-2 border-b border-stone-800 bg-stone-950 shrink-0">
                    <h3 className="text-sm font-bold text-stone-200 truncate mb-1">{domSnapshots[selectedSnapshotPath].url}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500">Nodes:</span>
                        <span className="font-mono text-stone-300">{domSnapshots[selectedSnapshotPath].stats.totalNodes}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-500">Interactive:</span>
                        <span className="font-mono text-stone-300">{domSnapshots[selectedSnapshotPath].stats.interactiveNodes}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-500">Text:</span>
                        <span className="font-mono text-stone-300">{domSnapshots[selectedSnapshotPath].stats.textHolders}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-3 overflow-auto">
                    <pre className="text-[10px] font-mono text-stone-300 whitespace-pre-wrap">{domSnapshots[selectedSnapshotPath].tree}</pre>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-stone-500 text-sm">
                  <p>Select a snapshot from the list to view its DOM tree.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
