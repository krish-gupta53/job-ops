'use client'
import useSWR, { mutate } from 'swr'
import { useState, useRef } from 'react'
import { profileApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Profile } from '@/types'
import {
  User, Upload, Save, X, Loader2, CheckCircle2, FileText, Eye, Edit3
} from 'lucide-react'

type TagFieldKey = 'target_roles' | 'target_domains' | 'preferred_locations' | 'work_style' | 'skills'
type StringField = 'name' | 'email' | 'phone' | 'location' | 'linkedin_url' | 'github_url'
  | 'salary_currency' | 'summary' | 'career_story'
type NumberField = 'experience_years' | 'notice_period_days' | 'min_salary' | 'max_salary'

export default function ProfilePage() {
  const { data: profile, isLoading } = useSWR<Profile>('profile', profileApi.get)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [resumeEditMode, setResumeEditMode] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function val<K extends keyof Profile>(k: K): Profile[K] | undefined {
    return (k in form ? form[k] : profile?.[k]) as Profile[K] | undefined
  }

  const set = (k: keyof Profile, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await profileApi.update(form as Record<string, unknown>)
      await mutate('profile')
      setForm({})
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    try {
      const res = await profileApi.uploadResume(file) as { message?: string; characters?: number }
      setUploadMsg(`\u2713 Uploaded (${res.characters?.toLocaleString() ?? '?'} characters extracted)`)
      await mutate('profile')
      // clear local override for resume_markdown so fresh server data shows
      setForm(f => { const n = { ...f }; delete (n as Record<string, unknown>).resume_markdown; return n })
      setResumeEditMode(false)
    } catch {
      setUploadMsg('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function addTag(field: TagFieldKey, value: string) {
    const current = (val(field) as string[] | undefined) ?? []
    if (value && !current.includes(value)) set(field, [...current, value])
  }

  function removeTag(field: TagFieldKey, tag: string) {
    const current = (val(field) as string[] | undefined) ?? []
    set(field, current.filter(t => t !== tag))
  }

  function proofPointsString(): string {
    const v = val('proof_points')
    if (!v) return ''
    return Array.isArray(v) ? v.join('\n') : String(v)
  }

  // FIX: use resume_markdown (correct backend field name)
  const resumeText = (val('resume_markdown') as string | undefined) ?? ''
  const dirty = Object.keys(form).length > 0

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Profile</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Your details are used to tailor resumes, evaluate jobs, and draft outreach.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Saving&#x2026;</>
            : saved
              ? <><CheckCircle2 size={14} /> Saved!</>
              : <><Save size={14} /> Save Changes</>
          }
        </Button>
      </div>

      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-6">

          {/* Resume Upload */}
          <Section title="Resume" icon={<Upload size={15} style={{ color: 'var(--color-primary)' }} />}>
            {/* Drop zone */}
            <div
              className="rounded-xl border-2 border-dashed p-6 flex flex-col items-center text-center cursor-pointer transition-colors hover:border-teal-500/50"
              style={{ borderColor: 'var(--color-border)' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={24} className="mb-2" style={{ color: 'var(--color-text-faint)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {uploading ? 'Uploading\u2026' : resumeText ? 'Replace resume' : 'Upload Resume'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                PDF, DOCX, MD, or TXT &mdash; drag and drop or click to browse
              </p>
              {uploadMsg && (
                <p className="text-xs mt-2" style={{
                  color: uploadMsg.includes('fail') ? 'var(--color-error)' : 'var(--color-success)'
                }}>{uploadMsg}</p>
              )}
              {/* FIX: added .md and .txt to accepted file types */}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.md,.txt"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            {/* Resume content panel — shown when resume_markdown exists */}
            {resumeText ? (
              <div className="mt-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-offset)' }}>
                {/* Toolbar */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b"
                  style={{ borderColor: 'var(--color-divider)' }}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: 'var(--color-primary)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Resume Content</span>
                    <Badge className="text-zinc-400 bg-zinc-400/10 text-[10px]">
                      {resumeText.length.toLocaleString()} chars
                    </Badge>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors hover:bg-white/5"
                    style={{ color: 'var(--color-text-muted)' }}
                    onClick={() => setResumeEditMode(m => !m)}
                  >
                    {resumeEditMode
                      ? <><Eye size={12} /> Preview</>
                      : <><Edit3 size={12} /> Edit</>
                    }
                  </button>
                </div>

                {/* Body */}
                {resumeEditMode ? (
                  <textarea
                    className="w-full bg-transparent text-xs font-mono outline-none p-4 resize-y"
                    style={{ color: 'var(--color-text)', minHeight: 320 }}
                    value={resumeText}
                    onChange={e => set('resume_markdown', e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <pre
                    className="text-xs p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed"
                    style={{ color: 'var(--color-text-muted)', maxHeight: 400, overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}
                  >
                    {resumeText}
                  </pre>
                )}
              </div>
            ) : (
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--color-text-faint)' }}>
                No resume uploaded yet. Upload a PDF, DOCX, MD, or TXT file above.
              </p>
            )}
          </Section>

          {/* Basic Info */}
          <Section title="Basic Info" icon={<User size={15} style={{ color: 'var(--color-primary)' }} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { k: 'name',         label: 'Full Name',     placeholder: 'Krish Gupta' },
                { k: 'email',        label: 'Email',         placeholder: 'you@email.com',          type: 'email' },
                { k: 'phone',        label: 'Phone',         placeholder: '+91 XXXXX XXXXX' },
                { k: 'location',     label: 'Location',      placeholder: 'Chennai, India' },
                { k: 'linkedin_url', label: 'LinkedIn URL',  placeholder: 'https://linkedin.com/in/...' },
                { k: 'github_url',   label: 'GitHub URL',    placeholder: 'https://github.com/...' },
              ] as { k: StringField; label: string; placeholder: string; type?: string }[]).map(({ k, label, placeholder, type }) => (
                <FormField key={k} label={label}>
                  <input
                    className="field"
                    type={type ?? 'text'}
                    value={(val(k) as string) ?? ''}
                    onChange={e => set(k, e.target.value)}
                    placeholder={placeholder}
                  />
                </FormField>
              ))}
            </div>
          </Section>

          {/* Preferences */}
          <Section title="Job Preferences" icon={<span style={{ color: 'var(--color-primary)', fontSize: 15 }}>&#127919;</span>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { k: 'experience_years',   label: 'Years of Experience', placeholder: '0' },
                { k: 'notice_period_days', label: 'Notice Period (days)', placeholder: '30' },
                { k: 'min_salary',         label: 'Min Salary',           placeholder: '0' },
                { k: 'max_salary',         label: 'Max Salary',           placeholder: '0' },
              ] as { k: NumberField; label: string; placeholder: string }[]).map(({ k, label, placeholder }) => (
                <FormField key={k} label={label}>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    value={(val(k) as number) ?? ''}
                    onChange={e => set(k, Number(e.target.value))}
                    placeholder={placeholder}
                  />
                </FormField>
              ))}
              <FormField label="Salary Currency">
                <input
                  className="field"
                  value={(val('salary_currency') as string) ?? ''}
                  onChange={e => set('salary_currency', e.target.value)}
                  placeholder="INR"
                />
              </FormField>
              <FormField label="Open to Relocation">
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={(val('open_to_relocation') as boolean) ?? false}
                    onChange={e => set('open_to_relocation', e.target.checked)}
                    className="w-4 h-4 accent-teal-500"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Yes, open to relocation</span>
                </label>
              </FormField>
            </div>
          </Section>

          {/* Tag Fields */}
          <Section title="Tags &amp; Skills" icon={<span style={{ color: 'var(--color-primary)', fontSize: 15 }}>&#127991;</span>}>
            <div className="space-y-5">
              {([
                { field: 'target_roles',        label: 'Target Roles',        placeholder: 'e.g. ML Engineer' },
                { field: 'target_domains',      label: 'Target Domains',      placeholder: 'e.g. LLMOps' },
                { field: 'preferred_locations', label: 'Preferred Locations', placeholder: 'e.g. Remote' },
                { field: 'work_style',          label: 'Work Style',          placeholder: 'e.g. Remote, Hybrid' },
                { field: 'skills',              label: 'Skills',              placeholder: 'e.g. Python, PyTorch' },
              ] as { field: TagFieldKey; label: string; placeholder: string }[]).map(({ field, label, placeholder }) => (
                <TagFieldInput
                  key={field}
                  label={label}
                  tags={(val(field) as string[] | undefined) ?? []}
                  placeholder={placeholder}
                  onAdd={v => addTag(field, v)}
                  onRemove={v => removeTag(field, v)}
                />
              ))}
            </div>
          </Section>

          {/* Career Narrative */}
          <Section title="Career Narrative" icon={<span style={{ color: 'var(--color-primary)', fontSize: 15 }}>&#9997;</span>}>
            <div className="space-y-4">
              <FormField label="Summary">
                <textarea
                  className="field resize-none"
                  rows={3}
                  value={(val('summary') as string) ?? ''}
                  onChange={e => set('summary', e.target.value)}
                  placeholder="A short professional summary..."
                />
              </FormField>
              <FormField label="Career Story">
                <textarea
                  className="field resize-none"
                  rows={4}
                  value={(val('career_story') as string) ?? ''}
                  onChange={e => set('career_story', e.target.value)}
                  placeholder="Narrative for cover letters and outreach..."
                />
              </FormField>
              <FormField label="Key Proof Points">
                <textarea
                  className="field resize-none"
                  rows={3}
                  value={proofPointsString()}
                  onChange={e => set('proof_points', e.target.value)}
                  placeholder="STAR-format achievements..."
                />
              </FormField>
              <FormField label="Avoid Preferences">
                <textarea
                  className="field resize-none"
                  rows={2}
                  value={(val('avoid_preferences') as string) ?? ''}
                  onChange={e => set('avoid_preferences', e.target.value)}
                  placeholder="Roles / companies to avoid..."
                />
              </FormField>
            </div>
          </Section>

          {/* Save footer */}
          {dirty && (
            <div
              className="sticky bottom-0 py-3 flex justify-end"
              style={{ background: 'var(--color-bg)' }}
            >
              <Button variant="primary" disabled={saving} onClick={handleSave}>
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving&#x2026;</>
                  : <><Save size={14} /> Save Changes</>
                }
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function TagFieldInput({
  label, tags, placeholder, onAdd, onRemove
}: {
  label: string
  tags: string[]
  placeholder: string
  onAdd: (v: string) => void
  onRemove: (v: string) => void
}) {
  const [input, setInput] = useState('')

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      onAdd(input.trim().replace(/,$/, ''))
      setInput('')
    }
  }

  return (
    <FormField label={label}>
      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-lg border min-h-[40px]"
        style={{ background: 'var(--color-surface-offset)', borderColor: 'var(--color-border)' }}
      >
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}
          >
            {tag}
            <button onClick={() => onRemove(tag)} className="hover:opacity-70" type="button">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className="flex-1 bg-transparent text-sm outline-none min-w-[120px]"
          style={{ color: 'var(--color-text)' }}
          placeholder={tags.length === 0 ? `${placeholder} \u2014 press Enter to add` : 'Add more\u2026'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
      </div>
    </FormField>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
