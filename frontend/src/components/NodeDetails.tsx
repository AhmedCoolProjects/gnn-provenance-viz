'use client';

import { Node, GNNExplanation } from '@/types';
import { formatTimestamp, getScoreColor, getScoreLabel } from '@/lib/utils';
import { Cpu, File, Globe, Database, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface NodeDetailsProps {
  node: Node | null;
  explanation: GNNExplanation | null;
  loading: boolean;
}

const typeIcons = {
  process: Cpu,
  file: File,
  socket: Globe,
  registry: Database,
};

export function NodeDetails({ node, explanation, loading }: NodeDetailsProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'explanation'>('details');

  if (!node) {
    return (
      <div className="glass-panel p-4 rounded-lg h-full flex flex-col items-center justify-center text-muted-foreground">
        <Info className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Select a node to view details</p>
        <p className="text-xs mt-1">Click on any node in the graph</p>
      </div>
    );
  }

  const TypeIcon = typeIcons[node.type];

  return (
    <div className="glass-panel rounded-lg h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${getScoreColor(node.gnn_score)}20` }}
          >
            <TypeIcon 
              className="w-5 h-5" 
              style={{ color: getScoreColor(node.gnn_score) }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate" title={node.label}>
              {node.label}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="capitalize">{node.type}</span>
              <span>•</span>
              <span>{node.id}</span>
            </div>
          </div>
        </div>

        {/* GNN Score Badge */}
        <div className="mt-3 flex items-center gap-2">
          <div 
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ 
              backgroundColor: `${getScoreColor(node.gnn_score)}20`,
              color: getScoreColor(node.gnn_score)
            }}
          >
            GNN Score: {(node.gnn_score * 100).toFixed(1)}%
          </div>
          {node.is_malicious && (
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {getScoreLabel(node.gnn_score)}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'details' 
              ? 'text-foreground border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('explanation')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'explanation' 
              ? 'text-foreground border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          GNN Explanation
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'details' ? (
          <div className="space-y-4">
            {/* Timestamp */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Timestamp</label>
              <p className="text-sm text-foreground mt-1">{formatTimestamp(node.timestamp)}</p>
            </div>

            {/* Properties */}
            {Object.keys(node.properties).length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Properties</label>
                <div className="mt-1 space-y-1">
                  {Object.entries(node.properties).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[80px]">{key}:</span>
                      <span className="text-foreground font-mono text-xs break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation if malicious */}
            {node.explanation && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Alert</label>
                <div className="mt-1 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{node.explanation}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : explanation ? (
              <>
                {/* Score breakdown */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Confidence Score</label>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground">{(explanation.score * 100).toFixed(1)}%</span>
                      <span className="text-muted-foreground">{getScoreLabel(explanation.score)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${explanation.score * 100}%`,
                          backgroundColor: getScoreColor(explanation.score)
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Top Features */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Key Indicators</label>
                  <div className="mt-2 space-y-2">
                    {explanation.top_features.map((feature, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                      >
                        <ChevronRight className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attack Path Probability */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Attack Path Probability</label>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground">{(explanation.attack_path_probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${explanation.attack_path_probability * 100}%`,
                          backgroundColor: getScoreColor(explanation.attack_path_probability)
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Likelihood that this node is part of an active attack chain
                    </p>
                  </div>
                </div>

                {/* Neighbor Influence */}
                {Object.keys(explanation.neighbor_influence).length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Neighbor Influence</label>
                    <div className="mt-2 space-y-1">
                      {Object.entries(explanation.neighbor_influence)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([neighborId, score]) => (
                          <div key={neighborId} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-mono text-xs truncate max-w-[150px]">
                              {neighborId}
                            </span>
                            <span 
                              className="font-semibold"
                              style={{ color: getScoreColor(score) }}
                            >
                              {(score * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No explanation available</p>
                <p className="text-xs mt-1">Select a suspicious node to see GNN insights</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
