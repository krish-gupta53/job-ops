export interface Profile {
  id: string
  name: string
  email: string
  phone: string
  location: string
  linkedin_url: string
  github_url: string
  portfolio_url: string
  target_roles: string[]
  target_domains: string[]
  preferred_locations: string[]
  work_style: string[]
  min_salary: number
  max_salary: number
  salary_currency: string
  experience_years: number
  open_to_relocation: boolean
  notice_period_days: number
  resume_markdown: string
  skills: string[]
  certifications: unknown[]
  education: unknown[]
  experience: unknown[]
  projects: unknown[]
  summary: string
  career_story: string
  proof_points: string
  avoid_preferences: string
  created_at: string
  updated_at: string
}

export type JobGrade = 'A' | 'B' | 'C' | 'D' | 'F' | ''
export type JobStatus = 'new' | 'shortlisted' | 'applied' | 'interview' | 'offer' | 'rejected' | 'archived'

export interface Job {
  id: string
  external_id: string
  title: string
  company: string
  location: string
  remote: boolean
  job_type: string
  source: string
  source_url: string
  apply_url: string
  description: string
  salary_min: number
  salary_max: number
  salary_currency: string
  posted_at: string | null
  scraped_at: string
  score: number
  grade: JobGrade
  archetype: string
  match_summary: string
  gaps: string[]
  strengths: string[]
  keywords: string[]
  evaluation_report: string
  evaluated_at: string | null
  status: JobStatus
  is_archived: boolean
  resume_id: string | null
  created_at: string
  updated_at: string
}

export interface JobStats {
  total: number
  grade_a: number
  grade_b: number
  applied: number
  interviews: number
}

export type AppStatus = 'to_apply' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'ghosted'

export interface Application {
  id: string
  job_id: string
  resume_variant_id: string | null
  status: AppStatus
  applied_at: string | null
  last_activity: string
  next_followup: string | null
  cover_letter: string
  outreach_message: string
  notes: string
  recruiter_name: string
  recruiter_linkedin: string
  interview_prep: string
  salary_negotiation: string
  auto_fill_attempted: boolean
  auto_fill_success: boolean
  auto_fill_screenshot: string
  auto_fill_notes: string
  created_at: string
  updated_at: string
}

export interface ResumeVariant {
  id: string
  job_id: string | null
  job_title: string
  company: string
  content_markdown: string
  changes_summary: string
  keywords_injected: string[]
  pdf_path: string
  generated_at: string
}

export interface ScanSource {
  id: string
  name: string
  source_type: string
  url: string
  company_name: string
  enabled: boolean
  last_scanned: string | null
  jobs_found_total: number
  created_at: string
}

export interface ScanLog {
  id: string
  source_id: string | null
  status: 'running' | 'completed' | 'failed'
  jobs_found: number
  jobs_new: number
  error_message: string
  started_at: string
  finished_at: string | null
}
