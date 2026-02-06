'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Node, Edge, GraphSnapshot, NodeTypeColors, EdgeTypeStyles } from '@/types';
import { getScoreColor } from '@/lib/utils';

cytoscape.use(dagre);

interface GraphViewerProps {
  snapshot: GraphSnapshot | null;
  selectedNode: Node | null;
  onNodeSelect: (node: Node | null) => void;
  highlightPath?: string[];
}

export function GraphViewer({ snapshot, selectedNode, onNodeSelect, highlightPath }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'width': 'mapData(gnnScore, 0, 1, 30, 60)',
            'height': 'mapData(gnnScore, 0, 1, 30, 60)',
            'border-width': 'mapData(gnnScore, 0, 1, 1, 4)',
            'border-color': '#fff',
            'color': '#fff',
            'font-size': '10px',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-outline-width': 2,
            'text-outline-color': '#000',
            'opacity': 0.9,
          },
        },
        {
          selector: 'node[?isMalicious]',
          style: {
            'border-color': '#ef4444',
            'border-width': 4,
            'shadow-blur': 20,
            'shadow-color': '#ef4444',
            'shadow-opacity': 0.8,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 6,
            'border-color': '#3b82f6',
            'shadow-blur': 30,
            'shadow-color': '#3b82f6',
            'shadow-opacity': 1,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '8px',
            'color': '#94a3b8',
            'text-outline-width': 2,
            'text-outline-color': '#0f172a',
            'arrow-scale': 1.5,
          },
        },
        {
          selector: 'edge[?isHighlighted]',
          style: {
            'width': 4,
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'z-index': 999,
          },
        },
        {
          selector: '.faded',
          style: {
            'opacity': 0.2,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'opacity': 1,
            'z-index': 999,
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        padding: 20,
        spacingFactor: 1.2,
        animate: true,
        animationDuration: 500,
      } as any,
      wheelSensitivity: 0.3,
      minZoom: 0.2,
      maxZoom: 3,
    });

    cyRef.current = cy;
    setIsReady(true);

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data();
      onNodeSelect(nodeData.rawNode);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onNodeSelect(null);
      }
    });

    // Hover effects
    cy.on('mouseover', 'node', (evt) => {
      evt.target.animate({
        style: { 'shadow-blur': 30 },
      }, { duration: 200 });
    });

    cy.on('mouseout', 'node', (evt) => {
      if (!evt.target.selected()) {
        evt.target.animate({
          style: { 'shadow-blur': evt.target.data('isMalicious') ? 20 : 0 },
        }, { duration: 200 });
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [onNodeSelect]);

  // Update graph data when snapshot changes
  useEffect(() => {
    if (!cyRef.current || !snapshot) return;

    const cy = cyRef.current;

    // Convert nodes to Cytoscape format
    const cyNodes = snapshot.nodes.map((node) => ({
      data: {
        id: node.id,
        label: truncateLabel(node.label, 15),
        color: getNodeColor(node),
        type: node.type,
        gnnScore: node.gnn_score,
        isMalicious: node.is_malicious,
        rawNode: node,
      },
    }));

    // Convert edges to Cytoscape format
    const cyEdges = snapshot.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        color: EdgeTypeStyles[edge.type]?.color || '#64748b',
        label: EdgeTypeStyles[edge.type]?.label || edge.type,
        type: edge.type,
      },
    }));

    // Remove existing elements and add new ones
    cy.elements().remove();
    cy.add([...cyNodes, ...cyEdges]);

    // Apply layout
    const layout = cy.layout({
      name: 'dagre',
      rankDir: 'TB',
      padding: 20,
      spacingFactor: 1.2,
      animate: true,
      animationDuration: 500,
      fit: true,
    } as any);

    layout.run();

    // Fit to view
    cy.fit(cy.nodes(), 50);
  }, [snapshot]);

  // Highlight selected node and its neighborhood
  useEffect(() => {
    if (!cyRef.current || !snapshot) return;

    const cy = cyRef.current;

    // Reset all styles
    cy.elements().removeClass('faded highlighted');

    if (selectedNode) {
      const selectedCyNode = cy.getElementById(selectedNode.id);
      
      if (selectedCyNode.length > 0) {
        // Select the node
        selectedCyNode.select();

        // Get connected edges and nodes
        const connectedEdges = selectedCyNode.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes();

        // Fade everything except selected node and its neighborhood
        cy.elements().not(selectedCyNode).not(connectedEdges).not(connectedNodes).addClass('faded');
        selectedCyNode.add(connectedEdges).add(connectedNodes).addClass('highlighted');

        // Center on selected node
        cy.animate({
          fit: {
            eles: selectedCyNode,
            padding: 100,
          },
        }, { duration: 500 });
      }
    } else {
      cy.elements().unselect();
    }
  }, [selectedNode, snapshot]);

  // Highlight attack path
  useEffect(() => {
    if (!cyRef.current || !highlightPath || highlightPath.length === 0) return;

    const cy = cyRef.current;

    // Reset edge highlights
    cy.edges().data('isHighlighted', false);

    // Highlight edges along the path
    for (let i = 0; i < highlightPath.length - 1; i++) {
      const sourceId = highlightPath[i];
      const targetId = highlightPath[i + 1];
      
      const edge = cy.edges().filter((e) => 
        (e.data('source') === sourceId && e.data('target') === targetId) ||
        (e.data('source') === targetId && e.data('target') === sourceId)
      );

      edge.data('isHighlighted', true);
    }
  }, [highlightPath]);

  const getNodeColor = (node: Node): string => {
    if (node.is_malicious) {
      return getScoreColor(node.gnn_score);
    }
    return NodeTypeColors[node.type];
  };

  const truncateLabel = (label: string, maxLength: number): string => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + '...';
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="cy-graph rounded-lg border border-border" />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass-panel p-3 rounded-lg text-xs">
        <div className="font-semibold mb-2 text-foreground">Node Types</div>
        <div className="space-y-1">
          {Object.entries(NodeTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="capitalize text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-border">
          <div className="font-semibold mb-2 text-foreground">Threat Level</div>
          <div className="space-y-1">
            {[
              { score: 0.95, label: 'Critical' },
              { score: 0.8, label: 'High' },
              { score: 0.6, label: 'Medium' },
              { score: 0.3, label: 'Low' },
            ].map(({ score, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full border border-white" 
                  style={{ backgroundColor: getScoreColor(score) }}
                />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => cyRef.current?.fit(cyRef.current.nodes(), 50)}
          className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          title="Fit to view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
          className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}
          className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
