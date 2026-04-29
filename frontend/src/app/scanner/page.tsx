'use client'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { scannerApi, profileApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { timeAgo } from '@/lib/utils'
import type { ScanSource, ScanLog } from '@/types'
import {
  Plus, Play, Trash2, ToggleLeft, ToggleRight,
  CheckCircle2, XCircle, Loader2, Clock, Globe,
  Zap, RefreshCw, Building2, ChevronDown, ChevronUp,
  AlertTriangle, FileText, ArrowRight
} from 'lucide-react'

const SOURCE_TYPES = ['greenhouse', 'lever', 'ashby', 'workday', 'custom']

const SOURCE_TYPE_HINTS: Record<string, string> = {
  greenhouse: 'company slug from boards.greenhouse.io/{slug}',
  lever: 'company slug from jobs.lever.co/{slug}',
  ashby: 'company slug from jobs.ashbyhq.com/{slug}',
  workday: 'company slug from myworkdayjobs.com',
  custom: 'any ATS or careers page URL',
}

type SeedStatus = 'idle' | 'seeding' | 'scanning' | 'done' | 'error'

export default function ScannerPage() {
  const router = useRouter()
  const { data: sources, isLoading: srcLoading } = useSWR<ScanSource[]>('scan-sources', scannerApi.sources)
  const { data: logs, isLoading: logsLoading } = useSWR<ScanLog[]>('scan-logs', () => scannerApi.logs(15))
  const [addOpen, setAddOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [seedStatus, setSeedStatus] = useState<SeedStatus>('idle')
  const [seedMsg, setSeedMsg] = useState('')
  const [seedMsgType, setSeedMsgType] = useState<'info' | 'error' | 'warning'>('info')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<{ sources_scanned: number } | null>(null)
  const [showAllSources, setShowAllSources] = useState(false)
  const [noResumeOpen, setNoResumeOpen] = useState(false)

  const enabledCount = sources?.filter(s => s.enabled).length ?? 0
  const totalCount = sources?.length ?? 0
  const displayedSources = showAllSources ? sources : sources?.slice(0, 12)

  // Check if profile has a resume before allowing any scan
  async function checkResume(): Promise<boolean> {
    try {
      const profile = await profileApi.get()
      if (!profile.resume_text) {
        setNoResumeOpen(true)
        return false
      }
      return true
    } catch {
      // If profile fetch fails, let backend enforce the check
      return true
    }
  }

  async function handleRunScan() {
    const hasResume = await checkResume()
    if (!hasResume) return
    setScanning(true)
    setScanResult(null)
    try {
      await scannerApi.runScan()
      await new Promise(r => setTimeout(r, 3000))
      await Promise.all([mutate('scan-sources'), mutate('scan-logs'), mutate('jobs')])
      setScanResult({ sources_scanned: enabledCount })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      if (msg.includes('no_resume')) {
        setNoResumeOpen(true)
      } else {
        setSeedMsg(`Scan failed: ${msg}`)
        setSeedMsgType('error')
        setSeedStatus('error')
      }
    } finally {
      setScanning(false)
    }
  }

  async function handleSeedAndScan() {
    const hasResume = await checkResume()
    if (!hasResume) return

    setSeedStatus('seeding')
    setSeedMsg('')
    try {
      const seedRes = await scannerApi.seedDefaults()
      setSeedMsg(`${seedRes.added} new companies added. Starting scan…`)
      setSeedMsgType('info')
      await mutate('scan-sources')

      setSeedStatus('scanning')
      await scannerApi.runScan()
      await new Promise(r => setTimeout(r, 3000))
      await Promise.all([mutate('scan-sources'), mutate('scan-logs'), mutate('jobs')])

      setSeedStatus('done')
      setSeedMsg(
        `${seedRes.added > 0 ? seedRes.added + ' companies added. ' : 'All defaults already present. '}` +
        `Scan started — check Jobs tab for results.`
      )
      setSeedMsgType('info')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      if (msg.includes('no_resume')) {
        setSeedStatus('idle')
        setNoResumeOpen(true)
      } else {
        setSeedStatus('error')
        setSeedMsg(`Error: ${msg}`)
        setSeedMsgType('error')
      }
    }
  }

  async function handleToggle(id: string) {
    try {
      await scannerApi.toggleSource(id)
      await mutate('scan-sources')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Toggle failed'
      setSeedMsg(`Could not toggle source: ${msg}`)
      setSeedMsgType('error')
      setSeedStatus('error')
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await scannerApi.deleteSource(id)
      await mutate('scan-sources')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Delete failed'
      setSeedMsg(`Could not delete source: ${msg}`)
      setSeedMsgType('error')
      setSeedStatus('error')
    } finally {
      setDeleting(null)
    }
  }

  const seedBusy = seedStatus === 'seeding' || seedStatus === 'scanning'

  const bannerColor = {
    info: { bg: 'var(--color-primary-highlight)', text: 'var(--color-primary)' },
    warning: { bg: 'var(--color-warning-highlight)', text: 'var(--color-warning)' },
    error: { bg: 'var(--color-error-highlight)', text: 'var(--color-error)' },
  }[seedMsgType]

  return (
    <div className="space-y-8">

      {/* No-Resume Gate Modal */}
      <Modal open={noResumeOpen} onClose={() => setNoResumeOpen(false)} title="Resume Required">
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'var(--color-warning-highlight)' }}
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Upload your resume first</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Job-ops needs your resume to evaluate every job against your profile.
                Without it, scanning fetches raw listings but cannot score or shortlist anything.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-primary-highlight)' }}
            >
              <FileText size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Go to Profile &rarr; Upload Resume</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Supports PDF, DOCX, MD, TXT</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setNoResumeOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setNoResumeOpen(false); router.push('/profile') }}
            >
              <ArrowRight size={14} /> Go to Profile
            </Button>
          </div>
        </div>
      </Modal>

      {/* Hero: Scan Button */}
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
                <Badge className="text-emerald-400 bg-emerald-400/10">✓ Scan started for {scanResult.sources_scanned} sources</Badge>
                <Badge className="text-blue-400 bg-blue-400/10">Check Jobs tab for results</Badge>
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
                Running in background — check Jobs tab
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sources Header */}
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
              disabled={seedBusy}
              onClick={handleSeedAndScan}
              title="Add all default companies and immediately scan for jobs"
            >
              {seedStatus === 'seeding' && <><Loader2 size={13} className="animate-spin" /> Adding companies…</>}
              {seedStatus === 'scanning' && <><Loader2 size={13} className="animate-spin" /> Scanning for jobs…</>}
              {(seedStatus === 'idle' || seedStatus === 'done' || seedStatus === 'error') && <><RefreshCw size={13} /> Load All Defaults &amp; Scan</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add Company
            </Button>
          </div>
        </div>

        {/* Status banner */}
        {seedMsg && (
          <div
            className="mb-4 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"
            style={{ background: bannerColor.bg, color: bannerColor.text }}
          >
            {seedMsgType === 'error' && <XCircle size={14} className="shrink-0" />}
            {seedMsgType === 'warning' && <AlertTriangle size={14} className="shrink-0" />}
            {seedMsgType === 'info' && <CheckCircle2 size={14} className="shrink-0" />}
            {seedMsg}
            <button
              className="ml-auto text-xs opacity-60 hover:opacity-100"
              onClick={() => { setSeedMsg(''); setSeedStatus('idle') }}
            >
              ×
            </button>
          </div>
        )}

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
              Load 80+ pre-built companies and immediately scan for matching jobs.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" disabled={seedBusy} onClick={handleSeedAndScan}>
                {seedStatus === 'seeding' && <><Loader2 size={13} className="animate-spin" /> Adding companies…</>}
                {seedStatus === 'scanning' && <><Loader2 size={13} className="animate-spin" /> Scanning for jobs…</>}
                {(seedStatus === 'idle' || seedStatus === 'done' || seedStatus === 'error') && <><RefreshCw size={13} /> Load All Defaults &amp; Scan</>}
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
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold uppercase"
                    style={{
                      background: src.enabled ? 'var(--color-primary-highlight)' : 'var(--color-surface-offset)',
                      color: src.enabled ? 'var(--color-primary)' : 'var(--color-text-faint)',
                    }}
                  >
                    {src.source_type.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{src.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge className="text-zinc-400 bg-zinc-400/10 capitalize text-[10px]">{src.source_type}</Badge>
                      {(src.jobs_found_total ?? 0) > 0 && (
                        <span className="text-[10px] tabular" style={{ color: 'var(--color-text-faint)' }}>
                          {src.jobs_found_total} found
                        </span>
                      )}
                    </div>
                  </div>
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
                      {deleting === src.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
                {showAllSources ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {sources.length} companies</>}
              </button>
            )}
          </>
        )}
      </section>

      {/* Scan Logs */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent Scan Logs</h3>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
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
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No scans run yet. Hit &quot;Load All Defaults &amp; Scan&quot; above.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-divider)' }}>
                  {['Status', 'Jobs Found', 'New Jobs', 'Started', 'Duration'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const duration = (log.finished_at && log.started_at)
                    ? Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                    : null
                  return (
                    <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--color-divider)' : 'none' }}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          {log.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-400" />}
                          {log.status === 'failed' && <XCircle size={14} className="text-red-400" />}
                          {log.status === 'running' && <Loader2 size={14} className="animate-spin text-blue-400" />}
                          <span className="text-xs capitalize" style={{ color: 'var(--color-text)' }}>{log.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs tabular" style={{ color: 'var(--color-text)' }}>{log.jobs_found ?? 0}</td>
                      <td className="px-4 py-3"><Badge className="text-teal-400 bg-teal-400/10">{log.jobs_new ?? 0} new</Badge></td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{timeAgo(log.started_at)}</td>
                      <td className="px-4 py-3 text-xs tabular" style={{ color: 'var(--color-text-faint)' }}>
                        {duration !== null ? `${duration}s` : '—'}
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
        <input className="field" placeholder="e.g. Anthropic" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>ATS Platform</label>
        <select className="field" value={form.source_type}
          onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}>
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
        <input className="field"
          placeholder={form.source_type === 'greenhouse' ? 'e.g. anthropic' : form.source_type === 'lever' ? 'e.g. mistral' : 'e.g. elevenlabs'}
          value={form.company_name}
          onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
        <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
          The last part of the URL: {form.source_type === 'greenhouse' ? 'job-boards.greenhouse.io/' : form.source_type === 'lever' ? 'jobs.lever.co/' : 'jobs.ashbyhq.com/'}
          <strong>{form.company_name || 'your-slug-here'}</strong>
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Custom URL (optional)</label>
        <input className="field" placeholder="https://job-boards.greenhouse.io/yourcompany" value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
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
