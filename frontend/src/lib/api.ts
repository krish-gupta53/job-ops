const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Profile ────────────────────────────────────────────────────────────────
export const profileApi = {
  get: () => request('/api/profile'),
  update: (data: Record<string, unknown>) =>
    request('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadResume: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${API_BASE}/api/profile/upload-resume`, { method: 'POST', body: form }).then(r => {
      if (!r.ok) throw new Error('Upload failed')
      return r.json()
    })
  },
}

// ─── Jobs ────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (params?: { status?: string; grade?: string; search?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.grade) q.set('grade', params.grade)
    if (params?.search) q.set('search', params.search)
    if (params?.skip !== undefined) q.set('skip', String(params.skip))
    if (params?.limit !== undefined) q.set('limit', String(params.limit))
    return request(`/api/jobs${q.toString() ? '?' + q.toString() : ''}`)
  },
  stats: () => request('/api/jobs/stats'),
  get: (id: string) => request(`/api/jobs/${id}`),
  add: (data: { url?: string; title?: string; company?: string; description?: string }) =>
    request('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    request(`/api/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  evaluate: (id: string) => request(`/api/jobs/${id}/evaluate`, { method: 'POST' }),
  archive: (id: string) => request(`/api/jobs/${id}`, { method: 'DELETE' }),
}

// ─── Resumes ────────────────────────────────────────────────────────────────
export const resumesApi = {
  list: () => request('/api/resumes'),
  get: (id: string) => request(`/api/resumes/${id}`),
  generate: (jobId: string) => request(`/api/resumes/generate/${jobId}`, { method: 'POST' }),
  pdfUrl: (id: string) => `${API_BASE}/api/resumes/${id}/pdf`,
}

// ─── Applications ───────────────────────────────────────────────────────────
export const applicationsApi = {
  list: () => request('/api/applications'),
  get: (id: string) => request(`/api/applications/${id}`),
  create: (data: { job_id: string; resume_variant_id?: string; cover_letter?: string; notes?: string }) =>
    request('/api/applications', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  generateOutreach: (id: string) =>
    request(`/api/applications/${id}/generate-outreach`, { method: 'POST' }),
  generateCoverLetter: (id: string) =>
    request(`/api/applications/${id}/generate-cover-letter`, { method: 'POST' }),
}

// ─── Scanner ────────────────────────────────────────────────────────────────
export const scannerApi = {
  sources: () => request('/api/scanner/sources'),
  addSource: (data: { name: string; source_type: string; company_name: string; url?: string }) =>
    request('/api/scanner/sources', { method: 'POST', body: JSON.stringify(data) }),
  toggleSource: (id: string) => request(`/api/scanner/sources/${id}/toggle`, { method: 'PATCH' }),
  deleteSource: (id: string) => request(`/api/scanner/sources/${id}`, { method: 'DELETE' }),
  runScan: () => request('/api/scanner/run', { method: 'POST' }),
  logs: (limit = 20) => request(`/api/scanner/logs?limit=${limit}`),
}

// ─── Apply ───────────────────────────────────────────────────────────────────
export const applyApi = {
  prefill: (applicationId: string) =>
    request('/api/apply/prefill', {
      method: 'POST',
      body: JSON.stringify({ application_id: applicationId, confirm: true }),
    }),
}
