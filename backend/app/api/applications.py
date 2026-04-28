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


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_linkedin: Optional[str] = None
    cover_letter: Optional[str] = None
    outreach_message: Optional[str] = None
    next_followup: Optional[datetime] = None


@router.get("")
async def list_applications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Application).order_by(Application.last_activity.desc())
    )
    return result.scalars().all()


@router.post("/create/{job_id}")
async def create_application(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = await db.execute(select(Application).where(Application.job_id == job_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Application already exists for this job")

    app = Application(job_id=job_id)
    db.add(app)
    job.status = "shortlisted"
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
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(app, key, value)
    app.last_activity = datetime.utcnow()
    await db.commit()
    await db.refresh(app)
    return app


@router.post("/{app_id}/generate-outreach")
async def generate_outreach(app_id: str, db: AsyncSession = Depends(get_db)):
    """Generate LinkedIn/email outreach message for this application."""
    from app.services.outreach import generate_outreach_message
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    message = await generate_outreach_message(app_id)
    app.outreach_message = message
    await db.commit()
    return {"message": message}


@router.post("/{app_id}/generate-interview-prep")
async def generate_interview_prep(app_id: str, db: AsyncSession = Depends(get_db)):
    """Generate interview prep notes with STAR stories."""
    from app.services.interview_prep import generate_prep
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    prep = await generate_prep(app_id)
    app.interview_prep = prep
    await db.commit()
    return {"prep": prep}
