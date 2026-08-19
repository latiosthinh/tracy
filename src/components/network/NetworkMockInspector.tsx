import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Edit,
  Power,
  Upload,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useNetworkStore } from '@/src/stores/networkStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { MockRuleEditorModal } from '@/src/components/network/MockRuleEditorModal';
import { RequestWaterfallView } from '@/src/components/network/RequestWaterfallView';
import type { NetworkMockRule } from '@/src/types/network';

export const NetworkMockInspector: React.FC = () => {
  const { t } = useTranslation();

  const rules = useNetworkStore((s) => s.rules);
  const addRule = useNetworkStore((s) => s.addRule);
  const updateRule = useNetworkStore((s) => s.updateRule);
  const toggleRule = useNetworkStore((s) => s.toggleRule);
  const removeRule = useNetworkStore((s) => s.removeRule);
  const isInterceptionActive = useNetworkStore((s) => s.isInterceptionActive);
  const setInterceptionActive = useNetworkStore((s) => s.setInterceptionActive);
  const importHar = useNetworkStore((s) => s.importHar);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NetworkMockRule | null>(null);
  const [harImportError, setHarImportError] = useState<string | null>(null);

  const handleOpenNewRule = () => {
    setEditingRule(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditRule = (rule: NetworkMockRule) => {
    setEditingRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = (ruleInput: Omit<NetworkMockRule, 'id'>) => {
    if (editingRule && editingRule.id) {
      updateRule(editingRule.id, ruleInput);
    } else {
      addRule(ruleInput);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setHarImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await importHar(text);
      if (!success) {
        setHarImportError(t('network.harImportFailed') || 'Failed to import HAR: invalid format or empty entries.');
      }
    } catch (err: any) {
      setHarImportError(err.message || 'Error reading HAR file.');
    }

    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 font-sans text-xs overflow-hidden">
      {/* Top Header Controls */}
      <div className="p-3 border-b border-stone-800 bg-stone-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-stone-100 text-sm">{t('network.title')}</h2>
              <p className="text-[11px] text-stone-400 hidden sm:block">{t('network.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Global Master Switch & Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Active Interception Master Switch */}
          <button
            type="button"
            onClick={() => setInterceptionActive(!isInterceptionActive)}
            className={`px-3 py-1.5 rounded-[6px] font-bold text-xs flex items-center space-x-1.5 border transition-all cursor-pointer ${
              isInterceptionActive
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Power className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isInterceptionActive ? t('network.activeInterception') : t('common.disabled') || 'Disabled'}</span>
          </button>

          {/* Import HAR */}
          <label className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-[6px] font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-stone-700">
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('network.importHar')}</span>
            <input
              type="file"
              accept=".har,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Add Mock Rule Button */}
          <button
            type="button"
            onClick={handleOpenNewRule}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 rounded-[6px] font-bold text-xs flex items-center space-x-1.5 border border-amber-600 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('network.addRule')}</span>
          </button>
        </div>
      </div>

      {harImportError && (
        <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800 flex items-center space-x-2 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
          <span>{harImportError}</span>
        </div>
      )}

      {/* Upper Pane: Active Mock Rules Table */}
      <div className="max-h-48 overflow-y-auto border-b border-stone-800 bg-stone-900/60 shrink-0">
        <div className="px-3 py-2 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-stone-300 uppercase text-[10px] tracking-wider font-mono">
              {t('network.rules')}
            </span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 font-mono">
              {rules.length}
            </span>
          </div>
        </div>

        {rules.length === 0 ? (
          <div className="p-4 text-center text-stone-500 font-sans">
            <p>{t('network.noRules')}</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="text-[10px] text-stone-400 uppercase font-mono bg-stone-950/80 sticky top-0 border-b border-stone-800">
              <tr>
                <th className="p-2 w-12 text-center">{t('network.enabled')}</th>
                <th className="p-2">{t('network.ruleName')}</th>
                <th className="p-2">{t('network.urlPattern')}</th>
                <th className="p-2 w-16">{t('network.method')}</th>
                <th className="p-2 w-20">{t('network.action')}</th>
                <th className="p-2 w-20 text-right">{t('network.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
              {rules.map((rule) => {
                const ruleId = rule.id || '';
                return (
                  <tr key={ruleId} className="hover:bg-stone-800/40 text-stone-300 transition-colors">
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRule(ruleId)}
                        className="accent-amber-500 rounded cursor-pointer"
                        aria-label={`${t('network.enabled')} ${rule.name}`}
                      />
                    </td>
                    <td className="p-2 font-sans font-semibold text-stone-200 truncate max-w-xs">{rule.name}</td>
                    <td className="p-2 truncate max-w-sm text-stone-400">
                      <span className="text-amber-400 mr-1">[{rule.patternType || 'glob'}]</span>
                      <span>{rule.url}</span>
                    </td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-stone-300">
                        {rule.method || 'ALL'}
                      </span>
                    </td>
                    <td className="p-2">
                      {rule.abort ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          {t('network.abortBadge')}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1 w-fit">
                          <Zap className="w-2.5 h-2.5" />
                          <span>{rule.status || 200}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end space-x-1 font-sans">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRule(rule)}
                          className="p-1 text-stone-400 hover:text-amber-400 rounded transition-colors"
                          aria-label={t('common.edit')}
                        >
                          <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRule(ruleId)}
                          className="p-1 text-stone-400 hover:text-rose-400 rounded transition-colors"
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Lower Pane: Live Captured Traffic Waterfall */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <RequestWaterfallView />
      </div>

      {/* Mock Rule Editor Modal */}
      <MockRuleEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveRule}
        initialRule={editingRule}
      />
    </div>
  );
};
