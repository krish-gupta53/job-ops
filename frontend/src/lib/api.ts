// ============================================================
// Job-Ops — Centralized API Client
// All calls go through here. Single source of truth.
// ============================================================

import type {
  Profile,
  Job,
  JobStats,
  ResumeVariant,
  Application,
  ScanSource,
  ScanLog,
  ScanResult,
} from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Profile ──────────────────────────────────────────────────
export const profileApi = {
  get: () => request<Profile>('/api/profile'),
  update: (data: Partial<Profile>) =>
    request<Profile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadResume: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ success: boolean; characters: number; preview: string }>(
      '/api/profile/upload-resume',
      { method: 'POST', headers: {}, body: form }
    );
  },
};

// ── Jobs ──────────────────────────────────────────────────────
export const jobsApi = {
  list: (params?: {
    status?: string;
    grade?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.grade) qs.set('grade', params.grade);
    if (params?.search) qs.set('search', params.search);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    return request<Job[]>(`/api/jobs${qs.toString() ? '?' + qs : ''}`);
  },
  stats: () => request<JobStats>('/api/jobs/stats'),
  get: (id: string) => request<Job>(`/api/jobs/${id}`),
  add: (data: { url?: string; title?: string; company?: string; description?: string }) =>
    request<Job>('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    request<{ success: boolean; status: string }>(`/api/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  evaluate: (id: string) =>
    request<Partial<Job>>(`/api/jobs/${id}/evaluate`, { method: 'POST' }),
  archive: (id: string) =>
    request<{ success: boolean }>(`/api/jobs/${id}`, { method: 'DELETE' }),
};

// ── Resumes ───────────────────────────────────────────────────
export const resumesApi = {
  list: () => request<ResumeVariant[]>('/api/resumes'),
  get: (id: string) => request<ResumeVariant>(`/api/resumes/${id}`),
  generate: (jobId: string) =>
    request<ResumeVariant>(`/api/resumes/generate/${jobId}`, { method: 'POST' }),
  downloadPdf: (id: string) =>
    fetch(`${BASE}/api/resumes/${id}/pdf`).then((r) => r.blob()),
};

// ── Applications ──────────────────────────────────────────────
export const applicationsApi = {
  list: () => request<Application[]>('/api/applications'),
  get: (id: string) => request<Application>(`/api/applications/${id}`),
  create: (data: { job_id: string; resume_variant_id?: string; notes?: string }) =>
    request<Application>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Application>) =>
    request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  generateOutreach: (id: string) =>
    request<{ outreach_message: string }>(`/api/applications/${id}/generate-outreach`, {
      method: 'POST',
    }),
  generateCoverLetter: (id: string) =>
    request<{ cover_letter: string }>(`/api/applications/${id}/generate-cover-letter`, {
      method: 'POST',
    }),
};

// ── Scanner ───────────────────────────────────────────────────
export const scannerApi = {
  sources: () => request<ScanSource[]>('/api/scanner/sources'),
  logs: () => request<ScanLog[]>('/api/scanner/logs'),
  addSource: (data: Partial<ScanSource>) =>
    request<ScanSource>('/api/scanner/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleSource: (id: string, enabled: boolean) =>
    request<ScanSource>(`/api/scanner/sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  deleteSource: (id: string) =>
    request<{ success: boolean }>(`/api/scanner/sources/${id}`, { method: 'DELETE' }),
  runScan: () => request<ScanResult>('/api/scanner/run', { method: 'POST' }),
};

// ── Apply ─────────────────────────────────────────────────────
export const applyApi = {
  prefill: (applicationId: string) =>
    request<{ success: boolean; fields_filled: string[]; apply_url: string; notes: string[]; message: string }>(
      '/api/apply/prefill',
      {
        method: 'POST',
        body: JSON.stringify({ application_id: applicationId, confirm: true }),
      }
    ),
};
