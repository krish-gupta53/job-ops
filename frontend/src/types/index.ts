export type AppStatus = 'to_apply' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'ghosted'

export interface Job {
  id: string
  title: string
  company: string
  location?: string
  url?: string
  apply_url?: string
  description?: string
  grade?: string
  status?: string
  archetype?: string
  score?: number
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  remote?: boolean
  match_summary?: string
  scraped_at?: string
  created_at?: string
  updated_at?: string
  evaluation?: JobEvaluation
}

export interface JobEvaluation {
  grade: string
  score: number
  summary: string
  dimensions: Record<string, number>
  star_stories?: string[]
  negotiation_script?: string
  red_flags?: string[]
  green_flags?: string[]
}

export interface JobStats {
  total: number
  grade_a: number
  grade_b: number
  grade_c: number
  applied: number
  interviews: number
  offers: number
  evaluations_today: number
  by_grade: Record<string, number>
  by_status: Record<string, number>
}

export interface ResumeVariant {
  id: string
  job_id: string
  job_title?: string
  company?: string
  created_at?: string
  content?: string
  changes_summary?: string
  keywords_added?: string[]
  pdf_url?: string
}

export interface Application {
  id: string
  job_id: string
  status: AppStatus
  resume_variant_id?: string
  cover_letter?: string
  outreach_message?: string
  interview_prep?: string
  notes?: string
  applied_at?: string
  next_followup?: string
  recruiter_name?: string
  recruiter_linkedin?: string
  created_at?: string
  updated_at?: string
}

export interface Profile {
  id?: string
  name?: string
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  summary?: string
  career_story?: string
  proof_points?: string[]
  skills?: string[]
  target_roles?: string[]
  target_domains?: string[]
  target_locations?: string[]
  work_style?: string[]
  avoid?: string[]
  resume_text?: string
  created_at?: string
  updated_at?: string
}

export interface ScanSource {
  id: string
  name: string
  source_type: string
  company_name: string
  url?: string
  enabled: boolean
  jobs_found?: number
  last_scanned?: string
  created_at?: string
}

export interface ScanLog {
  id: string
  source_id?: string
  source_name?: string
  status: 'success' | 'error' | 'running'
  jobs_found?: number
  new_jobs?: number
  error_message?: string
  started_at?: string
  finished_at?: string
  duration_seconds?: number
}
