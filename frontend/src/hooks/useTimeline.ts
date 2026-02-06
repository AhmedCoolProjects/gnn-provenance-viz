import { useState, useEffect, useCallback } from 'react';
import { AttackTimeline, GraphSnapshot, Node, GNNExplanation } from '@/types';

const API_BASE = '/api';

export function useTimeline() {
  const [timeline, setTimeline] = useState<AttackTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTimeline = useCallback(async (durationMinutes: number = 30) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE}/timeline/generate?duration_minutes=${durationMinutes}&attack_type=apt`,
        { method: 'POST' }
      );
      
      if (!response.ok) throw new Error('Failed to generate timeline');
      
      const data = await response.json();
      setTimeline(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeline = useCallback(async (timelineId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/timeline/${timelineId}`);
      if (!response.ok) throw new Error('Failed to fetch timeline');
      
      const data = await response.json();
      setTimeline(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { timeline, loading, error, generateTimeline, fetchTimeline };
}

export function useSnapshots(timelineId: string | null) {
  const [snapshots, setSnapshots] = useState<GraphSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!timelineId) return;

    const fetchSnapshots = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/timeline/${timelineId}/snapshots`);
        if (response.ok) {
          const data = await response.json();
          // Fetch full snapshot data
          const timelineRes = await fetch(`${API_BASE}/timeline/${timelineId}`);
          if (timelineRes.ok) {
            const timelineData = await timelineRes.json();
            setSnapshots(timelineData.snapshots);
          }
        }
      } catch (err) {
        console.error('Failed to fetch snapshots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, [timelineId]);

  const currentSnapshot = snapshots[currentIndex] || null;

  const goToSnapshot = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, snapshots.length - 1)));
  }, [snapshots.length]);

  const nextSnapshot = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, snapshots.length - 1));
  }, [snapshots.length]);

  const previousSnapshot = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  return {
    snapshots,
    currentSnapshot,
    currentIndex,
    loading,
    goToSnapshot,
    nextSnapshot,
    previousSnapshot,
    totalSnapshots: snapshots.length,
  };
}

export function useNodeExplanation(timelineId: string | null) {
  const [explanation, setExplanation] = useState<GNNExplanation | null>(null);
  const [loading, setLoading] = useState(false);

  const explainNode = useCallback(async (nodeId: string) => {
    if (!timelineId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/timeline/${timelineId}/explain/${nodeId}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setExplanation(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to explain node:', err);
    } finally {
      setLoading(false);
    }
  }, [timelineId]);

  return { explanation, loading, explainNode };
}
