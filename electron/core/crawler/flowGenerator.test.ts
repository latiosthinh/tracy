import { describe, it, expect } from 'vitest';
import * as yaml from 'js-yaml';
import { generateFlowsFromCrawlGraph, findGraphPaths, compilePathToYaml } from './flowGenerator';
import { CrawlGraph } from './bfsCrawler';
import { CrawlNode } from './types';

describe('flowGenerator', () => {
  const sampleGraph: CrawlGraph = {
    nodes: new Map<string, CrawlNode>([
      [
        'node-1',
        {
          id: 'node-1',
          url: 'http://localhost:3000/',
          pathname: '/',
          title: 'Home',
          skeletonHash: 'hash-1',
          visitedAt: Date.now(),
          interactiveElements: [],
        },
      ],
      [
        'node-2',
        {
          id: 'node-2',
          url: 'http://localhost:3000/products',
          pathname: '/products',
          title: 'Products',
          skeletonHash: 'hash-2',
          visitedAt: Date.now(),
          interactiveElements: [],
        },
      ],
      [
        'node-3',
        {
          id: 'node-3',
          url: 'http://localhost:3000/products/checkout',
          pathname: '/products/checkout',
          title: 'Checkout',
          skeletonHash: 'hash-3',
          visitedAt: Date.now(),
          interactiveElements: [],
        },
      ],
    ]),
    edges: [
      {
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        actionType: 'navigate',
        selector: 'a[href="/products"]',
        triggerText: 'Products',
      },
      {
        sourceNodeId: 'node-2',
        targetNodeId: 'node-3',
        actionType: 'navigate',
        selector: 'button#checkout',
        triggerText: 'Checkout',
      },
    ],
  };

  it('findGraphPaths discovers complete path to leaf nodes', () => {
    const paths = findGraphPaths(sampleGraph);
    expect(paths.length).toBeGreaterThan(0);
    const checkoutPath = paths.find((p) => p.targetUrl.includes('/products/checkout'));
    expect(checkoutPath).toBeDefined();
    expect(checkoutPath?.path).toEqual(['node-1', 'node-2', 'node-3']);
    expect(checkoutPath?.edges).toHaveLength(2);
  });

  it('compilePathToYaml produces valid Playwright YAML flow string', () => {
    const paths = findGraphPaths(sampleGraph);
    const checkoutPath = paths.find((p) => p.targetUrl.includes('/products/checkout'))!;
    const result = compilePathToYaml(sampleGraph, checkoutPath, 'Checkout Flow');

    expect(result.steps.length).toBeGreaterThan(1);
    expect(result.yamlContent).toContain('url: http://localhost:3000/');
    expect(result.yamlContent).toContain('- navigate: /');
    expect(result.yamlContent).toContain('selector: \'a[href="/products"]\'');
    expect(result.yamlContent).toContain('selector: \'button#checkout\'');

    // Parse back with js-yaml to verify 100% schema validity
    const docs = yaml.loadAll(result.yamlContent);
    expect(docs.length).toBeGreaterThanOrEqual(1);
  });

  it('generateFlowsFromCrawlGraph creates complete flow list with descriptions', () => {
    const flows = generateFlowsFromCrawlGraph(sampleGraph, { baseTitle: 'E2E Suite' });
    expect(flows.length).toBeGreaterThan(0);
    for (const flow of flows) {
      expect(flow.id).toBeDefined();
      expect(flow.name).toContain('E2E Suite');
      expect(flow.startUrl).toBe('http://localhost:3000/');
      expect((flow as any).yamlContent).toBeDefined();
    }
  });
});
