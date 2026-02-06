import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getScoreColor(score: number): string {
  if (score >= 0.9) return '#ef4444'; // Red
  if (score >= 0.7) return '#f97316'; // Orange
  if (score >= 0.5) return '#eab308'; // Yellow
  return '#22c55e'; // Green
}

export function getScoreLabel(score: number): string {
  if (score >= 0.9) return 'Critical';
  if (score >= 0.7) return 'High';
  if (score >= 0.5) return 'Medium';
  return 'Low';
}
