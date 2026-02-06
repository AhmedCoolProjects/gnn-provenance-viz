'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTimeline, useSnapshots, useNodeExplanation } from '@/hooks/useTimeline';
import { TimeScrubber } from '@/components/TimeScrubber';
import { NodeDetails } from '@/components/NodeDetails';
import { StatsPanel } from '@/components/StatsPanel';
import { Node, AttackPathNode } from '@/types';
import { 
  Shield, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle,
  Info,
  Github
} from 'lucide-react';

// Dynamic import for Cytoscape to avoid SSR issues
const GraphViewer = dynamic(
  () => import('@/components/GraphViewer').then((mod) => mod.GraphViewer),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full bg-secondary/30 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )}
);

export default function Dashboard() {
  const { timeline, loading: timelineLoading, generateTimeline } = useTimeline();
  const { 
    snapshots, 
    currentSnapshot, 
    currentIndex, 
    loading: snapshotsLoading,
    goToSnapshot,
    nextSnapshot,
  } = useSnapshots(timeline?.id || null);
  
  const { explanation, loading: explanationLoading, explainNode } = useNodeExplanation(timeline?.id || null);
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [attackPath, setAttackPath] = useState<AttackPathNode[]>([]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (currentIndex < snapshots.length - 1) {
        nextSnapshot();
      } else {
        setIsPlaying(false);
      }
    }, 2000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, snapshots.length, playbackSpeed, nextSnapshot]);

  // Fetch attack path when timeline changes
  useEffect(() => {
    if (!timeline?.id) return;

    const fetchAttackPath = async () => {
      try {
        const response = await fetch(`/api/timeline/${timeline.id}/attack-path`);
        if (response.ok) {
          const data = await response.json();
          setAttackPath(data.attack_path);
        }
      } catch (err) {
        console.error('Failed to fetch attack path:', err);
      }
    };

    fetchAttackPath();
  }, [timeline?.id]);

  // Explain selected node
  useEffect(() => {
    if (selectedNode && selectedNode.is_malicious) {
      explainNode(selectedNode.id);
    }
  }, [selectedNode, explainNode]);

  const handleGenerateTimeline = useCallback(async () => {
    setSelectedNode(null);
    setIsPlaying(false);
    await generateTimeline(30);
  }, [generateTimeline]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const getHighlightPath = useCallback(() => {
    if (!attackPath.length) return [];
    return attackPath.map(n => n.id);
  }, [attackPath]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">GNN-Provenance-Viz</h1>
              <p className="text-xs text-muted-foreground">APT Attack Forensics Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <button
              onClick={handleGenerateTimeline}
              disabled={timelineLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {timelineLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{timelineLoading ? 'Generating...' : 'Generate Attack'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 overflow-hidden">
        {!timeline ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to GNN-Provenance-Viz</h2>
              <p className="text-muted-foreground mb-6">
                Visualize Advanced Persistent Threat attacks detected by Graph Neural Networks. 
                Generate a synthetic attack timeline to begin exploring the provenance graph.
              </p>
              <button
                onClick={handleGenerateTimeline}
                disabled={timelineLoading}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
              >
                {timelineLoading ? 'Generating Timeline...' : 'Generate Attack Timeline'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full grid grid-cols-12 gap-4">
            {/* Left sidebar - Stats */}
            <div className="col-span-12 lg:col-span-3 space-y-4 h-full overflow-auto">
              <StatsPanel timeline={timeline} currentSnapshot={currentSnapshot} />
              
              {/* Attack Path Summary */}
              {attackPath.length > 0 && (
                <div className="glass-panel p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Attack Chain
                  </h3>
                  <div className="space-y-2">
                    {attackPath.slice(0, 5).map((node, index) => (
                      <div 
                        key={node.id}
                        className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg text-sm"
                      >
                        <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{node.label}</div>
                          <div className="text-xs text-muted-foreground">{node.type}</div>
                        </div>
                        <span className="text-xs font-semibold text-red-500">
                          {(node.gnn_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Center - Graph viewer */}
            <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 h-full">
              <div className="flex-1 glass-panel rounded-lg overflow-hidden">
                <GraphViewer
                  snapshot={currentSnapshot}
                  selectedNode={selectedNode}
                  onNodeSelect={setSelectedNode}
                  highlightPath={getHighlightPath()}
                />
              </div>
              
              {/* Time scrubber */}
              <TimeScrubber
                snapshots={snapshots}
                currentIndex={currentIndex}
                onIndexChange={goToSnapshot}
                isPlaying={isPlaying}
                onPlayPause={togglePlayback}
                playbackSpeed={playbackSpeed}
                onSpeedChange={setPlaybackSpeed}
              />
            </div>

            {/* Right sidebar - Node details */}
            <div className="col-span-12 lg:col-span-3 h-full">
              <NodeDetails 
                node={selectedNode} 
                explanation={explanation}
                loading={explanationLoading}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-3 bg-card/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>GNN-Provenance-Viz v1.0.0</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">FastAPI + Next.js + Cytoscape.js</span>
          </div>
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3" />
            <span>Click nodes to inspect • Use time scrubber to replay attack</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
