import React, { useState, useRef, useEffect } from 'react';
import {
  FileCode,
  Globe,
  Server,
  Flame,
  Eye,
  Box,
  ChevronDown,
  Pencil,
  X,
  Search,
  Check,
  Plus,
} from 'lucide-react';
import type { FlowFile, FlowCategory } from '@/src/types/flow';
import { PLAYWRIGHT_CATEGORIES, getFlowCategory, groupFlowsByCategory } from '@/src/utils/flowUtils';
import { useTranslation } from '@/src/hooks/useTranslation';

interface FlowTabsProps {
  flows: FlowFile[];
  activeFlow: FlowFile;
  isExecuting: boolean;
  onSelectFlow: (flowId: string) => void;
  onCloseFlowTab?: (flowId: string) => void;
  onCreateNewFlow: () => void;
  onRenameFlow?: (flowId: string, newName: string) => void;
  onUpdateFlowCategory?: (flowId: string, category: FlowCategory) => void;
}

export const FlowTabs: React.FC<FlowTabsProps> = ({
  flows,
  activeFlow,
  isExecuting: _isExecuting,
  onSelectFlow,
  onCloseFlowTab,
  onCreateNewFlow,
  onRenameFlow,
}) => {
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [flowSearch, setFlowSearch] = useState('');
  const [editingTabFlowId, setEditingTabFlowId] = useState<string | null>(null);
  const [editingTabFlowName, setEditingTabFlowName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleStartRename = (flow: FlowFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTabFlowId(flow.id);
    setEditingTabFlowName(flow.name);
  };

  const handleSaveRename = (flowId: string) => {
    if (editingTabFlowName.trim() && onRenameFlow) {
      onRenameFlow(flowId, editingTabFlowName.trim());
    }
    setEditingTabFlowId(null);
  };

  useEffect(() => {
    if (editingTabFlowId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [editingTabFlowId]);

  useEffect(() => {
    if (showDropdown && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showDropdown]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFlows = flows.filter((f) => {
    const term = flowSearch.toLowerCase();
    const cat = getFlowCategory(f);
    return (
      f.name.toLowerCase().includes(term) ||
      cat.toLowerCase().includes(term) ||
      (f.tags && f.tags.some((t) => t.toLowerCase().includes(term)))
    );
  });

  const groupedFlows = groupFlowsByCategory(filteredFlows);

  const renderCategoryIcon = (iconName: string, className = 'w-3.5 h-3.5') => {
    switch (iconName) {
      case 'Globe': return <Globe className={className} aria-hidden="true" />;
      case 'Server': return <Server className={className} aria-hidden="true" />;
      case 'Flame': return <Flame className={className} aria-hidden="true" />;
      case 'Eye': return <Eye className={className} aria-hidden="true" />;
      case 'Box': return <Box className={className} aria-hidden="true" />;
      default: return <FileCode className={className} aria-hidden="true" />;
    }
  };

  return (
    <div className="flex items-center space-x-2 flex-1 min-w-0">
      <div className="flex items-center space-x-1 flex-1 min-w-0 overflow-x-auto no-scrollbar" role="tablist" aria-label={t('tabs.testSuite')}>
        {flows.map((f) => {
          const isFlowActive = f.id === activeFlow.id;
          const cat = getFlowCategory(f);
          const catInfo = PLAYWRIGHT_CATEGORIES.find((c) => c.id === cat);
          const isEditingThisTab = editingTabFlowId === f.id;
          const tooltip = isEditingThisTab
            ? ''
            : t('tabs.flowTooltip', { name: f.name, category: catInfo?.label || cat });

          return (
            <div
              key={f.id}
              role="tab"
              aria-selected={isFlowActive}
              tabIndex={0}
              onClick={() => !isEditingThisTab && onSelectFlow(f.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (!isEditingThisTab) onSelectFlow(f.id);
                }
              }}
              onDoubleClick={(e) => handleStartRename(f, e)}
              title={tooltip}
              className={`group flex-1 min-w-[110px] max-w-[220px] shrink px-2 sm:px-2.5 py-1 rounded-[6px] text-xs font-mono font-semibold flex items-center justify-between space-x-1 border transition-all overflow-hidden cursor-pointer ${
                isFlowActive
                  ? 'bg-stone-900 border-amber-600/80 text-amber-300 shadow-xs font-bold'
                  : 'bg-stone-950/80 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
              }`}
            >
              <div className="flex items-center space-x-1.5 min-w-0 overflow-hidden flex-1">
                <span
                  className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded border ${
                    catInfo?.bgColor || 'bg-stone-800'
                  } ${catInfo?.textColor || 'text-stone-300'} ${catInfo?.borderColor || 'border-stone-700'}`}
                >
                  {catInfo?.badgeLabel || cat}
                </span>

                {isEditingThisTab ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveRename(f.id);
                    }}
                    className="flex items-center space-x-1 min-w-0 flex-1"
                  >
                    <input
                      ref={renameInputRef}
                      type="text"
                      aria-label={t('tabs.renameFlow')}
                      value={editingTabFlowName}
                      onChange={(e) => setEditingTabFlowName(e.target.value)}
                      onBlur={() => handleSaveRename(f.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-stone-950 border border-amber-500 rounded px-1.5 py-0.5 text-xs text-stone-100 font-mono w-full focus:outline-none"
                    />
                  </form>
                ) : (
                  <span className="truncate min-w-0 flex-1">{f.name}</span>
                )}
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                {!isEditingThisTab && (
                  <button
                    type="button"
                    onClick={(e) => handleStartRename(f, e)}
                    className="p-0.5 text-stone-500 hover:text-amber-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('tabs.renameFlow')}
                    aria-label={t('tabs.renameFlow')}
                  >
                    <Pencil className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}

                {flows.length > 1 && onCloseFlowTab && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseFlowTab(f.id);
                    }}
                    className="p-0.5 text-stone-500 hover:text-stone-100 rounded-[4px] hover:bg-stone-800/80 opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
                    title={t('tabs.closeFlowTab')}
                    aria-label={t('tabs.closeFlowTab')}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 rounded-[6px] border border-amber-600/60 flex items-center space-x-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
          title={t('tabs.selectFlowTooltip')}
          aria-label={t('tabs.selectFlowTooltip')}
          aria-expanded={showDropdown}
        >
          <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-amber-100">{t('tabs.selectFlow', { count: flows.length })}</span>
          <ChevronDown className={`w-3 h-3 text-amber-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {showDropdown && (
          <div className="absolute top-full right-0 mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-stone-900 border border-stone-800 rounded-[8px] shadow-2xl z-50 p-2.5 space-y-2">
            <div className="text-[10px] font-mono text-stone-400 uppercase px-1 py-0.5 font-bold border-b border-stone-800 flex justify-between items-center">
              <span>{t('tabs.testSuite')}</span>
              <span className="text-amber-400 font-normal">{t('tabs.groupedCount', { count: flows.length })}</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={flowSearch}
                onChange={(e) => setFlowSearch(e.target.value)}
                placeholder={t('tabs.searchFlowsPlaceholder')}
                aria-label={t('tabs.searchFlowsPlaceholder')}
                className="w-full pl-8 pr-2 py-1 bg-stone-950 border border-stone-800 rounded-[4px] text-xs text-stone-100 focus:outline-hidden focus:border-amber-600 font-mono"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-0.5">
              {groupedFlows.map((group) => (
                <div key={group.category.id} className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 bg-stone-950/90 rounded border border-stone-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <div className="flex items-center space-x-1.5">
                      {renderCategoryIcon(group.category.iconName, `w-3.5 h-3.5 ${group.category.textColor}`)}
                      <span className={group.category.textColor}>{group.category.label}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] rounded font-mono font-bold border ${group.category.bgColor} ${group.category.textColor} ${group.category.borderColor}`}
                    >
                      {group.flows.length}
                    </span>
                  </div>

                  <div className="space-y-0.5 pl-1">
                    {group.flows.map((f) => {
                      const isFlowActive = f.id === activeFlow.id;
                      return (
                        <button
                          type="button"
                          key={f.id}
                          onClick={() => {
                            onSelectFlow(f.id);
                            setShowDropdown(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-[5px] text-xs font-mono flex items-center justify-between transition-colors cursor-pointer text-left ${
                            isFlowActive
                              ? 'bg-amber-950/80 text-amber-300 font-bold border border-amber-800/60'
                              : 'text-stone-300 hover:bg-stone-800/80 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 truncate min-w-0">
                            <FileCode className={`w-3.5 h-3.5 shrink-0 ${isFlowActive ? 'text-amber-400' : 'text-stone-400'}`} aria-hidden="true" />
                            <span className="truncate">{f.name}</span>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase border ${group.category.bgColor} ${group.category.textColor} ${group.category.borderColor}`}
                            >
                              {group.category.badgeLabel}
                            </span>
                            {isFlowActive && <Check className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredFlows.length === 0 && (
                <div className="p-3 text-center text-stone-500 text-[11px] font-mono">
                  {t('tabs.noMatchingFlows')}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onCreateNewFlow();
                setShowDropdown(false);
              }}
              className="w-full py-1.5 bg-amber-800/80 hover:bg-amber-700 text-amber-100 font-bold text-xs rounded-[4px] border border-amber-600/80 flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>{t('tabs.createNewFlow')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
