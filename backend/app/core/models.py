from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False, default="")
    email = Column(String, default="")
    phone = Column(String, default="")
    location = Column(String, default="")
    linkedin_url = Column(String, default="")
    github_url = Column(String, default="")
    portfolio_url = Column(String, default="")

    # Role preferences
    target_roles = Column(JSON, default=list)          # ["Software Engineer", "ML Engineer", ...]
    target_domains = Column(JSON, default=list)        # ["AI", "Data Engineering", "Automation", ...]
    preferred_locations = Column(JSON, default=list)   # ["Remote", "Bangalore", ...]
    work_style = Column(JSON, default=list)            # ["Remote", "Hybrid", "On-site"]
    min_salary = Column(Integer, default=0)
    max_salary = Column(Integer, default=0)
    salary_currency = Column(String, default="INR")
    experience_years = Column(Float, default=0)
    open_to_relocation = Column(Boolean, default=True)
    notice_period_days = Column(Integer, default=30)

    # Resume content (structured)
    resume_markdown = Column(Text, default="")         # Master resume in markdown
    skills = Column(JSON, default=list)                # ["Python", "FastAPI", "LLMs", ...]
    certifications = Column(JSON, default=list)
    education = Column(JSON, default=list)
    experience = Column(JSON, default=list)            # List of job objects
    projects = Column(JSON, default=list)
    summary = Column(Text, default="")
    career_story = Column(Text, default="")            # Used to personalize AI scoring
    proof_points = Column(Text, default="")            # Key achievements / numbers
    avoid_preferences = Column(Text, default="")       # What to avoid in jobs

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    external_id = Column(String, unique=True, index=True)  # hash of URL
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, default="")
    remote = Column(Boolean, default=False)
    job_type = Column(String, default="full-time")       # full-time, contract, freelance
    source = Column(String, default="")                  # greenhouse, lever, ashby, wellfound, ...
    source_url = Column(String, default="")
    apply_url = Column(String, default="")
    description = Column(Text, default="")
    salary_min = Column(Integer, default=0)
    salary_max = Column(Integer, default=0)
    salary_currency = Column(String, default="USD")
    posted_at = Column(DateTime, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow)

    # AI evaluation
    score = Column(Float, default=0.0)                   # 0-5
    grade = Column(String, default="")                   # A, B, C, D, F
    archetype = Column(String, default="")               # LLMOps, Agentic AI, Backend, Data, ...
    match_summary = Column(Text, default="")
    gaps = Column(JSON, default=list)
    strengths = Column(JSON, default=list)
    keywords = Column(JSON, default=list)                # Extracted JD keywords
    evaluation_report = Column(Text, default="")         # Full markdown report
    evaluated_at = Column(DateTime, nullable=True)

    # Status
    status = Column(String, default="new")               # new, shortlisted, applied, interview, offer, rejected, archived
    is_archived = Column(Boolean, default=False)

    # Relationships
    resume_id = Column(String, ForeignKey("resume_variants.id"), nullable=True)
    resume = relationship("ResumeVariant", back_populates="job", foreign_keys=[resume_id])
    application = relationship("Application", back_populates="job", uselist=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResumeVariant(Base):
    __tablename__ = "resume_variants"

    id = Column(String, primary_key=True, default=gen_uuid)
    job_id = Column(String, nullable=True)               # Which job this was tailored for
    job_title = Column(String, default="")
    company = Column(String, default="")
    content_markdown = Column(Text, default="")          # Tailored resume in markdown
    changes_summary = Column(Text, default="")           # What changed vs master
    keywords_injected = Column(JSON, default=list)
    pdf_path = Column(String, default="")                # Local path to generated PDF
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to job (nullable since master resume has no job)
    job = relationship("Job", back_populates="resume", foreign_keys=[Job.resume_id])


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=gen_uuid)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    resume_variant_id = Column(String, ForeignKey("resume_variants.id"), nullable=True)

    status = Column(String, default="to_apply")          # to_apply, applied, interviewing, offer, rejected, ghosted
    applied_at = Column(DateTime, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
    next_followup = Column(DateTime, nullable=True)

    # Communication
    cover_letter = Column(Text, default="")
    outreach_message = Column(Text, default="")
    notes = Column(Text, default="")
    recruiter_name = Column(String, default="")
    recruiter_linkedin = Column(String, default="")

    # Interview prep
    interview_prep = Column(Text, default="")            # STAR stories, company research
    salary_negotiation = Column(Text, default="")

    # Apply automation
    auto_fill_attempted = Column(Boolean, default=False)
    auto_fill_success = Column(Boolean, default=False)
    auto_fill_screenshot = Column(String, default="")    # path to screenshot
    auto_fill_notes = Column(Text, default="")

    job = relationship("Job", back_populates="application")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScanSource(Base):
    __tablename__ = "scan_sources"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)         # greenhouse, lever, ashby, wellfound, custom
    url = Column(String, default="")
    company_name = Column(String, default="")
    enabled = Column(Boolean, default=True)
    last_scanned = Column(DateTime, nullable=True)
    jobs_found_total = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)


class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    source_id = Column(String, ForeignKey("scan_sources.id"), nullable=True)
    status = Column(String, default="running")           # running, completed, failed
    jobs_found = Column(Integer, default=0)
    jobs_new = Column(Integer, default=0)
    error_message = Column(Text, default="")
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
