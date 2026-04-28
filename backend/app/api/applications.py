from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.models import Application, Job

router = APIRouter()
logger = logging.getLogger(__name__)


class ApplicationCreate(BaseModel):
    job_id: str
    resume_variant_id: Optional[str] = None
    cover_letter: Optional[str] = ""
    notes: Optional[str] = ""


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_linkedin: Optional[str] = None
    outreach_message: Optional[str] = None
    interview_prep: Optional[str] = None
    cover_letter: Optional[str] = None


@router.get("")
async def list_applications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Application).order_by(Application.last_activity.desc())
    )
    return result.scalars().all()


@router.post("")
async def create_application(data: ApplicationCreate, db: AsyncSession = Depends(get_db)):
    # Check job exists
    job_result = await db.execute(select(Job).where(Job.id == data.job_id))
    if not job_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if application already exists
    existing = await db.execute(select(Application).where(Application.job_id == data.job_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Application already exists for this job")

    app = Application(
        job_id=data.job_id,
        resume_variant_id=data.resume_variant_id,
        cover_letter=data.cover_letter or "",
        notes=data.notes or "",
        status="to_apply",
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.get("/{app_id}")
async def get_application(app_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.patch("/{app_id}")
async def update_application(app_id: str, data: ApplicationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(app, key, value)

    if data.status == "applied" and not app.applied_at:
        app.applied_at = datetime.utcnow()

    app.last_activity = datetime.utcnow()
    await db.commit()
    await db.refresh(app)
    return app


@router.post("/{app_id}/generate-outreach")
async def generate_outreach(app_id: str, db: AsyncSession = Depends(get_db)):
    """Generate a LinkedIn outreach message for this application."""
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job_result = await db.execute(select(Job).where(Job.id == app.job_id))
    job = job_result.scalar_one_or_none()

    from app.services.gemini_client import generate_flash
    from app.api.profile import get_or_create_profile
    profile = await get_or_create_profile(db)

    prompt = f"""Write a concise, genuine LinkedIn outreach message (under 300 chars) from a candidate to a recruiter at {job.company} regarding the {job.title} role.
Candidate name: {profile.name}
Candidate background: {profile.summary or profile.resume_markdown[:500]}
Keep it personal, specific to the role, and avoid generic templates.
Return only the message text."""

    msg = await generate_flash(prompt)
    app.outreach_message = msg
    app.last_activity = datetime.utcnow()
    await db.commit()
    return {"outreach_message": msg}


@router.post("/{app_id}/generate-cover-letter")
async def generate_cover_letter(app_id: str, db: AsyncSession = Depends(get_db)):
    """Generate a tailored cover letter for this application."""
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job_result = await db.execute(select(Job).where(Job.id == app.job_id))
    job = job_result.scalar_one_or_none()

    from app.services.gemini_client import generate_flash
    from app.api.profile import get_or_create_profile
    profile = await get_or_create_profile(db)

    prompt = f"""Write a strong, personalized cover letter for this job application.
Candidate: {profile.name}
Resume highlights: {profile.summary or profile.resume_markdown[:800]}
Job: {job.title} at {job.company}
JD: {job.description[:1500]}
Tone: Confident, specific, genuine. Avoid clichés.
Length: 3-4 paragraphs."""

    letter = await generate_flash(prompt)
    app.cover_letter = letter
    app.last_activity = datetime.utcnow()
    await db.commit()
    return {"cover_letter": letter}
