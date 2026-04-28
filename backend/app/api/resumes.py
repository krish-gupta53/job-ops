from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import logging

from app.core.database import get_db
from app.core.models import ResumeVariant, Job
from app.services.resume_tailor import tailor_resume_for_job
from app.services.pdf_generator import generate_resume_pdf

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("")
async def list_resumes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResumeVariant).order_by(ResumeVariant.generated_at.desc()))
    return result.scalars().all()


@router.get("/{resume_id}")
async def get_resume(resume_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResumeVariant).where(ResumeVariant.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("/generate/{job_id}")
async def generate_resume_for_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Generate a tailored resume PDF for a specific job."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resume_variant = await tailor_resume_for_job(job_id)
    return resume_variant


@router.post("/generate-batch")
async def generate_resumes_batch(job_ids: list[str], db: AsyncSession = Depends(get_db)):
    """Generate tailored resumes for multiple jobs in parallel."""
    import asyncio
    tasks = [tailor_resume_for_job(jid) for jid in job_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return {
        "success": [r for r in results if not isinstance(r, Exception)],
        "errors": [str(r) for r in results if isinstance(r, Exception)]
    }


@router.get("/{resume_id}/download")
async def download_resume_pdf(resume_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResumeVariant).where(ResumeVariant.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if not resume.pdf_path or not os.path.exists(resume.pdf_path):
        # Regenerate PDF
        await generate_resume_pdf(resume_id)
        await db.refresh(resume)
    if not os.path.exists(resume.pdf_path):
        raise HTTPException(status_code=500, detail="PDF generation failed")
    return FileResponse(
        resume.pdf_path,
        media_type="application/pdf",
        filename=f"resume_{resume.company}_{resume.job_title}.pdf".replace(" ", "_")
    )
