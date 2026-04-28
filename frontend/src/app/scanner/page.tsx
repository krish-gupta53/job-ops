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
  CheckCircle2, XCircle, Loader2, Clock, Globe
} from 'lucide-react'

const SOURCE_TYPES = ['greenhouse', 'lever', 'ashby', 'workday', 'custom']

export default function ScannerPage() {
  const { data: sources, isLoading: srcLoading } = useSWR<ScanSource[]>('scan-sources', scannerApi.sources)
  const { data: logs, isLoading: logsLoading } = useSWR<ScanLog[]>('scan-logs', () => scannerApi.logs(15))
  const [addOpen, setAddOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleRunScan() {
    setScanning(true)
    try {
      await scannerApi.runScan()
      await Promise.all([mutate('scan-sources'), mutate('scan-logs')])
    } catch (e) {
      console.error(e)
    } finally {
      setScanning(false)
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

  const enabledCount = sources?.filter(s => s.enabled).length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Scanner</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Configure job sources and run automatic scans.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="text-teal-400 bg-teal-400/10">
            {enabledCount} active source{enabledCount !== 1 ? 's' : ''}
          </Badge>
          <Button
            variant="primary"
            size="sm"
            disabled={scanning || enabledCount === 0}
            onClick={handleRunScan}
          >
            {scanning
              ? <><Loader2 size={14} className="animate-spin" /> Scanning\u2026</>
              : <><Play size={14} /> Run Scan</>
            }
          </Button>
        </div>
      </div>

      {/* Sources */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={15} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Sources</h3>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Source
          </Button>
        </div>

        {srcLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !sources?.length ? (
          <div
            className="rounded-xl border border-dashed flex flex-col items-center py-12 text-center"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Radar size={32} className="mb-3" style={{ color: 'var(--color-text-faint)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>No sources configured</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Add a company portal to start scanning.</p>
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add First Source
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map(src => (
              <div
                key={src.id}
                className="rounded-xl border p-4 flex items-center gap-4"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: src.enabled ? 'var(--color-primary)' : 'var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                  opacity: src.enabled ? 1 : 0.65,
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold uppercase"
                  style={{
                    background: src.enabled ? 'var(--color-primary-highlight)' : 'var(--color-surface-offset)',
                    color: src.enabled ? 'var(--color-primary)' : 'var(--color-text-faint)',
                  }}
                >
                  {src.source_type.slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{src.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className="text-zinc-400 bg-zinc-400/10 capitalize">{src.source_type}</Badge>
                    {src.last_scanned && (
                      <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                        Last scanned {timeAgo(src.last_scanned)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="tabular">{src.jobs_found_total ?? 0} jobs</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(src.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: src.enabled ? 'var(--color-primary)' : 'var(--color-text-faint)' }}
                    title={src.enabled ? 'Disable' : 'Enable'}
                  >
                    {src.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleDelete(src.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-faint)' }}
                    title="Delete source"
                    disabled={deleting === src.id}
                  >
                    {deleting === src.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Scan Logs */}
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
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No scans run yet.</p>
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
                  // Guard log.started_at before using it in date arithmetic
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
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Scan Source">
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
    if (!form.name || !form.company_name) { setError('Name and company are required.'); return }
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
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Source Name</label>
        <input
          className="field"
          placeholder="e.g. Anthropic Greenhouse"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Company Name</label>
        <input
          className="field"
          placeholder="e.g. Anthropic"
          value={form.company_name}
          onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Source Type</label>
        <select
          className="field"
          value={form.source_type}
          onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}
        >
          {SOURCE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>URL (optional)</label>
        <input
          className="field"
          placeholder="https://boards.greenhouse.io/company"
          value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
        />
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? <><Loader2 size={14} className="animate-spin" /> Adding\u2026</> : <><Plus size={14} /> Add Source</>}
        </Button>
      </div>
    </form>
  )
}
