'use client';

import { AttackTimeline, GraphSnapshot, SeverityColors } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { 
  AlertTriangle, 
  Activity, 
  Clock, 
  Network, 
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

interface StatsPanelProps {
  timeline: AttackTimeline | null;
  currentSnapshot: GraphSnapshot | null;
}

export function StatsPanel({ timeline, currentSnapshot }: StatsPanelProps) {
  if (!timeline || !currentSnapshot) {
    return (
      <div className="glass-panel p-4 rounded-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-secondary rounded w-3/4"></div>
          <div className="h-8 bg-secondary rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 bg-secondary rounded"></div>
            <div className="h-16 bg-secondary rounded"></div>
            <div className="h-16 bg-secondary rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const maliciousNodes = currentSnapshot.nodes.filter(n => n.is_malicious);
  const avgScore = maliciousNodes.length > 0
    ? maliciousNodes.reduce((sum, n) => sum + n.gnn_score, 0) / maliciousNodes.length
    : 0;

  const stats = [
    {
      label: 'Total Nodes',
      value: currentSnapshot.nodes.length,
      icon: Network,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Threats Detected',
      value: maliciousNodes.length,
      icon: ShieldAlert,
      color: maliciousNodes.length > 0 ? 'text-red-500' : 'text-green-500',
      bgColor: maliciousNodes.length > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
    },
    {
      label: 'Avg Threat Score',
      value: `${(avgScore * 100).toFixed(0)}%`,
      icon: Activity,
      color: avgScore > 0.7 ? 'text-red-500' : avgScore > 0.4 ? 'text-yellow-500' : 'text-green-500',
      bgColor: avgScore > 0.7 ? 'bg-red-500/10' : avgScore > 0.4 ? 'bg-yellow-500/10' : 'bg-green-500/10',
    },
  ];

  return (
    <div className="glass-panel p-4 rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-foreground">{timeline.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{timeline.description}</p>
        </div>
        <div 
          className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
          style={{ 
            backgroundColor: `${SeverityColors[timeline.severity]}20`,
            color: SeverityColors[timeline.severity]
          }}
        >
          <AlertTriangle className="w-3 h-3" />
          <span className="capitalize">{timeline.severity}</span>
        </div>
      </div>

      {/* Time range */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>{formatTimestamp(timeline.start_time)}</span>
        <span>→</span>
        <span>{formatTimestamp(timeline.end_time)}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className="p-3 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded ${stat.bgColor}`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Attack stage indicator */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Current Attack Stage</span>
          <span className="text-sm font-semibold text-foreground">{currentSnapshot.attack_stage}</span>
        </div>
        
        {/* Stage progress */}
        <div className="flex gap-1">
          {timeline.snapshots.map((snapshot, index) => (
            <div
              key={snapshot.timestamp}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                snapshot.timestamp === currentSnapshot.timestamp
                  ? 'bg-primary'
                  : new Date(snapshot.timestamp) < new Date(currentSnapshot.timestamp)
                  ? 'bg-primary/50'
                  : 'bg-secondary'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Timeline summary */}
      <div className="pt-3 border-t border-border space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Timeline Progress</span>
          <span className="text-foreground">
            {timeline.snapshots.findIndex(s => s.timestamp === currentSnapshot.timestamp) + 1} / {timeline.snapshots.length}
          </span>
        </div>
        
        {/* Attack stages list */}
        <div className="space-y-1">
          {Array.from(new Set(timeline.snapshots.map(s => s.attack_stage))).map((stage, index) => {
            const isCurrentStage = stage === currentSnapshot.attack_stage;
            const isPastStage = timeline.snapshots.findIndex(s => s.attack_stage === stage) < 
              timeline.snapshots.findIndex(s => s.timestamp === currentSnapshot.timestamp);
            
            return (
              <div 
                key={stage}
                className="flex items-center gap-2 text-sm"
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isCurrentStage 
                    ? 'bg-primary text-primary-foreground' 
                    : isPastStage
                    ? 'bg-green-500 text-white'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {isPastStage ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={isCurrentStage ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
