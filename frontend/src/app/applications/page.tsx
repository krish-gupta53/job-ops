'use client'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { applicationsApi, jobsApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { appStatusColor, formatDate, timeAgo } from '@/lib/utils'
import type { Application, AppStatus, Job } from '@/types'
import {
  Send, MessageSquare, Trophy, XCircle, PackageOpen,
  ClipboardList, Wand2, ExternalLink, ChevronRight, Loader2
} from 'lucide-react'

const COLUMNS: { key: AppStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'to_apply',     label: 'To Apply',     icon: <ClipboardList size={14} />, color: 'text-zinc-300' },
  { key: 'applied',      label: 'Applied',       icon: <Send size={14} />,          color: 'text-blue-300' },
  { key: 'interviewing', label: 'Interviewing',  icon: <MessageSquare size={14} />, color: 'text-violet-300' },
  { key: 'offer',        label: 'Offer',         icon: <Trophy size={14} />,        color: 'text-emerald-300' },
  { key: 'rejected',     label: 'Rejected',      icon: <XCircle size={14} />,       color: 'text-red-300' },
  // Ghost does not exist in lucide-react — replaced with PackageOpen
  { key: 'ghosted',      label: 'Ghosted',       icon: <PackageOpen size={14} />,   color: 'text-zinc-500' },
]

