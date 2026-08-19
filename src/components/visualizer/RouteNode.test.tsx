import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { RouteNode } from './RouteNode';
import type { VisualizerNodeData } from '@/src/types/crawler';

describe('RouteNode', () => {
  const defaultData: VisualizerNodeData = {
    label: '/dashboard',
    url: 'http://localhost:3000/dashboard',
    pathname: '/dashboard',
    title: 'User Dashboard',
    skeletonHash: 'sk_abc123',
    coverageStatus: 'covered',
    matchedFlowNames: ['LoginFlow', 'SettingsFlow'],
    interactiveCount: 8,
    isCurrentCrawlTarget: false,
  };

  const renderNode = (data: Partial<VisualizerNodeData> = {}) => {
    return render(
      <ReactFlowProvider>
        <RouteNode
          id="node_1"
          data={{ ...defaultData, ...data }}
          type="routeNode"
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          selectable={true}
          deletable={false}
          draggable={true}
        />
      </ReactFlowProvider>
    );
  };

  it('renders pathname, title, and interactive element count', () => {
    renderNode();
    expect(screen.getByText('/dashboard')).toBeInTheDocument();
    expect(screen.getByText('User Dashboard')).toBeInTheDocument();
    expect(screen.getByText('8 interactives')).toBeInTheDocument();
  });

  it('renders covered status badge with flow count', () => {
    renderNode({ coverageStatus: 'covered', matchedFlowNames: ['Flow1', 'Flow2'] });
    expect(screen.getByText('Covered (2 flows)')).toBeInTheDocument();
  });

  it('renders partial status badge with flow count', () => {
    renderNode({ coverageStatus: 'partial', matchedFlowNames: ['Flow1'] });
    expect(screen.getByText('Partial (1 flow)')).toBeInTheDocument();
  });

  it('renders unvisited status badge when uncovered', () => {
    renderNode({ coverageStatus: 'unvisited', matchedFlowNames: [] });
    expect(screen.getByText('Uncovered')).toBeInTheDocument();
  });

  it('renders active target pulsing ring when isCurrentCrawlTarget is true', () => {
    const { container } = renderNode({ isCurrentCrawlTarget: true });
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
