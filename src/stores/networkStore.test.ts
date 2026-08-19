import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNetworkStore, queueIncomingRequest, resetBatchBuffer } from './networkStore';
import type { CapturedRequestEntry } from '@/src/types/network';

describe('useNetworkStore', () => {
  beforeEach(() => {
    resetBatchBuffer();
    useNetworkStore.setState({
      rules: [],
      requests: [],
      isInterceptionActive: true,
      filterText: '',
      selectedMethod: 'ALL',
      selectedRuleId: null,
      selectedRequestId: null,
      isHarModalOpen: false,
    });
    vi.useRealTimers();
  });

  it('adds, updates, toggles, and removes mock rules', () => {
    const store = useNetworkStore.getState();
    const id = store.addRule({
      name: 'Mock Users API',
      url: '**/api/users',
      method: 'GET',
      status: 200,
      body: [{ id: 1, name: 'Alice' }],
    });

    expect(useNetworkStore.getState().rules).toHaveLength(1);
    const rule = useNetworkStore.getState().rules[0];
    expect(rule.id).toBe(id);
    expect(rule.enabled).toBe(true);
    expect(rule.patternType).toBe('glob');

    // Update rule
    useNetworkStore.getState().updateRule(id, { status: 201, name: 'Updated Users API' });
    expect(useNetworkStore.getState().rules[0].status).toBe(201);
    expect(useNetworkStore.getState().rules[0].name).toBe('Updated Users API');

    // Toggle rule
    useNetworkStore.getState().toggleRule(id, false);
    expect(useNetworkStore.getState().rules[0].enabled).toBe(false);
    useNetworkStore.getState().toggleRule(id);
    expect(useNetworkStore.getState().rules[0].enabled).toBe(true);

    // Remove rule
    useNetworkStore.getState().setSelectedRule(id);
    expect(useNetworkStore.getState().selectedRuleId).toBe(id);
    useNetworkStore.getState().removeRule(id);
    expect(useNetworkStore.getState().rules).toHaveLength(0);
    expect(useNetworkStore.getState().selectedRuleId).toBeNull();
  });

  it('ingests captured requests and respects 1000-entry ring buffer limit', () => {
    const initialBatch: CapturedRequestEntry[] = Array.from({ length: 900 }, (_, i) => ({
      id: `req_${i}`,
      timestamp: Date.now() + i,
      method: 'GET',
      url: `https://example.com/api/item/${i}`,
      status: 200,
      durationMs: 15,
    }));

    useNetworkStore.getState().ingestCapturedRequests(initialBatch);
    expect(useNetworkStore.getState().requests).toHaveLength(900);

    const overflowBatch: CapturedRequestEntry[] = Array.from({ length: 200 }, (_, i) => ({
      id: `overflow_${i}`,
      timestamp: Date.now() + 1000 + i,
      method: 'POST',
      url: `https://example.com/api/post/${i}`,
      status: 201,
      durationMs: 20,
    }));

    useNetworkStore.getState().ingestCapturedRequests(overflowBatch);
    // Total should cap at 1000 items, discarding oldest 100
    expect(useNetworkStore.getState().requests).toHaveLength(1000);
    expect(useNetworkStore.getState().requests[0].id).toBe('req_100');
    expect(useNetworkStore.getState().requests[999].id).toBe('overflow_199');
  });

  it('clears requests and resets selection', () => {
    useNetworkStore.getState().ingestCapturedRequests([
      { id: 'req_1', timestamp: 12345, method: 'GET', url: 'https://example.com' },
    ]);
    useNetworkStore.getState().setSelectedRequest('req_1');
    expect(useNetworkStore.getState().requests).toHaveLength(1);
    expect(useNetworkStore.getState().selectedRequestId).toBe('req_1');

    useNetworkStore.getState().clearRequests();
    expect(useNetworkStore.getState().requests).toHaveLength(0);
    expect(useNetworkStore.getState().selectedRequestId).toBeNull();
  });

  it('flushes debounced queueIncomingRequest batch after 100ms', () => {
    vi.useFakeTimers();

    queueIncomingRequest(
      { id: 'batch_1', timestamp: 1, method: 'GET', url: 'http://localhost/1' },
      useNetworkStore.getState,
      useNetworkStore.setState
    );
    queueIncomingRequest(
      { id: 'batch_2', timestamp: 2, method: 'POST', url: 'http://localhost/2' },
      useNetworkStore.getState,
      useNetworkStore.setState
    );

    // Before timer advances
    expect(useNetworkStore.getState().requests).toHaveLength(0);

    // Advance 100ms
    vi.advanceTimersByTime(100);

    expect(useNetworkStore.getState().requests).toHaveLength(2);
    expect(useNetworkStore.getState().requests[0].id).toBe('batch_1');
    expect(useNetworkStore.getState().requests[1].id).toBe('batch_2');
  });

  it('exports and imports HAR archives correctly', async () => {
    useNetworkStore.getState().ingestCapturedRequests([
      {
        id: 'har_sample_1',
        timestamp: 1700000000000,
        method: 'GET',
        url: 'https://api.example.com/v1/data',
        status: 200,
        durationMs: 45,
        responseHeaders: { 'content-type': 'application/json' },
        responseBody: '{"ok":true}',
      },
    ]);

    const exported = await useNetworkStore.getState().exportHar();
    expect(exported).not.toBeNull();
    const parsed = JSON.parse(exported!);
    expect(parsed.log.entries).toHaveLength(1);
    expect(parsed.log.entries[0].request.url).toBe('https://api.example.com/v1/data');

    // Test import
    const imported = await useNetworkStore.getState().importHar(exported);
    expect(imported).toBe(true);
    expect(useNetworkStore.getState().rules).toHaveLength(1);
    expect(useNetworkStore.getState().rules[0].url).toBe('https://api.example.com/v1/data');
  });
});
