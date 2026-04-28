'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { jobsApi } from '@/lib/api'
import { GradeChip } from '@/components/ui/GradeChip'
import { Badge } from '@/components/ui/Badge'
import { StatCardSkeleton, JobCardSkeleton } from '@/components/ui/Skeleton'
import { formatSalary, statusColor, timeAgo } from '@/lib/utils'
import type { Job, JobStats } from '@/types'
import {
  TrendingUp, Briefcase, Send, MessageSquare, Trophy,
  ArrowRight, Zap, Star
} from 'lucide-react'

const fetcher = (fn: () => Promise<unknown>) => fn()

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useSWR<JobStats>('job-stats', () => jobsApi.stats() as Promise<JobStats>)
  const { data: topJobs, isLoading: jobsLoading } = useSWR<Job[]>('top-jobs', () =>
    jobsApi.list({ limit: 6, grade: 'A' }) as Promise<Job[]>
  )
  const { data: recentJobs, isLoading: recentLoading } = useSWR<Job[]>('recent-jobs', () =>
    jobsApi.list({ limit: 5 }) as Promise<Job[]>
  )

  const statCards = [
    {
      label: 'Total Jobs',
      value: stats?.total ?? 0,
      icon: Briefcase,
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-highlight)',
    },
    {
      label: 'Grade A Matches',
      value: stats?.grade_a ?? 0,
      icon: Trophy,
      color: '#34d399',
      bg: 'oklch(from #34d399 l c h / 0.12)',
    },
    {
      label: 'Grade B Matches',
      value: stats?.grade_b ?? 0,
      icon: Star,
      color: '#22d3ee',
      bg: 'oklch(from #22d3ee l c h / 0.12)',
    },
    {
      label: 'Applied',
      value: stats?.applied ?? 0,
      icon: Send,
      color: '#60a5fa',
      bg: 'oklch(from #60a5fa l c h / 0.12)',
    },
    {
      label: 'Interviews',
      value: stats?.interviews ?? 0,
      icon: MessageSquare,
      color: '#a78bfa',
      bg: 'oklch(from #a78bfa l c h / 0.12)',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          Welcome back 👋
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Here&apos;s your job search pipeline at a glance.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsLoading
          ? Array(5).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-xl border p-4"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: bg }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              </div>
              <div className="text-3xl font-bold tabular" style={{ color: 'var(--color-text)', lineHeight: 1 }}>
                {value}
              </div>
            </div>
          ))
        }
      </div>

      {/* Top Grade-A Jobs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={16} style={{ color: '#34d399' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Top Grade A Matches</h3>
          </div>
          <Link href="/jobs?grade=A"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--color-primary)' }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {jobsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : !topJobs?.length ? (
          <EmptyState
            icon={<Zap size={32} style={{ color: 'var(--color-primary)' }} />}
            title="No Grade A jobs yet"
            description="Run the scanner to discover and score new jobs automatically."
            action={{ label: 'Go to Scanner', href: '/scanner' }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topJobs.map(job => <MiniJobCard key={job.id} job={job} />)}
          </div>
        )}
      </section>

      {/* Recent Jobs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Recently Added</h3>
          </div>
          <Link href="/jobs"
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--color-primary)' }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {recentLoading ? (
            <div className="p-4 space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton h-4 w-8" />
                  <div className="skeleton h-4 flex-1" />
                  <div className="skeleton h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !recentJobs?.length ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No jobs yet — add your first job or run a scan.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-divider)' }}>
                  {['Grade', 'Job', 'Company', 'Status', 'Added'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium"
                      style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job, i) => (
                  <tr
                    key={job.id}
                    style={{ borderBottom: i < recentJobs.length - 1 ? '1px solid var(--color-divider)' : 'none' }}
                    className="transition-colors"
                  >
                    <td className="px-4 py-3">
                      <GradeChip grade={job.grade} score={job.score} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`}
                        className="font-medium hover:underline text-sm"
                        style={{ color: 'var(--color-text)' }}>
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {job.company}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusColor(job.status)}>{job.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs tabular" style={{ color: 'var(--color-text-faint)' }}>
                      {timeAgo(job.scraped_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

function MiniJobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div
        className="rounded-xl border p-4 h-full transition-all duration-150 hover:shadow-md"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{job.title}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{job.company}</div>
          </div>
          <GradeChip grade={job.grade} score={job.score} size="sm" />
        </div>
        {job.match_summary && (
          <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
            {job.match_summary}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          {job.salary_min || job.salary_max ? (
            <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
            </span>
          ) : null}
          {job.remote && (
            <Badge className="text-teal-400 bg-teal-400/10">Remote</Badge>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({
  icon, title, description, action
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 opacity-60">{icon}</div>
      <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text)' }}>{title}</h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
          style={{ background: 'var(--color-primary)' }}
        >
          {action.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}
