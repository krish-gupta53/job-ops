from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging

from app.core.database import get_db
from app.core.models import ScanSource, ScanLog, Profile

router = APIRouter()
logger = logging.getLogger(__name__)


class SourceCreate(BaseModel):
    name: str
    source_type: str
    company_name: str
    url: Optional[str] = ""


class ScanRunRequest(BaseModel):
    max_sources: Optional[int] = None


async def _require_resume(db: AsyncSession) -> None:
    result = await db.execute(select(Profile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile or not profile.resume_markdown:
        raise HTTPException(status_code=422, detail="no_resume")


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
async def trigger_scan(body: ScanRunRequest = ScanRunRequest(), db: AsyncSession = Depends(get_db)):
    """Trigger a scan. max_sources caps how many enabled sources are scanned."""
    from app.services.scanner_service import is_scan_running
    if is_scan_running():
        raise HTTPException(status_code=409, detail="scan_already_running")
    await _require_resume(db)
    import asyncio
    from app.services.scanner_service import run_full_scan
    asyncio.create_task(run_full_scan(max_sources=body.max_sources))
    return {"message": "Scan started", "max_sources": body.max_sources}


@router.post("/cancel")
async def cancel_scan():
    """Request cancellation of the currently running scan."""
    from app.services.scanner_service import is_scan_running, request_scan_cancel
    if not is_scan_running():
        return {"cancelled": False, "message": "No scan is currently running"}
    request_scan_cancel()
    return {"cancelled": True, "message": "Cancel signal sent — scan will stop after the current source completes"}


@router.get("/status")
async def scan_status():
    """Return whether a scan is currently running."""
    from app.services.scanner_service import is_scan_running
    return {"running": is_scan_running()}


@router.post("/seed-defaults")
async def seed_defaults(db: AsyncSession = Depends(get_db)):
    await _require_resume(db)
    from app.services.scanner_service import seed_missing_defaults
    added = await seed_missing_defaults()
    return {"added": added, "message": f"{added} new default source(s) added."}


@router.get("/defaults")
async def list_defaults():
    from app.services.scanner_service import DEFAULT_SOURCES
    return DEFAULT_SOURCES


@router.get("/logs")
async def scan_logs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScanLog).order_by(ScanLog.started_at.desc()).limit(limit)
    )
    return result.scalars().all()
