import Dexie, { type Table } from 'dexie';
import type { Project } from '@/src/types/project';

// Dexie database for web-mode persistence
export class TracyDB extends Dexie {
  projects!: Table<Project, string>;

  constructor() {
    super('tracy-web-db');
    this.version(1).stores({
      projects: 'id, name, updatedAt, targetUrl',
    });
  }
}

export const db = new TracyDB();

// Helper functions for web-mode persistence
export async function loadProjectsFromDb(): Promise<Project[]> {
  try {
    return await db.projects.toArray();
  } catch (error) {
    console.error('Failed to load projects from IndexedDB:', error);
    return [];
  }
}

export async function saveProjectToDb(project: Project): Promise<void> {
  try {
    await db.projects.put(project);
  } catch (error) {
    console.error('Failed to save project to IndexedDB:', error);
  }
}

export async function deleteProjectFromDb(projectId: string): Promise<void> {
  try {
    await db.projects.delete(projectId);
  } catch (error) {
    console.error('Failed to delete project from IndexedDB:', error);
  }
}

export async function clearAllProjectsFromDb(): Promise<void> {
  try {
    await db.projects.clear();
  } catch (error) {
    console.error('Failed to clear projects from IndexedDB:', error);
  }
}
