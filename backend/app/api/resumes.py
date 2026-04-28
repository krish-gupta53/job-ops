from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging
import os
import tempfile

from app.core.database import get_db
from app.core.models import ResumeVariant, Job

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("")
async def list_resume_variants(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ResumeVariant).order_by(ResumeVariant.generated_at.desc())
    )
    return result.scalars().all()


@router.get("/{variant_id}")
async def get_resume_variant(variant_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResumeVariant).where(ResumeVariant.id == variant_id))
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Resume variant not found")
    return variant


@router.post("/generate/{job_id}")
async def generate_for_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Manually trigger resume generation for a job."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    from app.services.resume_generator import generate_resume_variant
    result = await generate_resume_variant(job_id)
    if not result:
        raise HTTPException(status_code=500, detail="Resume generation failed")
    return result


@router.get("/{variant_id}/pdf")
async def download_resume_pdf(variant_id: str, db: AsyncSession = Depends(get_db)):
    """Generate and stream a PDF of the resume variant."""
    result = await db.execute(select(ResumeVariant).where(ResumeVariant.id == variant_id))
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Resume variant not found")

    from app.services.resume_generator import generate_pdf_from_markdown
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        tmp_path = f.name

    success = await generate_pdf_from_markdown(variant.content_markdown, tmp_path)
    if not success:
        raise HTTPException(status_code=500, detail="PDF rendering failed")

    with open(tmp_path, "rb") as f:
        pdf_bytes = f.read()
    os.unlink(tmp_path)

    filename = f"resume_{variant.company}_{variant.job_title}.pdf".replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
