'use client'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { resumesApi } from '@/lib/api'
import { GradeChip } from '@/components/ui/GradeChip'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import type { ResumeVariant } from '@/types'
import {
  FileText, Download, Eye, Sparkles, ChevronDown, ChevronUp, Clock
} from 'lucide-react'

export default function ResumesPage() {
  const { data: resumes, isLoading } = useSWR<ResumeVariant[]>('resumes', resumesApi.list)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [preview, setPreview] = useState<ResumeVariant | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Resumes</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            AI-tailored resume variants generated per job.
          </p>
        </div>
        <Badge className="text-teal-400 bg-teal-400/10">
          {resumes?.length ?? 0} variant{resumes?.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : !resumes?.length ? (
        <EmptyResumes />
      ) : (
        <div className="space-y-3">
          {resumes.map(r => (
            <div
              key={r.id}
              className="rounded-xl border transition-all"
              style={{
                background: 'var(--color-surface)',
                borderColor: expanded === r.id ? 'var(--color-primary)' : 'var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Row */}
              <div className="flex items-center gap-4 p-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-primary-highlight)' }}
                >
                  <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {r.job_title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.company}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>·</span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-faint)' }}>
                      <Clock size={10} /> {formatDate(r.generated_at)}
                    </span>
                  </div>
                </div>

                {r.keywords_injected?.length > 0 && (
                  <Badge className="text-violet-400 bg-violet-400/10 hidden sm:inline-flex">
                    {r.keywords_injected.length} keywords
                  </Badge>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreview(r)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Preview"
                  >
                    <Eye size={16} />
                  </button>
                  <a
                    href={resumesApi.pdfUrl(r.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Download PDF"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {expanded === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded: changes summary + keywords */}
              {expanded === r.id && (
                <div
                  className="px-4 pb-4 pt-0 border-t space-y-4"
                  style={{ borderColor: 'var(--color-divider)' }}
                >
                  {r.changes_summary && (
                    <div className="pt-4">
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Changes Made</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                        {r.changes_summary}
                      </p>
                    </div>
                  )}
                  {r.keywords_injected?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Keywords Injected</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.keywords_injected.map(kw => (
                          <Badge key={kw} className="text-violet-400 bg-violet-400/10">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <a
                      href={resumesApi.pdfUrl(r.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="primary">
                        <Download size={14} /> Download PDF
                      </Button>
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => setPreview(r)}>
                      <Eye size={14} /> Preview
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `${preview.job_title} @ ${preview.company}` : ''}
        size="lg"
      >
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Generated {formatDate(preview.generated_at)}</span>
              <a href={resumesApi.pdfUrl(preview.id)} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="primary"><Download size={14} /> Download PDF</Button>
              </a>
            </div>
            <div
              className="rounded-lg p-4 font-mono text-xs overflow-auto max-h-[60vh] leading-relaxed whitespace-pre-wrap"
              style={{
                background: 'var(--color-surface-offset)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              {preview.content_markdown || 'No content available.'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function EmptyResumes() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--color-primary-highlight)' }}>
        <Sparkles size={28} style={{ color: 'var(--color-primary)' }} />
      </div>
      <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text)' }}>No resumes generated yet</h3>
      <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
        Open a job, click <strong>Generate Resume</strong>, and a tailored variant will appear here.
      </p>
    </div>
  )
}
