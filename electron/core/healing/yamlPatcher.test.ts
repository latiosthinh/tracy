import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { patchYamlSelector, patchYamlFile, extractStepSelectorNode } from './yamlPatcher';

describe('yamlPatcher', () => {
  const sampleYaml = `# Header comment describing the test flow
url: https://example.com/checkout
steps:
  # Step 1: initial navigation
  - action: navigate
    url: https://example.com/checkout

  # Step 2: click payment button
  - action: leftClick
    selector: button#pay-now  # inline comment
    timeout: 5000

  # Step 3: fill form
  - action: fill
    target: input[name="card"]
    text: "4242424242424242"
`;

  it('preserves header comments, inline comments, blank lines, and indentation when patching a selector', () => {
    const res = patchYamlSelector(sampleYaml, 1, 'button#healed-pay-btn');
    expect(res.patched).toBe(true);
    expect(res.previousSelector).toBe('button#pay-now');

    expect(res.updatedYaml).toContain('# Header comment describing the test flow');
    expect(res.updatedYaml).toContain('# Step 1: initial navigation');
    expect(res.updatedYaml).toContain('# Step 2: click payment button');
    expect(res.updatedYaml).toContain('button#healed-pay-btn');
    expect(res.updatedYaml).toContain('# Step 3: fill form');
  });

  it('correctly updates steps with target key instead of selector', () => {
    const res = patchYamlSelector(sampleYaml, 2, 'input[name="healed_card_input"]');
    expect(res.patched).toBe(true);
    expect(res.previousSelector).toBe('input[name="card"]');
    expect(res.updatedYaml).toContain('target: input[name="healed_card_input"]');
    expect(res.updatedYaml).not.toContain('target: input[name="card"]');
  });

  it('supports patching structured object selector', () => {
    const objectSelector = { testId: 'submit-btn', role: 'button' };
    const res = patchYamlSelector(sampleYaml, 1, objectSelector);
    expect(res.patched).toBe(true);
    expect(res.updatedYaml).toContain('testId: submit-btn');
    expect(res.updatedYaml).toContain('role: button');
  });

  it('adds heal metadata when provided', () => {
    const res = patchYamlSelector(sampleYaml, 1, 'button.new-btn', {
      confidence: 0.95,
      healedAt: '2026-08-19T10:00:00.000Z',
    });
    expect(res.patched).toBe(true);
    expect(res.updatedYaml).toContain('heal_confidence: 0.95');
    expect(res.updatedYaml).toContain('healed_at: 2026-08-19T10:00:00.000Z');
  });

  it('returns patched: false if stepIndex is out of range', () => {
    const res = patchYamlSelector(sampleYaml, 99, 'button.none');
    expect(res.patched).toBe(false);
    expect(res.updatedYaml).toBe(sampleYaml);
  });

  describe('atomic file patching', () => {
    let tmpDir: string;
    let tmpFile: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yaml-patcher-test-'));
      tmpFile = path.join(tmpDir, 'test-flow.yaml');
      await fs.writeFile(tmpFile, sampleYaml, 'utf-8');
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('patches file atomically and verifies file contents on disk', async () => {
      const res = await patchYamlFile(tmpFile, 1, 'button#disk-healed-btn');
      expect(res.patched).toBe(true);
      expect(res.previousSelector).toBe('button#pay-now');

      const onDisk = await fs.readFile(tmpFile, 'utf-8');
      expect(onDisk).toBe(res.updatedYaml);
      expect(onDisk).toContain('button#disk-healed-btn');
      expect(onDisk).toContain('# Header comment describing the test flow');
    });

    it('throws error when file path does not exist', async () => {
      const nonExistent = path.join(tmpDir, 'does-not-exist.yaml');
      await expect(patchYamlFile(nonExistent, 0, 'btn')).rejects.toThrow();
    });
  });

  describe('extractStepSelectorNode', () => {
    it('extracts selector and target from plain objects', () => {
      expect(extractStepSelectorNode({ selector: '.btn' })).toEqual({ key: 'selector', value: '.btn' });
      expect(extractStepSelectorNode({ target: '#input' })).toEqual({ key: 'target', value: '#input' });
      expect(extractStepSelectorNode({ action: 'navigate' })).toBeNull();
      expect(extractStepSelectorNode(null)).toBeNull();
    });
  });
});
