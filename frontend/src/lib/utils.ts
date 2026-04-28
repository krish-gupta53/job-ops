import { clsx, type ClassValue } from 'clsx';
import type { JobGrade, JobStatus, ApplicationStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ── Grade helpers ─────────────────────────────────────────────
export const gradeConfig: Record<
  JobGrade,
  { label: string; color: string; bg: string; ring: string; score: string }
> = {
  A: {
    label: 'A',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    ring: 'ring-emerald-500/30',
    score: '4.5 – 5.0',
  },
  B: {
    label: 'B',
    color: 'text-teal-400',
    bg: 'bg-teal-500/15',
    ring: 'ring-teal-500/30',
    score: '3.8 – 4.4',
  },
  C: {
    label: 'C',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    ring: 'ring-amber-500/30',
    score: '3.0 – 3.7',
  },
  D: {
    label: 'D',
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    ring: 'ring-orange-500/30',
    score: '2.0 – 2.9',
  },
  F: {
    label: 'F',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    ring: 'ring-red-500/30',
    score: '0 – 1.9',
  },
  '': {
    label: '?',
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/15',
    ring: 'ring-zinc-500/30',
    score: 'Not scored',
  },
};

export function getGradeConfig(grade: JobGrade) {
  return gradeConfig[grade] ?? gradeConfig[''];
}

// ── Status helpers ────────────────────────────────────────────
export const jobStatusConfig: Record<
  JobStatus,
  { label: string; color: string; bg: string }
> = {
  new: { label: 'New', color: 'text-zinc-300', bg: 'bg-zinc-700/50' },
  shortlisted: { label: 'Shortlisted', color: 'text-teal-300', bg: 'bg-teal-900/40' },
  applied: { label: 'Applied', color: 'text-blue-300', bg: 'bg-blue-900/40' },
  interview: { label: 'Interview', color: 'text-violet-300', bg: 'bg-violet-900/40' },
  offer: { label: 'Offer 🎉', color: 'text-emerald-300', bg: 'bg-emerald-900/40' },
  rejected: { label: 'Rejected', color: 'text-red-300', bg: 'bg-red-900/40' },
  archived: { label: 'Archived', color: 'text-zinc-500', bg: 'bg-zinc-800/50' },
};

export const appStatusConfig: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; colIdx: number }
> = {
  to_apply: { label: 'To Apply', color: 'text-zinc-300', bg: 'bg-zinc-700/40', colIdx: 0 },
  applied: { label: 'Applied', color: 'text-blue-300', bg: 'bg-blue-900/40', colIdx: 1 },
  interviewing: { label: 'Interviewing', color: 'text-violet-300', bg: 'bg-violet-900/40', colIdx: 2 },
  offer: { label: 'Offer 🎉', color: 'text-emerald-300', bg: 'bg-emerald-900/40', colIdx: 3 },
  rejected: { label: 'Rejected', color: 'text-red-300', bg: 'bg-red-900/40', colIdx: 4 },
  ghosted: { label: 'Ghosted', color: 'text-zinc-500', bg: 'bg-zinc-800/50', colIdx: 5 },
};

// ── Date helpers ──────────────────────────────────────────────
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Salary formatter ──────────────────────────────────────────
export function formatSalary(
  min: number,
  max: number,
  currency: string
): string {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n: number) =>
    currency === 'INR'
      ? `₹${(n / 100000).toFixed(1)}L`
      : `$${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `From ${fmt(min)}`;
}

// ── Score bar ─────────────────────────────────────────────────
export function scoreToPercent(score: number): number {
  return Math.round((score / 5) * 100);
}

// ── SWR fetcher ───────────────────────────────────────────────
export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
