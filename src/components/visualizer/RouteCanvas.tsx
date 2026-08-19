import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeMouseHandler,
  EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RouteNode } from './RouteNode';
import { RouteEdge } from './RouteEdge';
import { useCrawlerStore, calculateRouteCoverage } from '@/src/stores/crawlerStore';
import { useProjectStore } from '@/src/stores/projectStore';
import type { VisualizerNodeData, VisualizerEdgeData } from '@/src/types/crawler';

const nodeTypes = {
  routeNode: RouteNode,
};

const edgeTypes = {
  routeEdge: RouteEdge,
};

export const RouteCanvas: React.FC = () => {
  const crawlNodes = useCrawlerStore((s) => s.nodes);
  const crawlEdges = useCrawlerStore((s) => s.edges);
  const selectedNodeId = useCrawlerStore((s) => s.selectedNodeId);
  const progress = useCrawlerStore((s) => s.progress);
  const setSelectedNode = useCrawlerStore((s) => s.setSelectedNode);
  const setSelectedEdge = useCrawlerStore((s) => s.setSelectedEdge);

  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );
  const projectFlows = activeProject?.flows || [];

  // Transform crawlerStore nodes to ReactFlow nodes with computed coordinates
  const nodes: Node<VisualizerNodeData>[] = useMemo(() => {
    // Map hierarchy/depth levels
    const depthBuckets = new Map<number, typeof crawlNodes>();
    crawlNodes.forEach((node) => {
      const d = node.depth ?? 0;
      if (!depthBuckets.has(d)) {
        depthBuckets.set(d, []);
      }
      depthBuckets.get(d)!.push(node);
    });

    const result: Node<VisualizerNodeData>[] = [];
    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 150;

    depthBuckets.forEach((bucketNodes, depth) => {
      const totalInDepth = bucketNodes.length;
      const startX = -((totalInDepth - 1) * HORIZONTAL_SPACING) / 2;

      bucketNodes.forEach((node, index) => {
        const coverage = calculateRouteCoverage(node.pathname, node.url, projectFlows);
        const isCurrent = progress?.currentUrl === node.url;

        result.push({
          id: node.id,
          type: 'routeNode',
          position: {
            x: startX + index * HORIZONTAL_SPACING + 400,
            y: depth * VERTICAL_SPACING + 100,
          },
          selected: selectedNodeId === node.id,
          data: {
            label: node.pathname,
            url: node.url,
            pathname: node.pathname,
            title: node.title,
            skeletonHash: node.skeletonHash,
            coverageStatus: coverage.status,
            matchedFlowNames: coverage.matchedFlowNames,
            interactiveCount: node.interactiveElements?.length ?? 0,
            isCurrentCrawlTarget: isCurrent,
          },
        });
      });
    });

    return result;
  }, [crawlNodes, projectFlows, progress?.currentUrl, selectedNodeId]);

  // Transform crawlerStore edges to ReactFlow edges
  const edges: Edge<VisualizerEdgeData>[] = useMemo(() => {
    return crawlEdges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: 'routeEdge',
      data: {
        actionType: edge.actionType,
        selector: edge.selector,
        triggerText: edge.triggerText,
      },
    }));
  }, [crawlEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  return (
    <div className="w-full h-full bg-stone-950 flex flex-col relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'routeEdge' }}
      >
        <Background color="#292524" gap={16} size={1} />
        <Controls className="bg-stone-900 border border-stone-800 text-stone-200 fill-stone-200" />
        <MiniMap
          nodeColor="#44403c"
          maskColor="rgba(12, 10, 9, 0.7)"
          className="bg-stone-900 border border-stone-800 rounded"
        />
      </ReactFlow>
    </div>
  );
};
