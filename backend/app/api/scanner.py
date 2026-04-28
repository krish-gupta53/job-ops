from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging

from app.core.database import get_db
from app.core.models import ScanSource, ScanLog
from app.services.scanner_service import run_scan, run_full_scan

router = APIRouter()
logger = logging.getLogger(__name__)


class ScanSourceCreate(BaseModel):
    name: str
    source_type: str
    url: Optional[str] = ""
    company_name: Optional[str] = ""


@router.get("/sources")
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanSource).order_by(ScanSource.name))
    return result.scalars().all()


@router.post("/sources")
async def add_source(data: ScanSourceCreate, db: AsyncSession = Depends(get_db)):
    source = ScanSource(**data.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.delete("/sources/{source_id}")
async def delete_source(source_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanSource).where(ScanSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    await db.delete(source)
    await db.commit()
    return {"success": True}


@router.post("/run")
async def trigger_scan(db: AsyncSession = Depends(get_db)):
    """Trigger a full scan across all enabled sources."""
    result = await run_full_scan()
    return result


@router.post("/run/{source_id}")
async def trigger_source_scan(source_id: str, db: AsyncSession = Depends(get_db)):
    """Trigger scan for a specific source."""
    result = await run_scan(source_id)
    return result


@router.get("/logs")
async def get_scan_logs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScanLog).order_by(ScanLog.started_at.desc()).limit(limit)
    )
    return result.scalars().all()
