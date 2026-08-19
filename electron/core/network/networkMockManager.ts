import fs from 'node:fs/promises';
import path from 'node:path';
import type { BrowserContext, Route, Request } from 'playwright-core';
import type {
  NetworkMockRule,
  CapturedRequestEntry,
  NetworkManagerOptions,
  AssertRequestCriteria,
  AssertRequestResult,
  HarReplayOptions,
  AbortReason,
} from './types';

function globToRegex(pattern: string): RegExp {
  // If pattern starts with **/ or contains **, handle properly
  let p = pattern;
  let prefixAny = false;
  let suffixAny = false;

  if (p.startsWith('**/')) {
    prefixAny = true;
    p = p.slice(3);
  } else if (p.startsWith('*')) {
    prefixAny = true;
    p = p.slice(1);
  }

  if (p.endsWith('/**')) {
    suffixAny = true;
    p = p.slice(0, -3);
  } else if (p.endsWith('/*') || p.endsWith('*')) {
    suffixAny = true;
    p = p.replace(/\/\*+|\*+$/, '');
  }

  const escaped = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');

  const start = prefixAny ? '(?:.*[\\/])?' : '^';
  const end = suffixAny ? '(?:[\\/].*)?$' : '$';

  return new RegExp(`${start}${escaped}${end}`, 'i');
}

export class NetworkMockManager {
  private rules: Map<string, NetworkMockRule> = new Map();
  private matchCounters: Map<string, number> = new Map();
  private capturedRequests: CapturedRequestEntry[] = [];
  private context: BrowserContext | null = null;
  private isAttached: boolean = false;
  private workspaceRoot: string;
  private maxCapturedRequests: number;

  constructor(options?: NetworkManagerOptions) {
    this.workspaceRoot = options?.workspaceRoot ? path.resolve(options.workspaceRoot) : process.cwd();
    this.maxCapturedRequests = options?.maxCapturedRequests ?? 500;
  }

  addRule(rule: NetworkMockRule): string {
    const id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fullRule: NetworkMockRule = { ...rule, id };
    this.rules.set(id, fullRule);
    this.matchCounters.set(id, 0);
    return id;
  }

  removeRule(ruleId: string): boolean {
    this.matchCounters.delete(ruleId);
    return this.rules.delete(ruleId);
  }

  clearRules(): void {
    this.rules.clear();
    this.matchCounters.clear();
  }

  getRules(): NetworkMockRule[] {
    return Array.from(this.rules.values());
  }

  getCapturedRequests(): CapturedRequestEntry[] {
    return [...this.capturedRequests];
  }

  clearCapturedRequests(): void {
    this.capturedRequests = [];
  }

