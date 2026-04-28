'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { jobsApi, resumesApi, applicationsApi } from '@/lib/api'
import type { Job, ResumeVariant } from '@/types'
import { GradeChip } from '@/components/ui/GradeChip'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatSalary, formatDate, statusColor } from '@/lib/utils'
import {
  ArrowLeft, ExternalLink, Zap, FileText, Send,
  CheckCircle, XCircle, AlertCircle, MapPin, Globe, Building
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: job, isLoading, mutate } = useSWR<Job>(`job-${id}`, () => jobsApi.get(id) as Promise<Job>)
  const { data: resumes } = useSWR<ResumeVariant[]>('resumes', () => resumesApi.list() as Promise<ResumeVariant[]>)

  const [evaluating, setEvaluating] = useState(false)
  const [genResume, setGenResume]   = useState(false)
  const [creating, setCreating]     = useState(false)

  const jobResumes = resumes?.filter(r => r.job_id === id) ?? []

  const handleEvaluate = async () => {
    setEvaluating(true)
    try {
      await jobsApi.evaluate(id)
      toast.success('AI evaluation complete!')
      mutate()
    } catch {
      toast.error('Evaluation failed')
    } finally { setEvaluating(false) }
  }

  const handleGenerateResume = async () => {
    setGenResume(true)
    try {
      await resumesApi.generate(id)
      toast.success('Tailored resume generated!')
      mutate()
    } catch {
      toast.error('Resume generation failed')
    } finally { setGenResume(false) }
  }

  const handleCreateApplication = async () => {
    setCreating(true)
    try {
      await applicationsApi.create({ job_id: id })
      toast.success('Application created!')
      router.push('/applications')
    } catch {
      toast.error('Failed to create application')
    } finally { setCreating(false) }
  }

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  )

  if (!job) return (
    <div className="flex flex-col items-center py-24">
      <AlertCircle size={40} style={{ color: 'var(--color-error)' }} className="mb-4" />
      <p style={{ color: 'var(--color-text-muted)' }}>Job not found.</p>
    </div>
  )

  const hasStrengths = (job.strengths?.length ?? 0) > 0
  const hasGaps      = (job.gaps?.length ?? 0) > 0
  const hasKeywords  = (job.keywords?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm mb-4 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={14} /> Back to Jobs
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{job.title}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Building size={13} /> {job.company}
              </span>
              {job.location && (
                <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <MapPin size={13} /> {job.location}
                </span>
              )}
              {job.remote && (
                <Badge className="text-teal-400 bg-teal-400/10">
                  <Globe size={10} className="mr-1" />Remote
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GradeChip grade={job.grade} score={job.score} size="lg" />
            <Badge className={statusColor(job.status)}>{job.status ?? 'new'}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="sm" icon={<Zap size={14} />} loading={evaluating} onClick={handleEvaluate}>
              {job.grade ? 'Re-Evaluate' : 'Evaluate with AI'}
            </Button>
            <Button variant="secondary" size="sm" icon={<FileText size={14} />} loading={genResume} onClick={handleGenerateResume}>
              Generate Tailored CV
            </Button>
            <Button variant="secondary" size="sm" icon={<Send size={14} />} loading={creating} onClick={handleCreateApplication}>
              Track Application
            </Button>
            {job.apply_url && (
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" icon={<ExternalLink size={13} />}>Apply Now</Button>
              </a>
            )}
          </div>

          {/* Evaluation Report */}
          {job.evaluation_report && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>AI Evaluation Report</h3>
              </CardHeader>
              <CardBody>
                {/* Strengths + Gaps */}
                {(hasStrengths || hasGaps) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    {hasStrengths && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Strengths</span>
                        </div>
                        <ul className="space-y-1">
                          {job.strengths!.map((s, i) => (
                            <li key={i} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasGaps && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <XCircle size={13} style={{ color: 'var(--color-error)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--color-error)' }}>Gaps</span>
                        </div>
                        <ul className="space-y-1">
                          {job.gaps!.map((g, i) => (
                            <li key={i} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>• {g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Keywords */}
                {hasKeywords && (
                  <div className="mb-5">
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Keywords to include</div>
                    <div className="flex flex-wrap gap-1.5">
                      {job.keywords!.map((kw, i) => (
                        <Badge key={i} className="text-violet-400 bg-violet-400/10 border border-violet-400/20">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full report */}
                <div
                  className="prose text-xs max-w-none"
                  style={{ maxHeight: '400px', overflowY: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: job.evaluation_report.replace(/\n/g, '<br/>') }}
                />
              </CardBody>
            </Card>
          )}

          {/* Job description */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Job Description</h3>
            </CardHeader>
            <CardBody>
              <div
                className="text-xs leading-relaxed prose max-w-none"
                style={{ color: 'var(--color-text-muted)', maxHeight: '400px', overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: job.description?.replace(/\n/g, '<br/>') ?? 'No description available.' }}
              />
            </CardBody>
          </Card>

          {/* Generated resumes */}
          {jobResumes.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Tailored Resumes</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {jobResumes.map(r => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          Resume — {formatDate(r.generated_at)}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {r.changes_summary}
                        </div>
                      </div>
                      <a href={resumesApi.pdfUrl(r.id)} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="sm" icon={<FileText size={13} />}>PDF</Button>
                      </a>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Job Details</h3>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3">
                {([
                  { label: 'Source',    value: job.source },
                  { label: 'Type',      value: job.job_type },
                  { label: 'Archetype', value: job.archetype },
                  { label: 'Salary',    value: (job.salary_min || job.salary_max) ? formatSalary(job.salary_min, job.salary_max, job.salary_currency) : null },
                  { label: 'Posted',    value: formatDate(job.posted_at) },
                  { label: 'Scraped',   value: formatDate(job.scraped_at) },
                  { label: 'Evaluated', value: formatDate(job.evaluated_at) },
                ] as { label: string; value: string | null | undefined }[]).map(({ label, value }) =>
                  value && value !== '\u2014' ? (
                    <div key={label}>
                      <dt className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{label}</dt>
                      <dd className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</dd>
                    </div>
                  ) : null
                )}
              </dl>
            </CardBody>
          </Card>

          {job.source_url && (
            <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="secondary" size="sm" icon={<ExternalLink size={13} />} className="w-full justify-center">
                View Original Listing
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
