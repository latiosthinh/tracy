import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BrowserContext, Route, Request } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { NetworkMockManager } from './networkMockManager';
import type { NetworkMockRule } from './types';

describe('NetworkMockManager', () => {
  let manager: NetworkMockManager;
  let mockContext: BrowserContext;
  let routedHandler: ((route: Route, request: Request) => Promise<void>) | null = null;
  let tempDir: string;

  const createMockRequest = (options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    postData?: string;
    resourceType?: string;
  }): Request => {
    return {
      url: () => options.url,
      method: () => options.method || 'GET',
      headers: () => options.headers || {},
      postData: () => options.postData ?? null,
      resourceType: () => options.resourceType || 'fetch',
    } as unknown as Request;
  };

  const createMockRoute = (): {
    route: Route;
    fulfillCalls: any[];
    abortCalls: any[];
    fallbackCalls: number;
  } => {
    const fulfillCalls: any[] = [];
    const abortCalls: any[] = [];
    let fallbackCalls = 0;

    const route = {
      fulfill: vi.fn(async (params) => {
        fulfillCalls.push(params);
      }),
      abort: vi.fn(async (errorCode) => {
        abortCalls.push(errorCode);
      }),
      fallback: vi.fn(async () => {
        fallbackCalls++;
      }),
    } as unknown as Route;

    return { route, fulfillCalls, abortCalls, fallbackCalls };
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tracy-mock-test-'));
    manager = new NetworkMockManager({ workspaceRoot: tempDir });
    routedHandler = null;

    mockContext = {
      route: vi.fn(async (_pattern, handler) => {
        routedHandler = handler;
      }),
      unrouteAll: vi.fn(async () => {}),
      routeFromHAR: vi.fn(async () => {}),
    } as unknown as BrowserContext;
  });

  afterEach(async () => {
    await manager.cleanup();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('attaches to Playwright BrowserContext with wildcard routing', async () => {
    await manager.attachToContext(mockContext);
    expect(mockContext.route).toHaveBeenCalledWith('**/*', expect.any(Function));
    expect(routedHandler).toBeDefined();
  });

  it('matches URL exact string, glob, and regex patterns with HTTP methods', () => {
    const exactRule: NetworkMockRule = { url: 'https://api.example.com/users', method: 'GET' };
    expect(manager.matchesRule(exactRule, 'https://api.example.com/users', 'GET')).toBe(true);
    expect(manager.matchesRule(exactRule, 'https://api.example.com/users', 'POST')).toBe(false);

    const globRule: NetworkMockRule = { url: '**/api/v1/**', method: 'ALL' };
    expect(manager.matchesRule(globRule, 'https://example.com/api/v1/items/123', 'DELETE')).toBe(true);
    expect(manager.matchesRule(globRule, 'https://example.com/api/v2/items', 'GET')).toBe(false);

    const regexRule: NetworkMockRule = { url: '/https?:\\/\\/api\\.example\\.com\\/users\\/\\d+/i', method: 'GET' };
    expect(manager.matchesRule(regexRule, 'http://api.example.com/users/42', 'GET')).toBe(true);
    expect(manager.matchesRule(regexRule, 'https://api.example.com/users/abc', 'GET')).toBe(false);
  });

  it('fulfills matching requests with JSON payload, status code, and headers', async () => {
    await manager.attachToContext(mockContext);

    manager.addRule({
      url: '**/api/users',
      method: 'GET',
      status: 201,
      headers: { 'x-custom': 'mocked' },
      body: { id: 1, name: 'Alice' },
    });

    const req = createMockRequest({ url: 'https://api.example.com/api/users', method: 'GET' });
    const { route, fulfillCalls } = createMockRoute();

    await routedHandler!(route, req);

    expect(fulfillCalls.length).toBe(1);
    expect(fulfillCalls[0].status).toBe(201);
    expect(fulfillCalls[0].headers['x-custom']).toBe('mocked');
    expect(fulfillCalls[0].headers['content-type']).toBe('application/json');
    expect(JSON.parse(fulfillCalls[0].body)).toEqual({ id: 1, name: 'Alice' });

    const captured = manager.getCapturedRequests();
    expect(captured.length).toBe(1);
    expect(captured[0].response?.fromMock).toBe(true);
    expect(captured[0].response?.status).toBe(201);
  });

  it('fulfills matching requests from external fixture file with safe workspace path resolution', async () => {
    const fixturePath = path.join(tempDir, 'fixture.json');
    await fs.writeFile(fixturePath, JSON.stringify({ fixtureData: 'sample' }), 'utf-8');

    await manager.attachToContext(mockContext);

    manager.addRule({
      url: '**/api/data',
      fixture: 'fixture.json',
    });

    const req = createMockRequest({ url: 'https://example.com/api/data', method: 'GET' });
    const { route, fulfillCalls } = createMockRoute();

    await routedHandler!(route, req);

    expect(fulfillCalls.length).toBe(1);
    expect(fulfillCalls[0].headers['content-type']).toBe('application/json');
    expect(JSON.parse(fulfillCalls[0].body.toString())).toEqual({ fixtureData: 'sample' });
  });

  it('aborts matching requests with specified abort error code', async () => {
    await manager.attachToContext(mockContext);

    manager.addRule({
      url: '**/api/error',
      abort: 'connectionreset',
    });

    const req = createMockRequest({ url: 'https://example.com/api/error', method: 'GET' });
    const { route, abortCalls } = createMockRoute();

    await routedHandler!(route, req);

    expect(abortCalls).toEqual(['connectionreset']);
    const captured = manager.getCapturedRequests();
    expect(captured[0].response?.body).toBe('Aborted: connectionreset');
  });

  it('applies synthetic latency delayMs before fulfilling response', async () => {
    await manager.attachToContext(mockContext);

    manager.addRule({
      url: '**/api/delayed',
      delayMs: 50,
      body: { ok: true },
    });

    const req = createMockRequest({ url: 'https://example.com/api/delayed', method: 'GET' });
    const { route, fulfillCalls } = createMockRoute();

    const start = Date.now();
    await routedHandler!(route, req);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(fulfillCalls.length).toBe(1);
  });

  it('respects times option and falls back when allowance is exceeded', async () => {
    await manager.attachToContext(mockContext);

    manager.addRule({
      url: '**/api/single',
      times: 1,
      body: { count: 1 },
    });

    const req = createMockRequest({ url: 'https://example.com/api/single', method: 'GET' });

    // First call: matches and fulfills
    const mock1 = createMockRoute();
    await routedHandler!(mock1.route, req);
    expect(mock1.fulfillCalls.length).toBe(1);

    // Second call: allowance exceeded -> fallbacks
    const mock2 = createMockRoute();
    await routedHandler!(mock2.route, req);
    expect(mock2.fulfillCalls.length).toBe(0);
    expect(mock2.route.fallback).toHaveBeenCalled();
  });

  it('attaches HAR replay with fallback behavior', async () => {
    const harPath = path.join(tempDir, 'test.har');
    await fs.writeFile(harPath, '{}', 'utf-8');

    await manager.attachHarReplay(mockContext, harPath, {
      notFound: 'fallback',
      url: '**/api/**',
    });

    expect(mockContext.routeFromHAR).toHaveBeenCalledWith(
      path.resolve(tempDir, 'test.har'),
      { notFound: 'fallback', url: '**/api/**', update: false }
    );
  });

  it('asserts captured requests accurately across method, query params, count, and body', async () => {
    await manager.attachToContext(mockContext);

    // Passthrough request without mock rule
    const req1 = createMockRequest({
      url: 'https://example.com/api/items?category=books&page=1',
      method: 'POST',
      postData: JSON.stringify({ title: 'Tracy Book', price: 29.99 }),
    });
    const mock1 = createMockRoute();
    await routedHandler!(mock1.route, req1);

    // Assert exact count and URL
    const res1 = manager.assertRequest({
      url: '**/api/items',
      method: 'POST',
      count: 1,
    });
    expect(res1.matched).toBe(true);
    expect(res1.count).toBe(1);

    // Assert query params
    const res2 = manager.assertRequest({
      url: '**/api/items',
      queryParams: { category: 'books', page: '1' },
    });
    expect(res2.matched).toBe(true);

    // Assert mismatch query params
    const res3 = manager.assertRequest({
      url: '**/api/items',
      queryParams: { category: 'electronics' },
    });
    expect(res3.matched).toBe(false);

    // Assert JSON body pattern
    const res4 = manager.assertRequest({
      url: '**/api/items',
      bodyPattern: { title: 'Tracy Book' },
    });
    expect(res4.matched).toBe(true);

    // Assert mismatch body pattern
    const res5 = manager.assertRequest({
      url: '**/api/items',
      bodyPattern: { title: 'Wrong Book' },
    });
    expect(res5.matched).toBe(false);
  });

  it('cleans up routes and captured request history completely preventing leakage', async () => {
    await manager.attachToContext(mockContext);

    manager.addRule({ url: '**/test', body: 'hi' });
    expect(manager.getRules().length).toBe(1);

    await manager.cleanup();

    expect(mockContext.unrouteAll).toHaveBeenCalledWith({ behavior: 'ignoreErrors' });
    expect(manager.getRules().length).toBe(0);
    expect(manager.getCapturedRequests().length).toBe(0);
  });
});
