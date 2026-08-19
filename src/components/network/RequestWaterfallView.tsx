import React, { useState } from 'react';
import {
  Download,
  Trash2,
  Search,
  Filter,
  Copy,
  Check,
  Globe,
  Clock,
} from 'lucide-react';
import { useNetworkStore } from '@/src/stores/networkStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import type { CapturedRequestEntry } from '@/src/types/network';

export const RequestWaterfallView: React.FC = () => {
  const { t } = useTranslation();

  const requests = useNetworkStore((s) => s.requests);
  const filterText = useNetworkStore((s) => s.filterText);
  const setFilterText = useNetworkStore((s) => s.setFilterText);
  const selectedMethod = useNetworkStore((s) => s.selectedMethod);
  const setSelectedMethod = useNetworkStore((s) => s.setSelectedMethod);
  const selectedRequestId = useNetworkStore((s) => s.selectedRequestId);
  const setSelectedRequest = useNetworkStore((s) => s.setSelectedRequest);
  const clearRequests = useNetworkStore((s) => s.clearRequests);
  const exportHar = useNetworkStore((s) => s.exportHar);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  // Filter requests by text search and selected HTTP method
  const filteredRequests = requests.filter((req) => {
    if (selectedMethod !== 'ALL' && req.method.toUpperCase() !== selectedMethod) {
      return false;
    }
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      const matchUrl = req.url.toLowerCase().includes(q);
      const matchStatus = String(req.status || '').includes(q);
      const matchMethod = req.method.toLowerCase().includes(q);
      if (!matchUrl && !matchStatus && !matchMethod) {
        return false;
      }
    }
    return true;
  });

  const selectedRequest: CapturedRequestEntry | undefined = requests.find(
    (r) => r.id === selectedRequestId
  );

  const maxDuration = Math.max(1, ...requests.map((r) => r.durationMs || 0));

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleExport = async () => {
    const harContent = await exportHar();
    if (!harContent) return;
    const blob = new Blob([harContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-traffic-${new Date().toISOString().replace(/[:.]/g, '-')}.har`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-stone-400 bg-stone-800/60 border-stone-700';
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80';
    if (status >= 300 && status < 400) return 'text-amber-400 bg-amber-950/60 border-amber-800/80';
    return 'text-rose-400 bg-rose-950/60 border-rose-800/80';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-sky-400 bg-sky-950/50 border-sky-800/60';
      case 'POST': return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60';
      case 'PUT': return 'text-amber-400 bg-amber-950/50 border-amber-800/60';
      case 'DELETE': return 'text-rose-400 bg-rose-950/50 border-rose-800/60';
      default: return 'text-stone-300 bg-stone-800/60 border-stone-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 font-sans text-xs overflow-hidden">
      {/* Search & Filter Toolbar */}
      <div className="p-3 border-b border-stone-800 bg-stone-900/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500" aria-hidden="true" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t('network.filterPlaceholder')}
              className="w-full bg-stone-950 border border-stone-800 rounded pl-8 pr-3 py-1 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Method Filter Pills */}
          <div className="hidden sm:flex items-center space-x-1">
            <Filter className="w-3 h-3 text-stone-500 mr-1" aria-hidden="true" />
            {methods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMethod(m)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  selectedMethod === m
                    ? 'bg-amber-700 text-amber-50 border border-amber-600'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-transparent'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={requests.length === 0}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 rounded font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('network.exportHar')}</span>
          </button>
          <button
            type="button"
            onClick={clearRequests}
            disabled={requests.length === 0}
            className="px-2.5 py-1 bg-stone-800 hover:bg-rose-900/60 text-stone-300 hover:text-rose-200 disabled:opacity-50 rounded font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('network.clearRequests')}</span>
          </button>
        </div>
      </div>

      {/* Split Traffic Pane: Table (Left) + Detail Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Request Waterfall Table */}
        <div className={`flex-1 flex flex-col overflow-hidden ${selectedRequest ? 'border-r border-stone-800' : ''}`}>
          {filteredRequests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500">
              <Globe className="w-10 h-10 stroke-1 mb-2 opacity-50" aria-hidden="true" />
              <p className="font-semibold text-stone-400">{t('network.noRequests')}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-stone-900/80 text-[10px] text-stone-400 uppercase font-mono sticky top-0 z-10 border-b border-stone-800">
                  <tr>
                    <th className="p-2 w-16">{t('network.status')}</th>
                    <th className="p-2 w-16">{t('network.method')}</th>
                    <th className="p-2">{t('network.url')}</th>
                    <th className="p-2 w-28 text-right">{t('matrix.duration')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-900/80 font-mono text-[11px]">
                  {filteredRequests.map((req) => {
                    const isSelected = req.id === selectedRequestId;
                    const durationRatio = Math.min(1, (req.durationMs || 1) / maxDuration);

                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-950/60 text-amber-200'
                            : 'hover:bg-stone-900/60 text-stone-300'
                        }`}
                      >
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(req.status)}`}>
                            {req.status || '---'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getMethodColor(req.method)}`}>
                            {req.method}
                          </span>
                        </td>
                        <td className="p-2 max-w-xs truncate" title={req.url}>
                          <div className="flex items-center space-x-1.5 truncate">
                            {(req.mocked || req.response?.fromMock) && (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800 shrink-0">
                                {t('network.fromMock') || 'MOCK'}
                              </span>
                            )}
                            <span className="truncate">{req.url}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <span className="text-[10px] text-stone-400">{req.durationMs ? `${Math.round(req.durationMs)}ms` : '-'}</span>
                            <div className="w-12 bg-stone-900 h-1.5 rounded overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded"
                                style={{ width: `${Math.max(8, durationRatio * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Selected Request Detail Inspector */}
        {selectedRequest && (
          <div className="w-80 sm:w-96 flex flex-col bg-stone-950 overflow-hidden shrink-0">
            {/* Detail Header */}
            <div className="p-3 border-b border-stone-800 bg-stone-900 flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getMethodColor(selectedRequest.method)}`}>
                  {selectedRequest.method}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status || '---'}
                </span>
                {(selectedRequest.mocked || selectedRequest.response?.fromMock) && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                    {t('network.mockBadge')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-stone-400 hover:text-stone-200 text-xs px-2 py-0.5 rounded hover:bg-stone-800"
              >
                {t('common.close')}
              </button>
            </div>

            {/* Detail Tabs / Body Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 font-mono text-xs">
              {/* General URL Info */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-stone-400 font-sans flex items-center space-x-1">
                  <Globe className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  <span>{t('network.general')}</span>
                </div>
                <div className="p-2 bg-stone-900 rounded border border-stone-800 text-[11px] break-all select-all">
                  {selectedRequest.url}
                </div>
                {selectedRequest.durationMs !== undefined && (
                  <div className="text-stone-400 text-[10px] flex items-center space-x-1 pt-1 font-sans">
                    <Clock className="w-3 h-3 text-stone-500" aria-hidden="true" />
                    <span>{t('network.timing', { duration: Math.round(selectedRequest.durationMs) })}</span>
                  </div>
                )}
              </div>

              {/* Request Headers */}
              {selectedRequest.requestHeaders && Object.keys(selectedRequest.requestHeaders).length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] uppercase font-bold text-stone-400">{t('network.requestHeaders')}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(selectedRequest.requestHeaders, null, 2), 'req-headers')}
                      className="text-stone-400 hover:text-stone-200 text-[10px] flex items-center space-x-1"
                    >
                      {copiedSection === 'req-headers' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'req-headers' ? t('common.copied') : t('common.copy')}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-stone-900 rounded border border-stone-800 text-[10px] space-y-1 max-h-36 overflow-y-auto">
                    {Object.entries(selectedRequest.requestHeaders).map(([k, v]) => (
                      <div key={k} className="flex space-x-2">
                        <span className="text-amber-400 font-semibold shrink-0">{k}:</span>
                        <span className="text-stone-300 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Body Payload */}
              {selectedRequest.requestBody && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] uppercase font-bold text-stone-400">{t('network.requestPayload')}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedRequest.requestBody || '', 'req-body')}
                      className="text-stone-400 hover:text-stone-200 text-[10px] flex items-center space-x-1"
                    >
                      {copiedSection === 'req-body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'req-body' ? t('common.copied') : t('common.copy')}</span>
                    </button>
                  </div>
                  <pre className="p-2 bg-stone-900 rounded border border-stone-800 text-[10px] overflow-x-auto text-stone-200 whitespace-pre-wrap max-h-40">
                    {selectedRequest.requestBody}
                  </pre>
                </div>
              )}

              {/* Response Headers */}
              {selectedRequest.responseHeaders && Object.keys(selectedRequest.responseHeaders).length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] uppercase font-bold text-stone-400">{t('network.responseHeaders')}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(selectedRequest.responseHeaders, null, 2), 'res-headers')}
                      className="text-stone-400 hover:text-stone-200 text-[10px] flex items-center space-x-1"
                    >
                      {copiedSection === 'res-headers' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'res-headers' ? t('common.copied') : t('common.copy')}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-stone-900 rounded border border-stone-800 text-[10px] space-y-1 max-h-36 overflow-y-auto">
                    {Object.entries(selectedRequest.responseHeaders).map(([k, v]) => (
                      <div key={k} className="flex space-x-2">
                        <span className="text-amber-400 font-semibold shrink-0">{k}:</span>
                        <span className="text-stone-300 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Body Payload */}
              {selectedRequest.responseBody !== undefined && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] uppercase font-bold text-stone-400">{t('network.responseBody')}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedRequest.responseBody || '', 'res-body')}
                      className="text-stone-400 hover:text-stone-200 text-[10px] flex items-center space-x-1"
                    >
                      {copiedSection === 'res-body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'res-body' ? t('common.copied') : t('common.copy')}</span>
                    </button>
                  </div>
                  <pre className="p-2 bg-stone-900 rounded border border-stone-800 text-[10px] overflow-x-auto text-emerald-300 whitespace-pre-wrap max-h-52">
                    {selectedRequest.responseBody}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
