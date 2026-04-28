'use client'
import useSWR from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { jobsApi } from '@/lib/api'
import type { Job, JobGrade, JobStatus } from '@/types'
import { GradeChip } from '@/components/ui/GradeChip'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { JobCardSkeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { formatSalary, statusColor, timeAgo } from '@/lib/utils'
import { Plus, Search, MapPin, Globe, ExternalLink, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const GRADES: JobGrade[] = ['A', 'B', 'C', 'D', 'F']
const STATUSES: JobStatus[] = ['new', 'shortlisted', 'applied', 'interview', 'offer', 'rejected']

export default function JobsPage() {
  const [grade, setGrade] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)

  const { data: jobs, isLoading, mutate } = useSWR<Job[]>(
    ['jobs', grade, status, search],
    () => jobsApi.list({ grade: grade || undefined, status: status || undefined, search: search || undefined, limit: 50 }) as Promise<Job[]>
  )

  const handleAdd = async () => {
    if (!addUrl.trim()) return
    setAdding(true)
    try {
      await jobsApi.add({ url: addUrl })
      toast.success('Job added! Evaluating with AI\u2026')
      setAddOpen(false)
      setAddUrl('')
      mutate()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add job')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)' }} />
          <input
            type="text"
            placeholder="Search jobs\u2026"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none transition-colors"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
        </div>

        <select
          value={grade}
          onChange={e => setGrade(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <option value="">All grades</option>
          {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => mutate()}>Refresh</Button>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Add Job</Button>
      </div>

      {/* Jobs count */}
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {isLoading ? 'Loading\u2026' : `${jobs?.length ?? 0} jobs`}
      </p>

      {/* Job Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(9).fill(0).map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : !jobs?.length ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="text-4xl mb-4">&#128269;</div>
          <p className="font-medium text-sm mb-2" style={{ color: 'var(--color-text)' }}>No jobs found</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {search || grade || status ? 'Try adjusting your filters.' : 'Add a job URL or run the scanner to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => <JobCard key={job.id} job={job} onMutate={mutate} />)}
        </div>
      )}

      {/* Add Job Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Job" description="Paste a job posting URL \u2014 we'll scrape and evaluate it automatically.">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Job URL
            </label>
            <input
              type="url"
              placeholder="https://jobs.company.com/..."
              value={addUrl}
              onChange={e => setAddUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" loading={adding} onClick={handleAdd}>Add &amp; Evaluate</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function JobCard({ job, onMutate }: { job: Job; onMutate: () => void }) {
  const [evaluating, setEvaluating] = useState(false)

  const evaluate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEvaluating(true)
    try {
      await jobsApi.evaluate(job.id)
      toast.success('Evaluation complete!')
      onMutate()
    } catch {
      toast.error('Evaluation failed')
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3 transition-all duration-150 hover:shadow-md group"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/jobs/${job.id}`} className="font-semibold text-sm leading-tight hover:underline block"
            style={{ color: 'var(--color-text)' }}>
            {job.title}
          </Link>
          <div className="text-xs mt-0.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {job.company}
          </div>
        </div>
        <GradeChip grade={job.grade} score={job.score} size="sm" />
      </div>

      {/* Match summary */}
      {job.match_summary && (
        <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{job.match_summary}</p>
      )}

      {/* Meta tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {job.location && (
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-faint)' }}>
            <MapPin size={10} />{job.location}
          </span>
        )}
        {job.remote && (
          <Badge className="text-teal-400 bg-teal-400/10 border border-teal-400/20">
            <Globe size={9} className="mr-1" />Remote
          </Badge>
        )}
        <Badge className={statusColor(job.status)}>{job.status ?? 'new'}</Badge>
        {job.archetype && (
          <Badge className="text-violet-400 bg-violet-400/10 border border-violet-400/20">{job.archetype}</Badge>
        )}
      </div>

      {/* Salary */}
      {(job.salary_min || job.salary_max) && (
        <div className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
          {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t"
        style={{ borderColor: 'var(--color-divider)' }}>
        <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{timeAgo(job.scraped_at)}</span>
        <div className="flex items-center gap-2">
          {!job.grade && (
            <Button variant="ghost" size="sm" loading={evaluating} onClick={evaluate}
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
              Evaluate
            </Button>
          )}
          {job.apply_url && (
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: 'var(--color-primary)' }}>
              Apply <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
