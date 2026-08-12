import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Code, LayoutList, Upload, Drill } from 'lucide-react';

export type BatchTarget = {
  url: string;
  credential?: {
    username?: string;
    password?: string;
  };
};

interface BatchMinerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (targets: BatchTarget[]) => void;
}

export const BatchMinerModal: React.FC<BatchMinerModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [targets, setTargets] = useState<BatchTarget[]>([{ url: '' }]);
  const [jsonInput, setJsonInput] = useState<string>('[\n  {\n    "url": "https://example.com/login",\n    "credential": {\n      "username": "admin",\n      "password": "password123"\n    }\n  }\n]');
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddTarget = () => {
    setTargets([...targets, { url: '' }]);
  };

  const handleRemoveTarget = (index: number) => {
    setTargets(targets.filter((_, i) => i !== index));
  };

  const handleUpdateTarget = (index: number, field: string, value: string) => {
    const newTargets = [...targets];
    const target = newTargets[index];
    
    if (field === 'url') {
      target.url = value;
    } else if (field === 'username' || field === 'password') {
      if (!target.credential) target.credential = {};
      target.credential[field as 'username'|'password'] = value;
    }
    
    setTargets(newTargets);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      setMode('json');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (mode === 'visual') {
      const validTargets = targets.filter(t => t.url.trim() !== '');
      if (validTargets.length === 0) return;
      onSubmit(validTargets);
    } else {
      try {
        const parsed = JSON.parse(jsonInput);
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array of target objects.");
        setJsonError(null);
        onSubmit(parsed);
      } catch(e: any) {
        setJsonError(e.message || "Invalid JSON syntax.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center space-x-2">
            <Drill className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-stone-200 text-sm">Batch Sitemap & Authenticated Mining</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex bg-stone-950 rounded-md border border-stone-800 p-0.5">
              <button
                type="button"
                onClick={() => setMode('visual')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm transition-colors ${mode === 'visual' ? 'bg-stone-800 text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Visual Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('json')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm transition-colors ${mode === 'json' ? 'bg-stone-800 text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>JSON / Upload</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                className="hidden"
                onChange={handleJsonUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload JSON File</span>
              </button>
            </div>
          </div>

          <div className="bg-stone-950 border border-stone-800 rounded-md p-3">
            {mode === 'visual' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 font-bold text-stone-500 mb-1 px-1">
                  <div>URL</div>
                  <div>Username</div>
                  <div>Password</div>
                  <div></div>
                </div>
                {targets.map((target, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_120px_120px_40px] gap-2 items-center">
                    <input 
                      type="text"
                      value={target.url}
                      onChange={(e) => handleUpdateTarget(idx, 'url', e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <input 
                      type="text"
                      value={target.credential?.username || ''}
                      onChange={(e) => handleUpdateTarget(idx, 'username', e.target.value)}
                      placeholder="(optional)"
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <input 
                      type="password"
                      value={target.credential?.password || ''}
                      onChange={(e) => handleUpdateTarget(idx, 'password', e.target.value)}
                      placeholder="(optional)"
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <button 
                      onClick={() => handleRemoveTarget(idx)}
                      disabled={targets.length === 1}
                      className="p-1.5 text-stone-500 hover:text-rose-400 disabled:opacity-30 mx-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={handleAddTarget}
                  className="mt-2 flex items-center space-x-1 text-amber-500 hover:text-amber-400 px-2 py-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add URL Target</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full h-[300px] bg-stone-900 border border-stone-700 rounded p-3 text-amber-200 font-mono text-[10px] focus:outline-none focus:border-amber-500"
                  spellCheck={false}
                />
                {jsonError && (
                  <div className="text-rose-400 bg-rose-900/20 px-3 py-2 rounded border border-rose-900/50">
                    Error: {jsonError}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-amber-900/20 border border-amber-900/40 p-3 rounded text-amber-200 text-[11px] leading-relaxed">
            <strong>Note on Credentials:</strong> If a username and password are provided, the miner will attempt to auto-detect the login form and authenticate before capturing the DOM Snapshot.
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 px-4 py-3 border-t border-stone-800 shrink-0 bg-stone-950">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-stone-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow flex items-center space-x-1.5"
          >
            <Drill className="w-3.5 h-3.5" />
            <span>Start Batch Mining</span>
          </button>
        </div>
      </div>
    </div>
  );
};
