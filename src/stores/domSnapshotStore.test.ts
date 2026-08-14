import { describe, it, expect, beforeEach } from 'vitest';
import { useDomSnapshotStore } from './domSnapshotStore';
import type { MinedPageData } from '@/src/types/project';

const mockSnapshot: MinedPageData = {
  url: 'https://example.com',
  path: '/page',
  timestamp: '2026-01-01T00:00:00Z',
  tree: '[1] button "Click"',
  stats: { totalNodes: 5, interactiveNodes: 2, textHolders: 1, visibleNodes: 4 },
};

describe('domSnapshotStore', () => {
  beforeEach(() => {
    useDomSnapshotStore.setState({ snapshotsByProject: {} });
  });

  it('starts with empty snapshots', () => {
    expect(useDomSnapshotStore.getState().snapshotsByProject).toEqual({});
  });

  it('addDomSnapshot stores data by project and path', () => {
    useDomSnapshotStore.getState().addDomSnapshot('proj-1', '/page', mockSnapshot);
    const result = useDomSnapshotStore.getState().getDomSnapshot('proj-1', '/page');
    expect(result).toEqual(mockSnapshot);
  });

  it('getDomSnapshot returns undefined for missing data', () => {
    expect(useDomSnapshotStore.getState().getDomSnapshot('no-proj', '/nope')).toBeUndefined();
  });

  it('getAllDomSnapshots returns all snapshots for a project', () => {
    const { addDomSnapshot, getAllDomSnapshots } = useDomSnapshotStore.getState();
    addDomSnapshot('proj-1', '/a', { ...mockSnapshot, path: '/a' });
    addDomSnapshot('proj-1', '/b', { ...mockSnapshot, path: '/b' });

    const all = getAllDomSnapshots('proj-1');
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['/a']).toBeDefined();
    expect(all['/b']).toBeDefined();
  });

  it('getAllDomSnapshots returns empty object for unknown project', () => {
    expect(useDomSnapshotStore.getState().getAllDomSnapshots('unknown')).toEqual({});
  });

  it('clearDomSnapshots removes all snapshots for a project', () => {
    const { addDomSnapshot, clearDomSnapshots, getAllDomSnapshots } = useDomSnapshotStore.getState();
    addDomSnapshot('proj-1', '/a', mockSnapshot);
    addDomSnapshot('proj-2', '/b', mockSnapshot);

    clearDomSnapshots('proj-1');
    expect(getAllDomSnapshots('proj-1')).toEqual({});
    expect(getAllDomSnapshots('proj-2')).toBeDefined();
  });
});
