'use client'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { scannerApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, timeAgo } from '@/lib/utils'
import type { ScanSource, ScanLog } from '@/types'
import {
  Radar, Plus, Play, Trash2, ToggleLeft, ToggleRight,
  CheckCircle2, XCircle, Loader2, Clock, Globe,
  Zap, RefreshCw, Building2, ChevronDown, ChevronUp
} from 'lucide-react'

const SOURCE_TYPES = ['greenhouse', 'lever', 'ashby', 'workday', 'custom']

const SOURCE_TYPE_HINTS: Record<string, string> = {
  greenhouse: 'company slug from boards.greenhouse.io/{slug}',
  lever: 'company slug from jobs.lever.co/{slug}',
  ashby: 'company slug from jobs.ashbyhq.com/{slug}',
  workday: 'company slug from myworkdayjobs.com',
  custom: 'any ATS or careers page URL',
}

export default function ScannerPage() {
  const { data: sources, isLoading: srcLoading } = useSWR<ScanSource[]>('scan-sources', scannerApi.sources)
  const { data: logs, isLoading: logsLoading } = useSWR<ScanLog[]>('scan-logs', () => scannerApi.logs(15))
  const [addOpen, setAddOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<{ total_found: number; total_new: number; sources_scanned: number } | null>(null)
  const [showAllSources, setShowAllSources] = useState(false)

  const enabledCount = sources?.filter(s => s.enabled).length ?? 0
  const totalCount = sources?.length ?? 0
  const displayedSources = showAllSources ? sources : sources?.slice(0, 12)

  async function handleRunScan() {
    setScanning(true)
    setScanResult(null)
    try {
      const result = await scannerApi.runScan()
      // Poll for a bit then refresh — scan runs in background
      await new Promise(r => setTimeout(r, 3000))
      await Promise.all([mutate('scan-sources'), mutate('scan-logs'), mutate('jobs')])
      setScanResult(result as typeof scanResult)
    } catch (e) {
      console.error(e)
    } finally {
      setScanning(false)
    }
  }

  async function handleSeedDefaults() {
    setSeeding(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scanner/seed-defaults`, { method: 'POST' })
      const data = await res.json()
      await mutate('scan-sources')
      alert(`Done! ${data.message}`)
    } catch (e) {
      console.error(e)
    } finally {
      setSeeding(false)
    }
  }

  async function handleToggle(id: string) {
    await scannerApi.toggleSource(id)
    await mutate('scan-sources')
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await scannerApi.deleteSource(id)
      await mutate('scan-sources')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Hero: Big Scan Button ── */}
      <div
        className="rounded-2xl border p-6"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-highlight) 0%, var(--color-surface) 100%)',
          borderColor: 'var(--color-primary)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Find Jobs Across All Companies</h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Scans all {enabledCount} enabled sources, deduplicates results, and AI-evaluates every new job against your profile — in one run.
            </p>
            {scanResult && (
              <div className="flex items-center gap-3 mt-3">
                <Badge className="text-emerald-400 bg-emerald-400/10">✓ {scanResult.total_new} new jobs found</Badge>
                <Badge className="text-blue-400 bg-blue-400/10">{scanResult.total_found} total listings</Badge>
                <Badge className="text-zinc-400 bg-zinc-400/10">{scanResult.sources_scanned} sources scanned</Badge>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              variant="primary"
              size="lg"
              disabled={scanning || enabledCount === 0}
              onClick={handleRunScan}
              className="min-w-[200px] justify-center"
            >
              {scanning
                ? <><Loader2 size={16} className="animate-spin" /> Scanning all sources…</>
                : <><Play size={16} fill="currentColor" /> Scan All &amp; Find Jobs</>
              }
            </Button>
            {scanning && (
              <p className="text-xs text-center" style={{ color: 'var(--color-text-faint)' }}>
                Running in background — check Jobs tab for results
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sources Header ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Globe size={15} style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Company Sources</h3>
            </div>
            <Badge className="text-teal-400 bg-teal-400/10">
              {enabledCount}/{totalCount} enabled
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={seeding}
              onClick={handleSeedDefaults}
              title="Re-add any missing built-in companies"
            >
              {seeding
                ? <><Loader2 size={13} className="animate-spin" /> Seeding…</>
                : <><RefreshCw size={13} /> Restore Defaults</>
              }
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add Company
            </Button>
          </div>
        </div>

        {/* Sources grid */}
        {srcLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !sources?.length ? (
          <div
            className="rounded-xl border border-dashed flex flex-col items-center py-16 text-center"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Building2 size={36} className="mb-3" style={{ color: 'var(--color-text-faint)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>No companies configured</p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              Load the 80+ pre-built companies from career-ops or add your own.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" disabled={seeding} onClick={handleSeedDefaults}>
                {seeding ? <><Loader2 size={13} className="animate-spin" /> Loading…</> : <><RefreshCw size={13} /> Load All Defaults</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
                <Plus size={13} /> Add Manually
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedSources?.map(src => (
                <div
                  key={src.id}
                  className="rounded-xl border p-3.5 flex items-center gap-3 group"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: src.enabled ? 'var(--color-primary)' : 'var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    opacity: src.enabled ? 1 : 0.55,
                    transition: 'opacity 200ms, border-color 200ms',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold uppercase"
                    style={{
                      background: src.enabled ? 'var(--color-primary-highlight)' : 'var(--color-surface-offset)',
                      color: src.enabled ? 'var(--color-primary)' : 'var(--color-text-faint)',
                    }}
                  >
                    {src.source_type.slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{src.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge className="text-zinc-400 bg-zinc-400/10 capitalize text-[10px]">{src.source_type}</Badge>
                      {src.jobs_found_total > 0 && (
                        <span className="text-[10px] tabular" style={{ color: 'var(--color-text-faint)' }}>
                          {src.jobs_found_total} found
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggle(src.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: src.enabled ? 'var(--color-primary)' : 'var(--color-text-faint)' }}
                      title={src.enabled ? 'Disable' : 'Enable'}
                    >
                      {src.enabled ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                    </button>
                    <button
                      onClick={() => handleDelete(src.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: 'var(--color-text-faint)' }}
                      title="Remove"
                      disabled={deleting === src.id}
                    >
                      {deleting === src.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {sources.length > 12 && (
              <button
                className="w-full mt-3 py-2.5 rounded-xl border text-sm flex items-center justify-center gap-2 transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}
                onClick={() => setShowAllSources(v => !v)}
              >
                {showAllSources
                  ? <><ChevronUp size={14} /> Show less</>
                  : <><ChevronDown size={14} /> Show all {sources.length} companies</>
                }
              </button>
            )}
          </>
        )}
      </section>

      {/* ── Scan Logs ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent Scan Logs</h3>
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {logsLoading ? (
            <div className="p-4 space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !logs?.length ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No scans run yet. Hit "Scan All & Find Jobs" above.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-divider)' }}>
                  {['Status', 'Jobs Found', 'New Jobs', 'Started', 'Duration'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium"
                      style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const duration = (log.finished_at && log.started_at)
                    ? Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                    : null
                  return (
                    <tr
                      key={log.id}
                      style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--color-divider)' : 'none' }}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          {log.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-400" />}
                          {log.status === 'failed' && <XCircle size={14} className="text-red-400" />}
                          {log.status === 'running' && <Loader2 size={14} className="animate-spin text-blue-400" />}
                          <span className="text-xs capitalize" style={{ color: 'var(--color-text)' }}>{log.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs tabular" style={{ color: 'var(--color-text)' }}>{log.jobs_found ?? 0}</td>
                      <td className="px-4 py-3">
                        <Badge className="text-teal-400 bg-teal-400/10">{log.jobs_new ?? 0} new</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {timeAgo(log.started_at)}
                      </td>
                      <td className="px-4 py-3 text-xs tabular" style={{ color: 'var(--color-text-faint)' }}>
                        {duration !== null ? `${duration}s` : '\u2014'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Add Source Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Company Source">
        <AddSourceForm onSuccess={() => { setAddOpen(false); mutate('scan-sources') }} />
      </Modal>
    </div>
  )
}

function AddSourceForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', source_type: 'greenhouse', company_name: '', url: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.company_name) { setError('Name and company slug are required.'); return }
    setLoading(true)
    setError('')
    try {
      await scannerApi.addSource(form)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add source.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Company Name <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          className="field"
          placeholder="e.g. Anthropic"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>ATS Platform</label>
        <select
          className="field"
          value={form.source_type}
          onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}
        >
          {SOURCE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
          {SOURCE_TYPE_HINTS[form.source_type]}
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Company Slug <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          className="field"
          placeholder={form.source_type === 'greenhouse' ? 'e.g. anthropic' : form.source_type === 'lever' ? 'e.g. mistral' : 'e.g. elevenlabs'}
          value={form.company_name}
          onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
        />
        <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
          The last part of the URL: {form.source_type === 'greenhouse' ? 'job-boards.greenhouse.io/' : form.source_type === 'lever' ? 'jobs.lever.co/' : 'jobs.ashbyhq.com/'}
          <strong>{form.company_name || 'your-slug-here'}</strong>
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Custom URL (optional)</label>
        <input
          className="field"
          placeholder="https://job-boards.greenhouse.io/yourcompany"
          value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
        />
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : <><Plus size={14} /> Add Source</>}
        </Button>
      </div>
    </form>
  )
}
