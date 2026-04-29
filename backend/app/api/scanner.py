from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging

from app.core.database import get_db
from app.core.models import ScanSource, ScanLog

router = APIRouter()
logger = logging.getLogger(__name__)


class SourceCreate(BaseModel):
    name: str
    source_type: str   # greenhouse, lever, ashby, custom
    company_name: str
    url: Optional[str] = ""


@router.get("/sources")
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanSource).order_by(ScanSource.name))
    return result.scalars().all()


@router.post("/sources")
async def add_source(data: SourceCreate, db: AsyncSession = Depends(get_db)):
    source = ScanSource(
        name=data.name,
        source_type=data.source_type,
        company_name=data.company_name,
        url=data.url or "",
        enabled=True,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.patch("/sources/{source_id}/toggle")
async def toggle_source(source_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanSource).where(ScanSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    source.enabled = not source.enabled
    await db.commit()
    return {"enabled": source.enabled}


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
async def trigger_scan():
    """Manually trigger a full scan across ALL enabled sources (background task)."""
    import asyncio
    from app.services.scanner_service import run_full_scan
    asyncio.create_task(run_full_scan())
    return {"message": "Scan started in background"}


@router.post("/seed-defaults")
async def seed_defaults():
    """Add any default companies that are missing from the DB.
    Safe to call multiple times — only inserts what is not already present."""
    from app.services.scanner_service import seed_missing_defaults
    added = await seed_missing_defaults()
    return {"added": added, "message": f"{added} new default source(s) added."}


@router.get("/defaults")
async def list_defaults():
    """Return the full list of built-in default companies (for UI preview)."""
    from app.services.scanner_service import DEFAULT_SOURCES
    return DEFAULT_SOURCES


@router.get("/logs")
async def scan_logs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScanLog).order_by(ScanLog.started_at.desc()).limit(limit)
    )
    return result.scalars().all()
