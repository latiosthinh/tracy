import React, { useState } from 'react';
import { X, FileCode, Plus, Check } from 'lucide-react';
import { FlowCategory } from '../../types/autoflow';
import { PLAYWRIGHT_CATEGORIES } from '../../utils/flowUtils';

interface CreateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFlow: (name: string, category: FlowCategory) => void;
  existingFlowCount: number;
}

export const CreateFlowModal: React.FC<CreateFlowModalProps> = ({
  isOpen,
  onClose,
  onCreateFlow,
  existingFlowCount,
}) => {
  const defaultName = `flow-${existingFlowCount + 1}.yaml`;
  const [flowName, setFlowName] = useState(defaultName);
  const [selectedCategory, setSelectedCategory] = useState<FlowCategory>('E2E');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = flowName.trim() || defaultName;
    onCreateFlow(finalName, selectedCategory);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-sans animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-[12px] shadow-2xl w-full max-w-md overflow-hidden text-stone-100">
        {/* Header */}
        <div className="bg-stone-950 px-4 py-3 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-amber-950/80 border border-amber-700/60 rounded-[6px] text-amber-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-100">Create New Test Flow</h3>
              <p className="text-[11px] text-stone-400">Name and categorize your Playwright flow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-100 rounded-md hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {/* Flow Name Field */}
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-1.5 font-mono">
              Flow File Name <span className="text-amber-400">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={flowName}
                onChange={e => setFlowName(e.target.value)}
                placeholder="e.g. user-authentication.yaml"
                className="w-full bg-stone-950 border border-stone-800 rounded-[6px] px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1 font-mono">
              Auto-formats to ending with <span className="text-amber-400">.yaml</span> extension
            </p>
          </div>

          {/* Flow Category Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-2">
              Playwright Category Structure
            </label>
            <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {PLAYWRIGHT_CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left p-2 rounded-[6px] transition-all cursor-pointer border flex items-center justify-between ${
                      isSelected
                        ? `${cat.bgColor} ${cat.borderColor} text-stone-100 ring-1 ring-amber-500/40`
                        : 'bg-stone-950 border-stone-800/80 text-stone-400 hover:bg-stone-800/80 hover:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded uppercase border ${cat.bgColor} ${cat.textColor} ${cat.borderColor}`}>
                        {cat.badgeLabel}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-stone-200 block text-xs">{cat.label}</span>
                        <span className="text-[10px] text-stone-400 truncate block">{cat.description}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-[6px] font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-800 hover:bg-amber-700 text-amber-50 rounded-[6px] font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Create Flow</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