  async attachToContext(context: BrowserContext): Promise<void> {
    if (this.isAttached && this.context === context) return;
    this.context = context;
    this.isAttached = true;

    await context.route('**/*', async (route: Route, request: Request) => {
      const startTime = Date.now();
      const reqUrl = request.url();
      const reqMethod = request.method().toUpperCase();
      let reqPostData: string | undefined;
      try {
        reqPostData = request.postData() ?? undefined;
      } catch {
        // Ignore binary or unreadable postData
      }

      let matchedRule: NetworkMockRule | null = null;

      // Find first matching rule with remaining match allowance
      for (const rule of this.rules.values()) {
        if (this.matchesRule(rule, reqUrl, reqMethod)) {
          const matchedCount = this.matchCounters.get(rule.id!) || 0;
          if (rule.times === undefined || matchedCount < rule.times) {
            matchedRule = rule;
            this.matchCounters.set(rule.id!, matchedCount + 1);
            break;
          }
        }
      }

      if (!matchedRule) {
        // Record passthrough request and fallback cleanly
        this.recordRequest({
          id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          url: reqUrl,
          method: reqMethod,
          headers: request.headers(),
          postData: reqPostData,
          resourceType: request.resourceType(),
          timestamp: startTime,
        });

        try {
          await route.fallback();
        } catch {
          // Socket closed or already handled
        }
        return;
      }

      // Handle synthetic delay
      if (matchedRule.delayMs && matchedRule.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, matchedRule!.delayMs));
      }

      // Handle abort simulation
      if (matchedRule.abort) {
        const reason: AbortReason = typeof matchedRule.abort === 'string' ? matchedRule.abort : 'failed';
        this.recordRequest({
          id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          url: reqUrl,
          method: reqMethod,
          headers: request.headers(),
          postData: reqPostData,
          resourceType: request.resourceType(),
          timestamp: startTime,
          matchedRuleId: matchedRule.id,
          response: {
            status: 0,
            headers: {},
            body: `Aborted: ${reason}`,
            fromMock: true,
            durationMs: Date.now() - startTime,
          },
        });

        try {
          await route.abort(reason);
        } catch {
          // Route could already be closed
        }
        return;
      }

      // Prepare mock response
      try {
        let responseBody: string | Buffer = '';
        let contentType = matchedRule.contentType;
        const responseHeaders: Record<string, string> = { ...(matchedRule.headers || {}) };

        if (matchedRule.fixture) {
          const resolvedPath = path.isAbsolute(matchedRule.fixture)
            ? path.resolve(matchedRule.fixture)
            : path.resolve(this.workspaceRoot, matchedRule.fixture);

          // Path traversal security guard: enforce file is within workspaceRoot if relative
          const normalizedRoot = path.normalize(this.workspaceRoot);
          const normalizedTarget = path.normalize(resolvedPath);
          if (!normalizedTarget.startsWith(normalizedRoot) && !path.isAbsolute(matchedRule.fixture)) {
            throw new Error(`Fixture path traversal outside workspace forbidden: ${matchedRule.fixture}`);
          }

          const fileContent = await fs.readFile(resolvedPath);
          responseBody = fileContent;
          if (!contentType) {
            if (resolvedPath.endsWith('.json')) contentType = 'application/json';
            else if (resolvedPath.endsWith('.html')) contentType = 'text/html';
            else if (resolvedPath.endsWith('.txt')) contentType = 'text/plain';
          }
        } else if (matchedRule.body !== undefined) {
          if (typeof matchedRule.body === 'object' && matchedRule.body !== null) {
            responseBody = JSON.stringify(matchedRule.body);
            if (!contentType) contentType = 'application/json';
          } else {
            responseBody = String(matchedRule.body);
            if (!contentType) contentType = 'text/plain';
          }
        }

        if (contentType && !Object.keys(responseHeaders).some((k) => k.toLowerCase() === 'content-type')) {
          responseHeaders['content-type'] = contentType;
        }

        const status = matchedRule.status ?? 200;

        this.recordRequest({
          id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          url: reqUrl,
          method: reqMethod,
          headers: request.headers(),
          postData: reqPostData,
          resourceType: request.resourceType(),
          timestamp: startTime,
          matchedRuleId: matchedRule.id,
          response: {
            status,
            headers: responseHeaders,
            body: typeof responseBody === 'string' ? responseBody : responseBody.toString('utf-8'),
            fromMock: true,
            durationMs: Date.now() - startTime,
          },
        });

        await route.fulfill({
          status,
          headers: responseHeaders,
          body: responseBody,
        });
      } catch (err: any) {
        // Fallback safely in case of file reading or fulfillment error to prevent socket hangs
        try {
          await route.fallback();
        } catch {
          // Ignore fallback errors if connection dropped
        }
      }
    });
  }

  async attachHarReplay(
    context: BrowserContext,
    harPath: string,
    options?: HarReplayOptions
  ): Promise<void> {
    const resolvedHar = path.isAbsolute(harPath)
      ? path.resolve(harPath)
      : path.resolve(this.workspaceRoot, harPath);

    await context.routeFromHAR(resolvedHar, {
      notFound: options?.notFound ?? 'fallback',
      url: options?.url,
      update: false,
    });
  }

  matchesRule(rule: NetworkMockRule, url: string, method: string): boolean {
    if (rule.method && rule.method !== 'ALL' && rule.method.toUpperCase() !== method.toUpperCase()) {
      return false;
    }

    const pattern = rule.url.trim();
    if (!pattern || pattern === '*' || pattern === '**/*') {
      return true;
    }

    // Strip query strings or match against full URL / path
    const urlWithoutQuery = url.split('?')[0];

    if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
      // Regex literal format e.g. "/api\/v1\/.*/i"
      try {
        const lastSlash = pattern.lastIndexOf('/');
        const regexStr = pattern.slice(1, lastSlash);
        const flags = pattern.slice(lastSlash + 1);
        const regex = new RegExp(regexStr, flags);
        return regex.test(url) || regex.test(urlWithoutQuery);
      } catch {
        // On invalid regex pattern, fallback to substring/exact check
      }
    }

    if (pattern.includes('*') || pattern.includes('?')) {
      try {
        const regex = globToRegex(pattern);
        return regex.test(url) || regex.test(urlWithoutQuery);
      } catch {
        // Fallback
      }
    }

    // Exact match or substring contains
    return (
      url === pattern ||
      urlWithoutQuery === pattern ||
      url.includes(pattern) ||
      urlWithoutQuery.includes(pattern)
    );
  }

  assertRequest(criteria: AssertRequestCriteria): AssertRequestResult {
    const matchingRequests = this.capturedRequests.filter((req) => {
      // 1. Method filter
      if (criteria.method && criteria.method !== 'ALL' && req.method.toUpperCase() !== criteria.method.toUpperCase()) {
        return false;
      }

      // 2. URL filter
      const fakeRule: NetworkMockRule = { url: criteria.url };
      if (!this.matchesRule(fakeRule, req.url, req.method)) {
        return false;
      }

      // 3. Query Params filter
      if (criteria.queryParams) {
        try {
          const reqUrlObj = new URL(req.url);
          for (const [key, val] of Object.entries(criteria.queryParams)) {
            if (reqUrlObj.searchParams.get(key) !== String(val)) {
              return false;
            }
          }
        } catch {
          return false;
        }
      }

      // 4. Body Pattern filter
      if (criteria.bodyPattern !== undefined) {
        if (!req.postData) return false;
        if (typeof criteria.bodyPattern === 'string') {
          if (!req.postData.includes(criteria.bodyPattern)) return false;
        } else if (typeof criteria.bodyPattern === 'object' && criteria.bodyPattern !== null) {
          try {
            const parsed = JSON.parse(req.postData);
            for (const [key, val] of Object.entries(criteria.bodyPattern)) {
              if (parsed[key] !== val) return false;
            }
          } catch {
            return false;
          }
        }
      }

      return true;
    });

    const count = matchingRequests.length;

    if (criteria.count !== undefined) {
      if (count !== criteria.count) {
        return {
          matched: false,
          count,
          error: `Expected exactly ${criteria.count} requests matching '${criteria.url}' [${criteria.method || 'ANY'}], but captured ${count}.`,
        };
      }
    } else if (criteria.minCount !== undefined && count < criteria.minCount) {
      return {
        matched: false,
        count,
        error: `Expected at least ${criteria.minCount} requests matching '${criteria.url}' [${criteria.method || 'ANY'}], but captured ${count}.`,
      };
    } else if (criteria.maxCount !== undefined && count > criteria.maxCount) {
      return {
        matched: false,
        count,
        error: `Expected at most ${criteria.maxCount} requests matching '${criteria.url}' [${criteria.method || 'ANY'}], but captured ${count}.`,
      };
    } else if (criteria.count === undefined && criteria.minCount === undefined && criteria.maxCount === undefined) {
      if (count < 1) {
        return {
          matched: false,
          count,
          error: `Expected at least 1 request matching '${criteria.url}' [${criteria.method || 'ANY'}], but captured 0.`,
        };
      }
    }

    return {
      matched: true,
      count,
    };
  }

  private recordRequest(entry: CapturedRequestEntry): void {
    if (this.capturedRequests.length >= this.maxCapturedRequests) {
      this.capturedRequests.shift();
    }
    this.capturedRequests.push(entry);
  }

  async cleanup(): Promise<void> {
    if (this.context && this.isAttached) {
      try {
        await this.context.unrouteAll({ behavior: 'ignoreErrors' });
      } catch {
        // Ignore unroute errors on closed context
      }
    }
    this.context = null;
    this.isAttached = false;
    this.rules.clear();
    this.matchCounters.clear();
    this.capturedRequests = [];
  }
}
