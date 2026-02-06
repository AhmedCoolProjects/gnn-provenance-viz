export type NodeType = 'process' | 'file' | 'socket' | 'registry';

export type EdgeType = 'fork' | 'read' | 'write' | 'execute' | 'connect' | 'accept' | 'load';

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  timestamp: string;
  properties: Record<string, any>;
  gnn_score: number;
  is_malicious: boolean;
  explanation?: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  timestamp: string;
  properties: Record<string, any>;
}

export interface GraphSnapshot {
  timestamp: string;
  nodes: Node[];
  edges: Edge[];
  attack_stage?: string;
}

export interface AttackTimeline {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  snapshots: GraphSnapshot[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  total_nodes: number;
  malicious_nodes: number;
}

export interface GNNExplanation {
  node_id: string;
  score: number;
  top_features: string[];
  neighbor_influence: Record<string, number>;
  attack_path_probability: number;
}

export interface AttackPathNode {
  id: string;
  type: NodeType;
  label: string;
  timestamp: string;
  gnn_score: number;
  explanation?: string;
}

export const NodeTypeColors: Record<NodeType, string> = {
  process: '#3b82f6',    // Blue
  file: '#10b981',       // Green
  socket: '#f59e0b',     // Amber
  registry: '#8b5cf6',   // Purple
};

export const NodeTypeIcons: Record<NodeType, string> = {
  process: 'cpu',
  file: 'file',
  socket: 'globe',
  registry: 'database',
};

export const EdgeTypeStyles: Record<EdgeType, { color: string; label: string }> = {
  fork: { color: '#6366f1', label: 'forks' },
  read: { color: '#10b981', label: 'reads' },
  write: { color: '#f59e0b', label: 'writes' },
  execute: { color: '#ef4444', label: 'executes' },
  connect: { color: '#ec4899', label: 'connects' },
  accept: { color: '#8b5cf6', label: 'accepts' },
  load: { color: '#06b6d4', label: 'loads' },
};

export const SeverityColors = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};
