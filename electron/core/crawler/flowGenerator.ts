import * as yaml from 'js-yaml';
import type { CrawlGraph } from './bfsCrawler.js';
import type { DiscoveredFlow } from './types.js';
import type { YamlStep } from '@/src/types/flow.js';

export interface FlowCompilationOptions {
  baseTitle?: string;
  maxPaths?: number;
  deduplicateSteps?: boolean;
}

/**
 * Finds all paths in the DAG / graph from root nodes (or start URL nodes) to other nodes
 */
export function findGraphPaths(
  graph: CrawlGraph,
  maxPaths: number = 20
): Array<{ startUrl: string; targetUrl: string; path: string[]; edges: any[] }> {
  const nodeIds = Array.from(graph.nodes.keys());
  if (nodeIds.length === 0) return [];

  // Map outgoing edges
  const adjacency = new Map<string, Array<{ targetId: string; edge: any }>>();
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    const list = adjacency.get(edge.sourceNodeId);
    if (list) {
      list.push({ targetId: edge.targetNodeId, edge });
    }
  }

  // Find root node (first node or node with in-degree 0)
  const inDegree = new Map<string, number>();
  for (const nodeId of nodeIds) inDegree.set(nodeId, 0);
  for (const edge of graph.edges) {
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
  }

  const rootNodes = nodeIds.filter((id) => (inDegree.get(id) || 0) === 0);
  const startNodes = rootNodes.length > 0 ? rootNodes : [nodeIds[0]];

  const discoveredPaths: Array<{ startUrl: string; targetUrl: string; path: string[]; edges: any[] }> = [];

  for (const startId of startNodes) {
    const startNode = graph.nodes.get(startId);
    if (!startNode) continue;

    // DFS with loop prevention
    const stack: Array<{ currentId: string; visited: Set<string>; path: string[]; edges: any[] }> = [
      {
        currentId: startId,
        visited: new Set([startId]),
        path: [startId],
        edges: [],
      },
    ];

    while (stack.length > 0 && discoveredPaths.length < maxPaths) {
      const current = stack.pop()!;
      const neighbors = adjacency.get(current.currentId) || [];

      let hasUnvisitedNeighbor = false;
      for (const neighbor of neighbors) {
        if (!current.visited.has(neighbor.targetId)) {
          hasUnvisitedNeighbor = true;
          const nextVisited = new Set(current.visited);
          nextVisited.add(neighbor.targetId);

          stack.push({
            currentId: neighbor.targetId,
            visited: nextVisited,
            path: [...current.path, neighbor.targetId],
            edges: [...current.edges, neighbor.edge],
          });
        }
      }

      // If terminal node or leaf in path
      if (!hasUnvisitedNeighbor && current.path.length > 1) {
        const targetNode = graph.nodes.get(current.currentId);
        if (targetNode) {
          discoveredPaths.push({
            startUrl: startNode.url,
            targetUrl: targetNode.url,
            path: current.path,
            edges: current.edges,
          });
        }
      }
    }
  }

  // If no multi-hop paths found but nodes exist, produce single-node paths
  if (discoveredPaths.length === 0 && nodeIds.length > 0) {
    const firstNode = graph.nodes.get(nodeIds[0])!;
    discoveredPaths.push({
      startUrl: firstNode.url,
      targetUrl: firstNode.url,
      path: [nodeIds[0]],
      edges: [],
    });
  }

  return discoveredPaths;
}

/**
 * Compiles a specific crawl path into structured YamlSteps and formatted YAML text
 */
export function compilePathToYaml(
  graph: CrawlGraph,
  pathData: { startUrl: string; targetUrl: string; path: string[]; edges: any[] },
  flowTitle: string
): { steps: YamlStep[]; yamlContent: string } {
  const steps: YamlStep[] = [];
  const startNode = graph.nodes.get(pathData.path[0]);
  const startUrl = startNode ? startNode.url : pathData.startUrl;

  // Step 1: Initial navigation
  try {
    const parsed = new URL(startUrl);
    steps.push({
      navigate: parsed.pathname + parsed.search,
    });
  } catch {
    steps.push({
      navigate: startUrl,
    });
  }

  // Step 2: Append intermediate actions
  for (const edge of pathData.edges) {
    if (edge.actionType === 'navigate' || edge.actionType === 'click') {
      if (edge.selector) {
        steps.push({
          leftClick: true,
          selector: edge.selector,
        });
      }
    } else if (edge.actionType === 'fill_submit') {
      if (edge.selector) {
        steps.push({
          leftClick: true,
          selector: edge.selector,
        });
      }
    }
    // Dynamic wait condition after action
    steps.push({
      waitFor: 'networkIdle',
    });
  }

  // Generate serialized YAML conforming to FLOW_SCHEMA.md
  const formattedYamlLines: string[] = [
    `# Flow: ${flowTitle}`,
    `url: ${startUrl}`,
    `---`,
  ];

  for (const step of steps) {
    if (step.navigate !== undefined) {
      formattedYamlLines.push(`- navigate: ${step.navigate}`);
    } else if (step.fill !== undefined) {
      formattedYamlLines.push(`- fill: ${step.fill}`);
      if (step.selector) formattedYamlLines.push(`  selector: '${step.selector}'`);
    } else if (step.leftClick !== undefined) {
      formattedYamlLines.push(`- leftClick: true`);
      if (step.selector) formattedYamlLines.push(`  selector: '${step.selector}'`);
    } else if (step.waitFor !== undefined) {
      formattedYamlLines.push(`- waitFor: ${step.waitFor}`);
    }
  }

  const yamlContent = formattedYamlLines.join('\n') + '\n';

  // Strict verification: validate with js-yaml parser
  try {
    yaml.loadAll(yamlContent);
  } catch (err: any) {
    throw new Error(`Generated YAML failed syntax validation: ${err?.message}`);
  }

  return { steps, yamlContent };
}

/**
 * Compiles all discovered graph paths into valid Tracy YAML test flows.
 */
export function generateFlowsFromCrawlGraph(
  graph: CrawlGraph,
  options: FlowCompilationOptions = {}
): DiscoveredFlow[] {
  const baseTitle = options.baseTitle || 'Auto Discovered Journey';
  const paths = findGraphPaths(graph, options.maxPaths || 20);
  const flows: DiscoveredFlow[] = [];

  let index = 1;
  for (const pathData of paths) {
    const targetNode = graph.nodes.get(pathData.path[pathData.path.length - 1]);
    const destinationName = targetNode?.pathname && targetNode.pathname !== '/'
      ? targetNode.pathname.replace(/^\//, '').replace(/\//g, ' ')
      : 'Home';

    const title = `${baseTitle} - ${destinationName} (Route ${index})`;
    const { steps, yamlContent } = compilePathToYaml(graph, pathData, title);

    flows.push({
      id: `discovered-flow-${index}-${Date.now()}`,
      name: title,
      description: `Autonomously mapped journey from ${pathData.startUrl} to ${pathData.targetUrl}`,
      steps,
      startUrl: pathData.startUrl,
      targetUrl: pathData.targetUrl,
      yamlContent,
    } as DiscoveredFlow & { yamlContent: string });

    index++;
  }

  return flows;
}
