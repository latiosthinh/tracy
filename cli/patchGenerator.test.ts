import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateUnifiedPatch, writePatchFile } from './patchGenerator';

describe('cli/patchGenerator', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tracy-patch-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('generates empty string when original and updated YAML are identical', () => {
    const patch = generateUnifiedPatch([
      {
        filePath: 'flows/login.yaml',
        originalYaml: 'url: http://localhost\nsteps:\n  - click: #btn',
        updatedYaml: 'url: http://localhost\nsteps:\n  - click: #btn'
      }
    ]);

    expect(patch).toBe('');
  });

  it('generates standard unified diff format for modified selectors', () => {
    const original = `url: http://localhost:3000
steps:
  - navigate: /login
  - click: #old-button
`;
    const updated = `url: http://localhost:3000
steps:
  - navigate: /login
  - click: [data-testid="submit-btn"]
`;

    const patch = generateUnifiedPatch([
      {
        filePath: 'flows/auth.yaml',
        originalYaml: original,
        updatedYaml: updated
      }
    ]);

    expect(patch).toContain('--- a/flows/auth.yaml');
    expect(patch).toContain('+++ b/flows/auth.yaml');
    expect(patch).toContain('@@ -1,5 +1,5 @@');
    expect(patch).toContain('-  - click: #old-button');
    expect(patch).toContain('+  - click: [data-testid="submit-btn"]');
    expect(patch).toContain('   - navigate: /login');
  });

  it('handles multiple modified files in single patch', () => {
    const patch = generateUnifiedPatch([
      {
        filePath: 'flows/a.yaml',
        originalYaml: 'steps:\n  - click: .a',
        updatedYaml: 'steps:\n  - click: .a-new'
      },
      {
        filePath: 'flows/b.yaml',
        originalYaml: 'steps:\n  - click: .b',
        updatedYaml: 'steps:\n  - click: .b-new'
      }
    ]);

    expect(patch).toContain('--- a/flows/a.yaml');
    expect(patch).toContain('+++ b/flows/a.yaml');
    expect(patch).toContain('--- a/flows/b.yaml');
    expect(patch).toContain('+++ b/flows/b.yaml');
  });

  it('writes patch file ensuring parent directory exists', async () => {
    const targetFile = path.join(tempDir, 'sub', 'nested', 'self-heal.patch');
    const content = '--- a/flow.yaml\n+++ b/flow.yaml\n';

    await writePatchFile(targetFile, content);

    const exists = await fs.readFile(targetFile, 'utf-8');
    expect(exists).toBe(content);
  });
});
