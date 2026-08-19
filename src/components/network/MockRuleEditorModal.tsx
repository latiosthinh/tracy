import React, { useState, useEffect } from 'react';
import { X, Globe, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { NetworkMockRule } from '@/src/types/network';
import { useTranslation } from '@/src/hooks/useTranslation';

interface MockRuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Omit<NetworkMockRule, 'id'>) => void;
  initialRule?: NetworkMockRule | null;
}

export const MockRuleEditorModal: React.FC<MockRuleEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRule,
}) => {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [patternType, setPatternType] = useState<'exact' | 'glob' | 'regex'>('glob');
  const [method, setMethod] = useState<'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('ALL');
  const [actionType, setActionType] = useState<'fulfill' | 'abort'>('fulfill');
  const [status, setStatus] = useState(200);
  const [contentType, setContentType] = useState('application/json');
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [body, setBody] = useState('');
  const [delayMs, setDelayMs] = useState(0);
  const [abortReason, setAbortReason] = useState<'failed' | 'timedout' | 'connectionreset' | 'accessdenied' | 'blockedbyclient'>('failed');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name || '');
      setUrl(initialRule.url || '');
      setPatternType(initialRule.patternType || 'glob');
      setMethod((initialRule.method as any) || 'ALL');
      setActionType(initialRule.abort ? 'abort' : 'fulfill');
      setStatus(initialRule.status || 200);
      setDelayMs(initialRule.delayMs || 0);
      setAbortReason((initialRule.abortReason as any) || 'failed');
      setBody(typeof initialRule.body === 'object' ? JSON.stringify(initialRule.body, null, 2) : String(initialRule.body || ''));

      if (initialRule.headers) {
        const headerList = Object.entries(initialRule.headers).map(([k, v]) => ({ key: k, value: v }));
        setHeaders(headerList);
        const ct = initialRule.headers['content-type'] || initialRule.headers['Content-Type'];
        if (ct) setContentType(ct);
      } else {
        setHeaders([]);
      }
    } else {
      setName('');
      setUrl('');
      setPatternType('glob');
      setMethod('ALL');
      setActionType('fulfill');
      setStatus(200);
      setContentType('application/json');
      setHeaders([]);
      setBody('');
      setDelayMs(0);
      setAbortReason('failed');
    }
    setErrorMessage(null);
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleUpdateHeader = (index: number, key: string, value: string) => {
    const next = [...headers];
    next[index] = { key, value };
    setHeaders(next);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage(t('network.ruleNameRequired') || 'Rule name is required.');
      return;
    }

    if (!url.trim()) {
      setErrorMessage(t('network.urlPatternRequired') || 'URL pattern is required.');
      return;
    }

    // Validate regex pattern to mitigate ReDoS & syntax crashes
    if (patternType === 'regex') {
      try {
        new RegExp(url);
      } catch (err: any) {
        setErrorMessage(t('network.invalidRegexPattern') || `Invalid regular expression pattern: ${err.message}`);
        return;
      }
    }

    // Validate status code range
    if (actionType === 'fulfill') {
      const statusNum = Number(status);
      if (isNaN(statusNum) || statusNum < 100 || statusNum > 599) {
        setErrorMessage(t('network.invalidStatusCode') || 'Status code must be between 100 and 599.');
        return;
      }
    }

    const headerRecord: Record<string, string> = {};
    if (actionType === 'fulfill' && contentType) {
      headerRecord['content-type'] = contentType;
    }
    for (const h of headers) {
      if (h.key.trim()) {
        headerRecord[h.key.trim().toLowerCase()] = h.value;
      }
    }

    const ruleData: Omit<NetworkMockRule, 'id'> = {
      name: name.trim(),
      url: url.trim(),
      patternType,
      method,
      enabled: initialRule ? initialRule.enabled : true,
      abort: actionType === 'abort',
      abortReason: actionType === 'abort' ? abortReason : undefined,
      status: actionType === 'fulfill' ? Number(status) : undefined,
      headers: actionType === 'fulfill' ? headerRecord : undefined,
      body: actionType === 'fulfill' ? body : undefined,
      delayMs: actionType === 'fulfill' && delayMs > 0 ? Number(delayMs) : undefined,
    };

    onSave(ruleData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-stone-900 border border-stone-800 rounded-lg max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden font-sans text-stone-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <h3 id="modal-title" className="font-bold text-stone-100 text-sm">
              {initialRule ? t('network.editRule') || 'Edit Mock Rule' : t('network.addRule') || 'Add Mock Rule'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-stone-400 hover:text-stone-100 p-1 rounded hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded flex items-center space-x-2 text-rose-300 text-xs" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Rule Name & Pattern Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="rule-name" className="block text-stone-300 font-semibold">{t('network.ruleName')}</label>
              <input
                id="rule-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('network.ruleNamePlaceholder')}
                className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pattern-type" className="block text-stone-300 font-semibold">{t('network.patternType')}</label>
              <select
                id="pattern-type"
                value={patternType}
                onChange={(e) => setPatternType(e.target.value as any)}
                className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 focus:border-amber-500 focus:outline-hidden font-mono"
              >
                <option value="glob">Glob (*)</option>
                <option value="exact">Exact (===)</option>
                <option value="regex">Regex (/^.../)</option>
              </select>
            </div>
          </div>

          {/* URL Pattern & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3 space-y-1">
              <label htmlFor="url-pattern" className="block text-stone-300 font-semibold">{t('network.urlPattern')}</label>
              <input
                id="url-pattern"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="**/api/v1/*"
                className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-hidden font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="http-method" className="block text-stone-300 font-semibold">{t('network.method')}</label>
              <select
                id="http-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 focus:border-amber-500 focus:outline-hidden font-mono"
              >
                <option value="ALL">ALL</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>

          {/* Action Choice: Fulfill vs Abort */}
          <div className="space-y-1.5 pt-2 border-t border-stone-800">
            <span className="block text-stone-300 font-semibold">{t('network.actionType') || 'Action'}</span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="actionType"
                  value="fulfill"
                  checked={actionType === 'fulfill'}
                  onChange={() => setActionType('fulfill')}
                  className="accent-amber-500"
                />
                <span className="font-semibold text-stone-200">{t('network.fulfillResponse')}</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="actionType"
                  value="abort"
                  checked={actionType === 'abort'}
                  onChange={() => setActionType('abort')}
                  className="accent-rose-500"
                />
                <span className="font-semibold text-rose-300">{t('network.abortRequest')}</span>
              </label>
            </div>
          </div>

          {actionType === 'abort' ? (
            /* Abort configuration */
            <div className="p-3 bg-stone-950 border border-stone-800 rounded space-y-2">
              <label htmlFor="abort-reason" className="block text-stone-300 font-semibold">{t('network.abortReason')}</label>
              <select
                id="abort-reason"
                value={abortReason}
                onChange={(e) => setAbortReason(e.target.value as any)}
                className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-stone-100 font-mono"
              >
                <option value="failed">{t('network.abortReasonFailed')}</option>
                <option value="timedout">{t('network.abortReasonTimedout')}</option>
                <option value="connectionreset">{t('network.abortReasonConnectionreset')}</option>
                <option value="accessdenied">{t('network.abortReasonAccessdenied')}</option>
                <option value="blockedbyclient">{t('network.abortReasonBlockedbyclient')}</option>
              </select>
            </div>
          ) : (
            /* Fulfill response configuration */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="status-code" className="block text-stone-300 font-semibold">{t('network.statusCode')}</label>
                  <input
                    id="status-code"
                    type="number"
                    min="100"
                    max="599"
                    value={status}
                    onChange={(e) => setStatus(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="content-type" className="block text-stone-300 font-semibold">{t('network.contentType')}</label>
                  <input
                    id="content-type"
                    type="text"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    placeholder={t('network.contentTypePlaceholder')}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="delay-ms" className="block text-stone-300 font-semibold">{t('network.delayMs')}</label>
                  <input
                    id="delay-ms"
                    type="number"
                    min="0"
                    max="60000"
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 font-mono"
                  />
                </div>
              </div>

              {/* Custom Headers Key-Value */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-300">{t('network.headers')}</span>
                  <button
                    type="button"
                    onClick={handleAddHeader}
                    className="text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('network.addHeader')}</span>
                  </button>
                </div>

                {headers.map((h, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder={t('network.headerNamePlaceholder')}
                      value={h.key}
                      onChange={(e) => handleUpdateHeader(i, e.target.value, h.value)}
                      className="flex-1 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100 font-mono text-xs"
                    />
                    <input
                      type="text"
                      placeholder={t('network.headerValuePlaceholder')}
                      value={h.value}
                      onChange={(e) => handleUpdateHeader(i, h.key, e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(i)}
                      className="p-1 text-stone-500 hover:text-rose-400"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Response Body Textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="response-body" className="block text-stone-300 font-semibold">{t('network.responseBody')}</label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(body);
                        setBody(JSON.stringify(parsed, null, 2));
                      } catch {
                        // Keep text as-is
                      }
                    }}
                    className="text-stone-400 hover:text-stone-200 text-[11px] font-mono"
                  >
                    {t('network.formatJson')}
                  </button>
                </div>
                <textarea
                  id="response-body"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="{}"
                  className="w-full bg-stone-950 border border-stone-800 rounded p-2.5 text-stone-100 font-mono text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-semibold text-xs transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 rounded font-bold text-xs transition-colors cursor-pointer"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
