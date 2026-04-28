import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    case 'B': return 'text-teal-400 bg-teal-400/10 border-teal-400/30'
    case 'C': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
    case 'D': return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
    case 'F': return 'text-red-400 bg-red-400/10 border-red-400/30'
    default:  return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30'
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'shortlisted': return 'text-teal-400 bg-teal-400/10'
    case 'applied':     return 'text-blue-400 bg-blue-400/10'
    case 'interview':   return 'text-violet-400 bg-violet-400/10'
    case 'offer':       return 'text-emerald-400 bg-emerald-400/10'
    case 'rejected':    return 'text-red-400 bg-red-400/10'
    case 'archived':    return 'text-zinc-500 bg-zinc-500/10'
    default:            return 'text-zinc-400 bg-zinc-400/10'
  }
}

export function appStatusColor(status: string): string {
  switch (status) {
    case 'to_apply':     return 'text-zinc-300 bg-zinc-700'
    case 'applied':      return 'text-blue-300 bg-blue-900/50'
    case 'interviewing': return 'text-violet-300 bg-violet-900/50'
    case 'offer':        return 'text-emerald-300 bg-emerald-900/50'
    case 'rejected':     return 'text-red-300 bg-red-900/50'
    case 'ghosted':      return 'text-zinc-400 bg-zinc-800'
    default:             return 'text-zinc-400 bg-zinc-800'
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatSalary(min: number, max: number, currency: string): string {
  if (!min && !max) return 'Not disclosed'
  const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
  if (!min) return `Up to ${fmt(max)} ${currency}`
  if (!max) return `${fmt(min)}+ ${currency}`
  return `${fmt(min)}–${fmt(max)} ${currency}`
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return formatDate(dateStr)
}
