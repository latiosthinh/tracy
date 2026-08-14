import type { Project } from '@/src/types/project';
import type { FlowFile } from '@/src/types/flow';

const EXPORT_VERSION = '1';
const EXPORT_FORMAT = 'tracy-project-export';

export interface TracyExportPayload {
  format: string;
  version: string;
  exportedAt: string;
  projects: Project[];
}

interface SerializableProject extends Omit<Project, 'domSnapshots' | 'lastRunStatus' | 'lastRunTime' | 'passRate'> {
  id: string;
  name: string;
  description?: string;
  targetUrl: string;
  environment: Project['environment'];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  flows: FlowFile[];
  config?: Partial<import('@/src/types/project').WorkspaceConfig>;
  saveLocation?: string;
}

export function serializeProjects(projects: Project[]): string {
  // Strip ephemeral runtime data that cannot meaningfully persist across sessions
  const clean: SerializableProject[] = projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    targetUrl: p.targetUrl,
    environment: p.environment,
    tags: p.tags,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    flows: p.flows,
    config: p.config,
    saveLocation: p.saveLocation,
  }));

  const payload: TracyExportPayload = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    projects: clean as unknown as Project[],
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadExport(json: string, filename?: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `tracy-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  payload?: TracyExportPayload;
  projectCount?: number;
}

export function validateImport(input: string): ImportValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { valid: false, error: 'Invalid JSON — the file may be corrupted or not a Tracy export.' };
  }

  if (parsed === null || typeof parsed !== 'object') {
    return { valid: false, error: 'Top-level value must be a JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.format !== EXPORT_FORMAT) {
    return { valid: false, error: `Unknown export format "${String(obj.format ?? '')}". Expected "${EXPORT_FORMAT}".` };
  }
  if (!obj.version || typeof obj.version !== 'string') {
    return { valid: false, error: 'Missing or invalid "version" field.' };
  }
  if (!Array.isArray(obj.projects)) {
    return { valid: false, error: 'Missing or invalid "projects" array.' };
  }

  // Validate each project has an id
  const projects = obj.projects as Project[];
  for (let i = 0; i < projects.length; i++) {
    if (!projects[i].id || typeof projects[i].id !== 'string') {
      return { valid: false, error: `Project at index ${i} is missing a valid "id" string.` };
    }
    if (!projects[i].name || typeof projects[i].name !== 'string') {
      return { valid: false, error: `Project at index ${i} is missing a valid "name" string.` };
    }
    if (!Array.isArray((projects[i] as any).flows)) {
      return { valid: false, error: `Project at index ${i} is missing a "flows" array.` };
    }
  }

  return {
    valid: true,
    payload: parsed as TracyExportPayload,
    projectCount: projects.length,
  };
}

/**
 * Merge imported projects into the existing set.
 * Projects with matching IDs are updated; new IDs are appended.
 */
export function mergeImportedProjects(
  existing: Project[],
  imported: Project[],
): Project[] {
  const merged = [...existing] as Project[];
  const existingIds = new Set(existing.map(p => p.id));

  for (const proj of imported) {
    const idx = merged.findIndex(e => e.id === proj.id);
    if (idx !== -1) {
      merged[idx] = proj; // update existing
    } else if (!existingIds.has(proj.id)) {
      merged.push(proj); // add new
    }
  }

  return merged;
}

/**
 * Extract flows from all projects into a flat list.
 */
export function extractAllFlows(projects: Project[]): FlowFile[] {
  return projects.flatMap(p => p.flows);
}
