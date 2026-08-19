import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { computeLineDiff } from '@/src/utils/diffUtils';

export interface FilePatchInput {
  filePath: string;
  originalYaml: string;
  updatedYaml: string;
}

/**
 * Generates standard unified diff formatted patch string across modified files.
 */
export function generateUnifiedPatch(patches: FilePatchInput[]): string {
  const result: string[] = [];

  for (const patch of patches) {
    if (patch.originalYaml === patch.updatedYaml) {
      continue;
    }

    const relPath = patch.filePath.replace(/\\/g, '/');
    const diffLines = computeLineDiff(patch.originalYaml, patch.updatedYaml);

    result.push(`--- a/${relPath}`);
    result.push(`+++ b/${relPath}`);

    // Group into unified diff hunks
    const origLineCount = patch.originalYaml.split(/\r?\n/).length;
    const modLineCount = patch.updatedYaml.split(/\r?\n/).length;

    result.push(`@@ -1,${origLineCount} +1,${modLineCount} @@`);

    for (const line of diffLines) {
      if (line.type === 'unchanged') {
        result.push(` ${line.text}`);
      } else if (line.type === 'added') {
        result.push(`+${line.text}`);
      } else if (line.type === 'removed') {
        result.push(`-${line.text}`);
      }
    }
  }

  return result.join('\n');
}

/**
 * Writes unified patch content to disk, creating directory structure if needed.
 */
export async function writePatchFile(outputPath: string, patchContent: string): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, patchContent, 'utf-8');
}
