from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.core.database import get_db
from app.core.models import Application, Job
from app.services.auto_apply import attempt_auto_fill

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/fill/{application_id}")
async def auto_fill_application(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Use Playwright to open the job application URL, prefill form fields,
    and take a screenshot. Does NOT auto-submit — human reviews first.
    """
    result = await db.execute(select(Application).where(Application.id == application_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    fill_result = await attempt_auto_fill(application_id)
    return fill_result


@router.post("/submit/{application_id}")
async def confirm_submit(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Manually confirm submission after reviewing the pre-filled form.
    Updates status to 'applied'.
    """
    from datetime import datetime
    result = await db.execute(select(Application).where(Application.id == application_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = "applied"
    app.applied_at = datetime.utcnow()
    # Also update parent job
    job_result = await db.execute(select(Job).where(Job.id == app.job_id))
    job = job_result.scalar_one_or_none()
    if job:
        job.status = "applied"
    await db.commit()
    return {"success": True, "status": "applied"}
