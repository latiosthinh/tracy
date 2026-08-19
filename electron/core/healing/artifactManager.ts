import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface ArtifactPaths {
  screenshotPath?: string;
  domSnapshotPath?: string;
  metadataPath?: string;
}

export interface FailureArtifactOptions {
  outputDir: string;
  flowName: string;
  stepIndex: number;
  page?: any;
  error: string;
  maxSnapshotBytes?: number;
}

export interface HealArtifactOptions {
  outputDir: string;
  flowName: string;
  stepIndex: number;
  page?: any;
  healingResult: any;
  maxSnapshotBytes?: number;
}

const DEFAULT_MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024; // 5MB limit for T-16-03

/**
 * Sanitizes flow name to prevent directory traversal and illegal filename characters.
 */
export function sanitizeFlowName(flowName: string): string {
  return flowName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unnamed-flow';
}

/**
 * Ensures the artifact directory exists and returns safe path.
 */
export async function ensureArtifactDirectory(outputDir: string, flowName: string): Promise<string> {
  const safeSlug = sanitizeFlowName(flowName);
  const targetDir = path.resolve(outputDir, safeSlug);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

/**
 * Saves failure screenshot, DOM snapshot, and metadata.
 */
export async function saveFailureArtifacts(options: FailureArtifactOptions): Promise<ArtifactPaths> {
  const { outputDir, flowName, stepIndex, page, error, maxSnapshotBytes = DEFAULT_MAX_SNAPSHOT_BYTES } = options;
  const artifactDir = await ensureArtifactDirectory(outputDir, flowName);
  const result: ArtifactPaths = {};

  // 1. Capture Screenshot if page is active
  if (page && typeof page.screenshot === 'function') {
    const screenshotPath = path.join(artifactDir, `failure-step-${stepIndex}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshotPath = screenshotPath;
    } catch {
      // Graceful degradation on browser crash / disconnect
    }
  }

  // 2. Capture DOM snapshot
  if (page && typeof page.content === 'function') {
    const domSnapshotPath = path.join(artifactDir, `failure-step-${stepIndex}.html`);
    try {
      let content = await page.content();
      if (typeof content === 'string') {
        if (Buffer.byteLength(content, 'utf-8') > maxSnapshotBytes) {
          content = content.slice(0, maxSnapshotBytes);
        }
        await fs.writeFile(domSnapshotPath, content, 'utf-8');
        result.domSnapshotPath = domSnapshotPath;
      }
    } catch {
      // Graceful degradation
    }
  }

  // 3. Write Failure JSON metadata
  const metadataPath = path.join(artifactDir, `failure-step-${stepIndex}.json`);
  const metadata = {
    flowName,
    stepIndex,
    error,
    timestamp: new Date().toISOString(),
    artifacts: {
      screenshot: result.screenshotPath ? path.basename(result.screenshotPath) : null,
      domSnapshot: result.domSnapshotPath ? path.basename(result.domSnapshotPath) : null,
    },
  };

  try {
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    result.metadataPath = metadataPath;
  } catch {
    // Graceful degradation
  }

  return result;
}

/**
 * Saves healing verification screenshot, DOM snapshot, and heal telemetry metadata.
 */
export async function saveHealArtifacts(options: HealArtifactOptions): Promise<ArtifactPaths> {
  const { outputDir, flowName, stepIndex, page, healingResult, maxSnapshotBytes = DEFAULT_MAX_SNAPSHOT_BYTES } = options;
  const artifactDir = await ensureArtifactDirectory(outputDir, flowName);
  const result: ArtifactPaths = {};

  // 1. Capture Screenshot
  if (page && typeof page.screenshot === 'function') {
    const screenshotPath = path.join(artifactDir, `healed-step-${stepIndex}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshotPath = screenshotPath;
    } catch {
      // Graceful degradation
    }
  }

  // 2. Capture DOM snapshot
  if (page && typeof page.content === 'function') {
    const domSnapshotPath = path.join(artifactDir, `healed-step-${stepIndex}.html`);
    try {
      let content = await page.content();
      if (typeof content === 'string') {
        if (Buffer.byteLength(content, 'utf-8') > maxSnapshotBytes) {
          content = content.slice(0, maxSnapshotBytes);
        }
        await fs.writeFile(domSnapshotPath, content, 'utf-8');
        result.domSnapshotPath = domSnapshotPath;
      }
    } catch {
      // Graceful degradation
    }
  }

  // 3. Write Healed JSON metadata
  const metadataPath = path.join(artifactDir, `healed-step-${stepIndex}.json`);
  const metadata = {
    flowName,
    stepIndex,
    originalSelector: healingResult?.originalSelector,
    healedSelector: healingResult?.healedSelector,
    strategy: healingResult?.strategy,
    confidence: healingResult?.confidence,
    reason: healingResult?.reason,
    timestamp: new Date().toISOString(),
    artifacts: {
      screenshot: result.screenshotPath ? path.basename(result.screenshotPath) : null,
      domSnapshot: result.domSnapshotPath ? path.basename(result.domSnapshotPath) : null,
    },
  };

  try {
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    result.metadataPath = metadataPath;
  } catch {
    // Graceful degradation
  }

  return result;
}
