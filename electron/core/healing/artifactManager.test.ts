import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  ensureArtifactDirectory,
  saveFailureArtifacts,
  saveHealArtifacts,
  sanitizeFlowName,
} from './artifactManager';

describe('artifactManager', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'artifact-mgr-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('sanitizeFlowName', () => {
    it('sanitizes special characters and directory traversal patterns', () => {
      expect(sanitizeFlowName('../../etc/passwd')).toBe('etc-passwd');
      expect(sanitizeFlowName('Checkout Flow: #1 (Staging!)')).toBe('checkout-flow-1-staging');
      expect(sanitizeFlowName('   ')).toBe('unnamed-flow');
    });
  });

  describe('ensureArtifactDirectory', () => {
    it('creates directory successfully and safely', async () => {
      const dir = await ensureArtifactDirectory(tmpDir, 'My Login Test');
      const stats = await fs.stat(dir);
      expect(stats.isDirectory()).toBe(true);
      expect(dir).toContain('my-login-test');
    });
  });

  describe('saveFailureArtifacts', () => {
    it('saves screenshot, DOM snapshot, and failure metadata JSON', async () => {
      const mockPage = {
        screenshot: vi.fn().mockImplementation(async ({ path: p }) => {
          await fs.writeFile(p, Buffer.from('fake-png-binary'));
        }),
        content: vi.fn().mockResolvedValue('<html><body><h1>Error Page</h1></body></html>'),
      };

      const result = await saveFailureArtifacts({
        outputDir: tmpDir,
        flowName: 'Checkout flow',
        stepIndex: 2,
        page: mockPage,
        error: 'Timeout 5000ms exceeded waiting for button#pay',
      });

      expect(result.screenshotPath).toBeDefined();
      expect(result.domSnapshotPath).toBeDefined();
      expect(result.metadataPath).toBeDefined();

      const html = await fs.readFile(result.domSnapshotPath!, 'utf-8');
      expect(html).toContain('<h1>Error Page</h1>');

      const metaRaw = await fs.readFile(result.metadataPath!, 'utf-8');
      const meta = JSON.parse(metaRaw);
      expect(meta.flowName).toBe('Checkout flow');
      expect(meta.stepIndex).toBe(2);
      expect(meta.error).toContain('Timeout 5000ms');
      expect(meta.artifacts.screenshot).toBe('failure-step-2.png');
      expect(meta.artifacts.domSnapshot).toBe('failure-step-2.html');
    });

    it('gracefully degrades when page is null or screenshot throws', async () => {
      const failingPage = {
        screenshot: vi.fn().mockRejectedValue(new Error('Browser crashed')),
        content: vi.fn().mockRejectedValue(new Error('Context destroyed')),
      };

      const result = await saveFailureArtifacts({
        outputDir: tmpDir,
        flowName: 'Failing flow',
        stepIndex: 0,
        page: failingPage,
        error: 'Target closed',
      });

      expect(result.screenshotPath).toBeUndefined();
      expect(result.domSnapshotPath).toBeUndefined();
      expect(result.metadataPath).toBeDefined();

      const metaRaw = await fs.readFile(result.metadataPath!, 'utf-8');
      const meta = JSON.parse(metaRaw);
      expect(meta.error).toBe('Target closed');
      expect(meta.artifacts.screenshot).toBeNull();
    });
  });

  describe('saveHealArtifacts', () => {
    it('saves healed screenshot, DOM snapshot, and heal metadata JSON', async () => {
      const mockPage = {
        screenshot: vi.fn().mockImplementation(async ({ path: p }) => {
          await fs.writeFile(p, Buffer.from('fake-healed-png'));
        }),
        content: vi.fn().mockResolvedValue('<html><body><button id="healed-pay">Pay</button></body></html>'),
      };

      const result = await saveHealArtifacts({
        outputDir: tmpDir,
        flowName: 'Checkout flow',
        stepIndex: 2,
        page: mockPage,
        healingResult: {
          originalSelector: 'button#pay-old',
          healedSelector: 'button#healed-pay',
          strategy: 'heuristic',
          confidence: 0.92,
          reason: 'Matched text and button role with 92% confidence',
        },
      });

      expect(result.screenshotPath).toBeDefined();
      expect(result.domSnapshotPath).toBeDefined();
      expect(result.metadataPath).toBeDefined();

      const metaRaw = await fs.readFile(result.metadataPath!, 'utf-8');
      const meta = JSON.parse(metaRaw);
      expect(meta.flowName).toBe('Checkout flow');
      expect(meta.originalSelector).toBe('button#pay-old');
      expect(meta.healedSelector).toBe('button#healed-pay');
      expect(meta.strategy).toBe('heuristic');
      expect(meta.confidence).toBe(0.92);
      expect(meta.artifacts.screenshot).toBe('healed-step-2.png');
      expect(meta.artifacts.domSnapshot).toBe('healed-step-2.html');
    });
  });
});