export default function ApplicationsPage() {
  const { data: apps, isLoading } = useSWR<Application[]>('applications', applicationsApi.list)
  const [selected, setSelected] = useState<Application | null>(null)
  const [generating, setGenerating] = useState<{ id: string; type: 'cover' | 'outreach' } | null>(null)

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = apps?.filter(a => a.status === col.key) ?? []
    return acc
  }, {} as Record<AppStatus, Application[]>)

  async function handleGenerate(id: string, type: 'cover' | 'outreach') {
    setGenerating({ id, type })
    try {
      if (type === 'cover') await applicationsApi.generateCoverLetter(id)
      else await applicationsApi.generateOutreach(id)
      await mutate('applications')
      const refreshed = await applicationsApi.get(id) as Application
      setSelected(refreshed)
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(null)
    }
  }

  async function handleStatusChange(id: string, status: AppStatus) {
    await applicationsApi.update(id, { status })
    await mutate('applications')
    setSelected(prev => prev && prev.id === id ? { ...prev, status } : prev)
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Applications</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Track every application through the pipeline.
          </p>
        </div>
        <Badge className="text-teal-400 bg-teal-400/10">
          {apps?.length ?? 0} total
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl border p-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <Skeleton className="h-4 w-20 mb-3" />
              <div className="space-y-2">
                {Array(2).fill(0).map((_, j) => <Skeleton key={j} className="h-16 rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      ) : !apps?.length ? (
        <EmptyApplications />
      ) : (
        /* Kanban */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
          {COLUMNS.map(col => (
            <div key={col.key}>
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <span className={col.color}>{col.icon}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{col.label}</span>
                <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--color-text-faint)' }}>
                  {grouped[col.key].length}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[col.key].length === 0 ? (
                  <div
                    className="rounded-xl border border-dashed p-4 text-center"
                    style={{ borderColor: 'var(--color-border)', minHeight: 64 }}
                  >
                    <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Empty</span>
                  </div>
                ) : (
                  grouped[col.key].map(app => (
                    <AppCard key={app.id} app={app} onClick={() => setSelected(app)} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Application Detail"
        size="lg"
      >
        {selected && (
          <AppDetail
            app={selected}
            onStatusChange={handleStatusChange}
            onGenerate={handleGenerate}
            generating={generating}
          />
        )}
      </Modal>
    </div>
  )
}

function AppCard({ app, onClick }: { app: Application; onClick: () => void }) {
  const { data: job } = useSWR<Job>(app.job_id ? `job-${app.job_id}` : null,
    () => jobsApi.get(app.job_id) as Promise<Job>
  )

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border p-3 transition-all hover:shadow-md"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
        {job?.title ?? '...'}
      </div>
      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
        {job?.company ?? ''}
      </div>
      {app.applied_at && (
        <div className="mt-2 text-xs" style={{ color: 'var(--color-text-faint)' }}>
          {timeAgo(app.applied_at)}
        </div>
      )}
      {app.next_followup && (
        <Badge className="mt-1.5 text-amber-400 bg-amber-400/10 text-xs">
          Follow up {formatDate(app.next_followup)}
        </Badge>
      )}
    </button>
  )
}

function AppDetail({
  app, onStatusChange, onGenerate, generating
}: {
  app: Application
  onStatusChange: (id: string, status: AppStatus) => void
  onGenerate: (id: string, type: 'cover' | 'outreach') => void
  generating: { id: string; type: string } | null
}) {
  const { data: job } = useSWR<Job>(app.job_id ? `job-${app.job_id}` : null,
    () => jobsApi.get(app.job_id) as Promise<Job>
  )
  const [tab, setTab] = useState<'cover' | 'outreach' | 'notes' | 'prep'>('cover')

  const TABS = [
    { key: 'cover' as const, label: 'Cover Letter' },
    { key: 'outreach' as const, label: 'Outreach' },
    { key: 'prep' as const, label: 'Interview Prep' },
    { key: 'notes' as const, label: 'Notes' },
  ]

  const content = {
    cover: app.cover_letter,
    outreach: app.outreach_message,
    prep: app.interview_prep,
    notes: app.notes,
  }

  return (
    <div className="space-y-5">
      {/* Job info */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{job?.title ?? '\u2014'}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{job?.company}</div>
        </div>
        {job?.apply_url && (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost"><ExternalLink size={14} /> Open Job</Button>
          </a>
        )}
      </div>

      {/* Status changer */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Move to stage</p>
        <div className="flex flex-wrap gap-1.5">
          {COLUMNS.map(col => (
            <button
              key={col.key}
              onClick={() => onStatusChange(app.id, col.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                app.status === col.key ? 'border-current' : 'opacity-50 hover:opacity-80'
              }`}
              style={{
                borderColor: app.status === col.key ? 'var(--color-primary)' : 'var(--color-border)',
                background: app.status === col.key ? 'var(--color-primary-highlight)' : 'transparent',
                color: app.status === col.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 mb-3" style={{ borderBottom: '1px solid var(--color-divider)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-2 text-xs font-medium transition-colors"
              style={{
                color: tab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: tab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(tab === 'cover' || tab === 'outreach') && (
          <div className="space-y-3">
            {!content[tab] ? (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>Not generated yet.</p>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!!generating}
                  onClick={() => onGenerate(app.id, tab)}
                >
                  {generating?.id === app.id && generating.type === tab
                    ? <><Loader2 size={14} className="animate-spin" /> Generating\u2026</>
                    : <><Wand2 size={14} /> Generate {tab === 'cover' ? 'Cover Letter' : 'Outreach'}</>
                  }
                </Button>
              </div>
            ) : (
              <>
                <div
                  className="rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: 'var(--color-surface-offset)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    maxHeight: 280,
                    overflowY: 'auto',
                  }}
                >
                  {content[tab]}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!!generating}
                  onClick={() => onGenerate(app.id, tab)}
                >
                  {generating?.id === app.id && generating.type === tab
                    ? <><Loader2 size={14} className="animate-spin" /> Regenerating\u2026</>
                    : <><Wand2 size={14} /> Regenerate</>
                  }
                </Button>
              </>
            )}
          </div>
        )}

        {(tab === 'prep' || tab === 'notes') && (
          <div
            className="rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap"
            style={{
              background: 'var(--color-surface-offset)',
              color: content[tab] ? 'var(--color-text)' : 'var(--color-text-faint)',
              border: '1px solid var(--color-border)',
              minHeight: 100,
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {content[tab] || (tab === 'prep' ? 'Interview prep will appear after evaluation.' : 'No notes added.')}
          </div>
        )}
      </div>

      {app.recruiter_name && (
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Recruiter: <span style={{ color: 'var(--color-text)' }}>{app.recruiter_name}</span>
          {app.recruiter_linkedin && (
            <a href={app.recruiter_linkedin} target="_blank" rel="noopener noreferrer"
              className="ml-2 underline" style={{ color: 'var(--color-primary)' }}>LinkedIn</a>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyApplications() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--color-primary-highlight)' }}>
        <Send size={28} style={{ color: 'var(--color-primary)' }} />
      </div>
      <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text)' }}>No applications yet</h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Open a job and click <strong>Apply</strong> to create your first application.
      </p>
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
        style={{ background: 'var(--color-primary)' }}
      >
        Browse Jobs <ChevronRight size={14} />
      </Link>
    </div>
  )
}
