import { parseDocument, isMap } from 'yaml';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface PatchYamlResult {
  updatedYaml: string;
  patched: boolean;
  previousSelector?: any;
}

export interface PatchYamlMetadata {
  confidence?: number;
  healedAt?: string;
}

export interface PatchYamlFileResult {
  patched: boolean;
  previousSelector?: any;
  updatedYaml: string;
}

/**
 * Extracts step selector node or value from parsed document.
 */
export function extractStepSelectorNode(stepNode: any): { key: 'selector' | 'target'; value: any } | null {
  if (!stepNode || typeof stepNode !== 'object') {
    return null;
  }

  if (isMap(stepNode)) {
    if (stepNode.has('selector')) {
      return { key: 'selector', value: stepNode.get('selector') };
    }
    if (stepNode.has('target')) {
      return { key: 'target', value: stepNode.get('target') };
    }
    return null;
  }

  if ('selector' in stepNode) {
    return { key: 'selector', value: stepNode.selector };
  }
  if ('target' in stepNode) {
    return { key: 'target', value: stepNode.target };
  }

  return null;
}

/**
 * In-place comment-preserving YAML CST/AST mutator.
 */
export function patchYamlSelector(
  yamlContent: string,
  stepIndex: number,
  newSelector: string | Record<string, any>,
  metadata?: PatchYamlMetadata
): PatchYamlResult {
  const doc = parseDocument(yamlContent, { keepSourceTokens: true });

  const steps = doc.get('steps') as any;
  if (!steps || !steps.items || stepIndex < 0 || stepIndex >= steps.items.length) {
    return {
      updatedYaml: yamlContent,
      patched: false,
    };
  }

  const stepNode = steps.items[stepIndex];
  const selectorInfo = extractStepSelectorNode(stepNode);

  const targetKey = selectorInfo ? selectorInfo.key : 'selector';
  const previousSelector = selectorInfo ? selectorInfo.value : undefined;

  // Update or set selector
  doc.setIn(['steps', stepIndex, targetKey], newSelector);

  if (metadata) {
    if (metadata.confidence !== undefined) {
      doc.setIn(['steps', stepIndex, 'heal_confidence'], metadata.confidence);
    }
    if (metadata.healedAt !== undefined) {
      doc.setIn(['steps', stepIndex, 'healed_at'], metadata.healedAt);
    }
  }

  const updatedYaml = doc.toString();

  return {
    updatedYaml,
    patched: true,
    previousSelector,
  };
}

/**
 * Performs safe atomic write-and-rename file patching.
 */
export function extractStepSelectorNodeFromFile(
  yamlContent: string,
  stepIndex: number
): { key: 'selector' | 'target'; value: any } | null {
  const doc = parseDocument(yamlContent, { keepSourceTokens: true });
  const steps = doc.get('steps') as any;
  if (!steps || !steps.items || stepIndex < 0 || stepIndex >= steps.items.length) {
    return null;
  }
  return extractStepSelectorNode(steps.items[stepIndex]);
}

export async function patchYamlFile(
  filePath: string,
  stepIndex: number,
  newSelector: string | Record<string, any>,
  metadata?: PatchYamlMetadata
): Promise<PatchYamlFileResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  const result = patchYamlSelector(content, stepIndex, newSelector, metadata);

  if (!result.patched) {
    return {
      patched: false,
      previousSelector: result.previousSelector,
      updatedYaml: result.updatedYaml,
    };
  }

  const dir = path.dirname(filePath);
  const tempPath = path.join(dir, `${path.basename(filePath)}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  try {
    await fs.writeFile(tempPath, result.updatedYaml, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (err) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore temp file cleanup failure
    }
    throw err;
  }

  return {
    patched: true,
    previousSelector: result.previousSelector,
    updatedYaml: result.updatedYaml,
  };
}
