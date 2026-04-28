from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.models import Job
from app.services.evaluator import evaluate_job

router = APIRouter()
logger = logging.getLogger(__name__)


class JobAddManual(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None


class JobStatusUpdate(BaseModel):
    status: str


@router.get("")
async def list_jobs(
    status: Optional[str] = None,
    grade: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    query = select(Job).where(Job.is_archived == False)
    if status:
        query = query.where(Job.status == status)
    if grade:
        query = query.where(Job.grade == grade)
    if search:
        query = query.where(
            (Job.title.ilike(f"%{search}%")) |
            (Job.company.ilike(f"%{search}%"))
        )
    query = query.order_by(Job.score.desc(), Job.scraped_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    jobs = result.scalars().all()
    return jobs


@router.get("/stats")
async def job_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count()).select_from(Job).where(Job.is_archived == False))
    total = result.scalar()
    result = await db.execute(select(func.count()).select_from(Job).where(Job.grade == "A", Job.is_archived == False))
    grade_a = result.scalar()
    result = await db.execute(select(func.count()).select_from(Job).where(Job.grade == "B", Job.is_archived == False))
    grade_b = result.scalar()
    result = await db.execute(select(func.count()).select_from(Job).where(Job.status == "applied", Job.is_archived == False))
    applied = result.scalar()
    result = await db.execute(select(func.count()).select_from(Job).where(Job.status == "interview", Job.is_archived == False))
    interviews = result.scalar()
    return {
        "total": total,
        "grade_a": grade_a,
        "grade_b": grade_b,
        "applied": applied,
        "interviews": interviews,
    }


@router.get("/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("")
async def add_job_manual(data: JobAddManual, db: AsyncSession = Depends(get_db)):
    """Manually add a job by URL or raw description."""
    from app.services.scraper import scrape_job_url
    import hashlib

    if data.url:
        scraped = await scrape_job_url(data.url)
        if not scraped:
            raise HTTPException(status_code=422, detail="Could not scrape the provided URL")
        external_id = hashlib.md5(data.url.encode()).hexdigest()
        existing = await db.execute(select(Job).where(Job.external_id == external_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Job already exists in pipeline")
        job = Job(
            external_id=external_id,
            title=scraped.get("title", data.title or ""),
            company=scraped.get("company", data.company or ""),
            description=scraped.get("description", ""),
            source_url=data.url,
            apply_url=data.url,
            source="manual",
        )
    else:
        import hashlib, time
        external_id = hashlib.md5(f"{data.title}{data.company}{time.time()}".encode()).hexdigest()
        job = Job(
            external_id=external_id,
            title=data.title or "Untitled",
            company=data.company or "Unknown",
            description=data.description or "",
            source="manual",
        )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Trigger async evaluation
    await evaluate_job(job.id)

    return job


@router.patch("/{job_id}/status")
async def update_job_status(job_id: str, data: JobStatusUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = data.status
    job.updated_at = datetime.utcnow()
    await db.commit()
    return {"success": True, "status": data.status}


@router.delete("/{job_id}")
async def archive_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.is_archived = True
    await db.commit()
    return {"success": True}


@router.post("/{job_id}/evaluate")
async def re_evaluate_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Re-run AI evaluation for a specific job."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    updated = await evaluate_job(job_id)
    return updated
