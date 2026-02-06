'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { GraphSnapshot } from '@/types';
import { formatTimestamp } from '@/lib/utils';

interface TimeScrubberProps {
  snapshots: GraphSnapshot[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
}

export function TimeScrubber({
  snapshots,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayPause,
  playbackSpeed = 1,
  onSpeedChange,
}: TimeScrubberProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const currentSnapshot = snapshots[currentIndex];
  const totalSnapshots = snapshots.length;

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newIndex = Math.floor(percentage * (totalSnapshots - 1));
    
    onIndexChange(newIndex);
  }, [totalSnapshots, onIndexChange]);

  const goToStart = useCallback(() => {
    onIndexChange(0);
  }, [onIndexChange]);

  const goToEnd = useCallback(() => {
    onIndexChange(totalSnapshots - 1);
  }, [onIndexChange, totalSnapshots]);

  const stepBackward = useCallback(() => {
    onIndexChange(Math.max(0, currentIndex - 1));
  }, [currentIndex, onIndexChange]);

  const stepForward = useCallback(() => {
    onIndexChange(Math.min(totalSnapshots - 1, currentIndex + 1));
  }, [currentIndex, totalSnapshots, onIndexChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepForward();
          break;
        case 'Home':
          e.preventDefault();
          goToStart();
          break;
        case 'End':
          e.preventDefault();
          goToEnd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, stepBackward, stepForward, goToStart, goToEnd]);

  const getProgressPercentage = () => {
    if (totalSnapshots <= 1) return 0;
    return (currentIndex / (totalSnapshots - 1)) * 100;
  };

  const getSnapshotPosition = (index: number) => {
    if (totalSnapshots <= 1) return 0;
    return (index / (totalSnapshots - 1)) * 100;
  };

  const getSeverityColor = (snapshot: GraphSnapshot) => {
    const maliciousCount = snapshot.nodes.filter(n => n.is_malicious).length;
    if (maliciousCount >= 5) return 'bg-red-500';
    if (maliciousCount >= 3) return 'bg-orange-500';
    if (maliciousCount >= 1) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="glass-panel p-4 rounded-lg">
      {/* Playback controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goToStart}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Go to start (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={stepBackward}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Previous (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayPause}
            className={`p-3 rounded-lg transition-colors ${
              isPlaying 
                ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
            }`}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={stepForward}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Next (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToEnd}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Go to end (End)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Speed control */}
          {onSpeedChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                className="bg-secondary text-foreground text-sm rounded px-2 py-1 border border-border"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          )}

          {/* Snapshot counter */}
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{currentIndex + 1}</span>
            {' / '}
            <span>{totalSnapshots}</span>
          </div>
        </div>
      </div>

      {/* Timeline slider */}
      <div className="relative">
        <div
          ref={sliderRef}
          className="relative h-8 bg-secondary/50 rounded-lg cursor-pointer overflow-hidden"
          onClick={handleSliderClick}
          onMouseMove={(e) => {
            if (!sliderRef.current) return;
            const rect = sliderRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            const index = Math.floor(percentage * (totalSnapshots - 1));
            setHoveredIndex(index);
          }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Timeline background with stage indicators */}
          {snapshots.map((snapshot, index) => {
            const left = getSnapshotPosition(index);
            const width = index < snapshots.length - 1 
              ? getSnapshotPosition(index + 1) - left 
              : 100 - left;
            
            return (
              <div
                key={snapshot.timestamp}
                className={`absolute top-0 h-full transition-all ${getSeverityColor(snapshot)}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  opacity: 0.3,
                }}
              />
            );
          })}

          {/* Progress bar */}
          <div
            className="absolute top-0 left-0 h-full bg-primary/30 transition-all duration-200"
            style={{ width: `${getProgressPercentage()}%` }}
          />

          {/* Tick marks */}
          {snapshots.map((_, index) => (
            <div
              key={index}
              className="absolute top-0 w-0.5 h-full bg-border"
              style={{ left: `${getSnapshotPosition(index)}%` }}
            />
          ))}

          {/* Current position indicator */}
          <div
            className="absolute top-0 w-1 h-full bg-primary shadow-lg transition-all duration-200"
            style={{ left: `${getProgressPercentage()}%` }}
          />

          {/* Hover indicator */}
          {hoveredIndex !== null && hoveredIndex !== currentIndex && (
            <div
              className="absolute top-0 w-0.5 h-full bg-foreground/50 transition-all"
              style={{ left: `${getSnapshotPosition(hoveredIndex)}%` }}
            />
          )}
        </div>

        {/* Hover tooltip */}
        {hoveredIndex !== null && snapshots[hoveredIndex] && (
          <div
            className="absolute -top-12 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg shadow-lg text-xs whitespace-nowrap z-50 border border-border"
            style={{ left: `${getSnapshotPosition(hoveredIndex)}%` }}
          >
            <div className="font-semibold">{formatTimestamp(snapshots[hoveredIndex].timestamp)}</div>
            <div className="text-muted-foreground">{snapshots[hoveredIndex].attack_stage}</div>
          </div>
        )}
      </div>

      {/* Current snapshot info */}
      {currentSnapshot && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">Stage: </span>
              <span className="font-semibold text-foreground">{currentSnapshot.attack_stage}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Time: </span>
              <span className="font-semibold text-foreground">{formatTimestamp(currentSnapshot.timestamp)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">Nodes: </span>
              <span className="font-semibold text-foreground">{currentSnapshot.nodes.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Edges: </span>
              <span className="font-semibold text-foreground">{currentSnapshot.edges.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Threats: </span>
              <span className={`font-semibold ${
                currentSnapshot.nodes.filter(n => n.is_malicious).length > 0 
                  ? 'text-red-500' 
                  : 'text-green-500'
              }`}>
                {currentSnapshot.nodes.filter(n => n.is_malicious).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <span className="font-semibold">Shortcuts:</span> Space to play/pause, ← → to step, Home/End to jump
      </div>
    </div>
  );
}
