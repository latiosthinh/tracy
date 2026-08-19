import { describe, it, expect } from 'vitest';
import type {
  CommandType,
  HttpMethod,
  AbortReason,
  NetworkMockRule,
  HarReplayOptions,
  AssertRequestStep,
  FlowMetadata,
  FlowStep,
} from './flow';

describe('flow network mock types', () => {
  it('includes network mocking and HAR commands in CommandType', () => {
    const mockCmd: CommandType = 'mockRoute';
    const unmockCmd: CommandType = 'unmockRoute';
    const recordHarCmd: CommandType = 'recordHar';
    const replayHarCmd: CommandType = 'replayHar';
    const assertReqCmd: CommandType = 'assertRequest';

    expect([mockCmd, unmockCmd, recordHarCmd, replayHarCmd, assertReqCmd]).toBeDefined();
  });

  it('supports full NetworkMockRule and HarReplayOptions specification', () => {
    const method: HttpMethod = 'GET';
    const abort: AbortReason = 'timedout';

    const rule: NetworkMockRule = {
      id: 'mock-1',
      url: '**/api/v1/users',
      method,
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { users: [{ id: 1, name: 'Alice' }] },
      delayMs: 150,
      abort,
      times: 2,
    };

    const har: HarReplayOptions = {
      path: './fixtures/api.har',
      notFound: 'fallback',
      url: '**/api/**',
    };

    const assertReq: AssertRequestStep = {
      url: '**/api/v1/users',
      method: 'POST',
      count: 1,
      queryParams: { page: '1' },
      bodyPattern: { name: 'Alice' },
    };

    const metadata: FlowMetadata = {
      mocks: [rule],
      har,
    };

    const step: FlowStep = {
      id: 's1',
      command: 'mockRoute',
      status: 'pending',
      args: rule as unknown as Record<string, any>,
    };

    expect(metadata.mocks?.[0].status).toBe(200);
    expect(metadata.har?.notFound).toBe('fallback');
    expect(assertReq.method).toBe('POST');
    expect(step.command).toBe('mockRoute');
  });
});
