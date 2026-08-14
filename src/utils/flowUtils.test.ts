import { describe, it, expect } from 'vitest';
import { getFlowCategory, groupFlowsByCategory, PLAYWRIGHT_CATEGORIES } from './flowUtils';
import type { FlowFile } from '@/src/types/flow';

function makeFlow(overrides: Partial<FlowFile> = {}): FlowFile {
  return {
    id: 'test-flow',
    name: 'test.yaml',
    path: 'flows/test.yaml',
    tags: [],
    metadata: {},
    yamlContent: '',
    steps: [],
    ...overrides,
  };
}

describe('getFlowCategory', () => {
  it('returns the explicit category when set', () => {
    const flow = makeFlow({ category: 'API' });
    expect(getFlowCategory(flow)).toBe('API');
  });

  it('detects API category from tags', () => {
    expect(getFlowCategory(makeFlow({ tags: ['api'] }))).toBe('API');
    expect(getFlowCategory(makeFlow({ tags: ['network'] }))).toBe('API');
    expect(getFlowCategory(makeFlow({ tags: ['mocking'] }))).toBe('API');
  });

  it('detects API category from yaml content', () => {
    expect(getFlowCategory(makeFlow({ yamlContent: 'interceptNetwork: ...' }))).toBe('API');
  });

  it('detects Smoke category from tags', () => {
    expect(getFlowCategory(makeFlow({ tags: ['smoke'] }))).toBe('Smoke');
    expect(getFlowCategory(makeFlow({ tags: ['critical'] }))).toBe('Smoke');
  });

  it('detects Visual category from tags', () => {
    expect(getFlowCategory(makeFlow({ tags: ['visual'] }))).toBe('Visual');
    expect(getFlowCategory(makeFlow({ tags: ['responsive'] }))).toBe('Visual');
    expect(getFlowCategory(makeFlow({ tags: ['mobile'] }))).toBe('Visual');
  });

  it('detects Visual category from yaml content', () => {
    expect(getFlowCategory(makeFlow({ yamlContent: 'setViewport: ...' }))).toBe('Visual');
    expect(getFlowCategory(makeFlow({ yamlContent: 'takeScreenshot: ...' }))).toBe('Visual');
  });

  it('detects Component category from tags', () => {
    expect(getFlowCategory(makeFlow({ tags: ['component'] }))).toBe('Component');
    expect(getFlowCategory(makeFlow({ tags: ['unit'] }))).toBe('Component');
  });

  it('defaults to E2E when no signals match', () => {
    expect(getFlowCategory(makeFlow())).toBe('E2E');
    expect(getFlowCategory(makeFlow({ tags: ['unrelated'] }))).toBe('E2E');
  });

  it('prioritizes explicit category over tag inference', () => {
    const flow = makeFlow({ category: 'Smoke', tags: ['api'] });
    expect(getFlowCategory(flow)).toBe('Smoke');
  });
});

describe('groupFlowsByCategory', () => {
  it('returns empty array for no flows', () => {
    expect(groupFlowsByCategory([])).toEqual([]);
  });

  it('groups flows by their detected category', () => {
    const flows = [
      makeFlow({ id: '1', tags: ['smoke'] }),
      makeFlow({ id: '2', tags: ['smoke'] }),
      makeFlow({ id: '3', category: 'API' }),
    ];
    const groups = groupFlowsByCategory(flows);

    expect(groups).toHaveLength(2);
    const smokeGroup = groups.find(g => g.category.id === 'Smoke');
    const apiGroup = groups.find(g => g.category.id === 'API');
    expect(smokeGroup).toBeDefined();
    expect(smokeGroup!.flows).toHaveLength(2);
    expect(apiGroup).toBeDefined();
    expect(apiGroup!.flows).toHaveLength(1);
  });

  it('only includes categories that have flows', () => {
    const flows = [makeFlow({ category: 'Visual' })];
    const groups = groupFlowsByCategory(flows);

    expect(groups).toHaveLength(1);
    expect(groups[0].category.id).toBe('Visual');
  });
});

describe('PLAYWRIGHT_CATEGORIES', () => {
  it('contains all 5 expected categories', () => {
    const ids = PLAYWRIGHT_CATEGORIES.map(c => c.id);
    expect(ids).toEqual(['E2E', 'API', 'Smoke', 'Visual', 'Component']);
  });

  it('each category has required display fields', () => {
    for (const cat of PLAYWRIGHT_CATEGORIES) {
      expect(cat.label).toBeTruthy();
      expect(cat.badgeLabel).toBeTruthy();
      expect(cat.iconName).toBeTruthy();
      expect(cat.color).toBeTruthy();
    }
  });
});
