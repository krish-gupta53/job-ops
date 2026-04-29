from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging
import asyncio
import json

from app.core.database import get_db
from app.core.models import ScanSource, ScanLog, Profile

router = APIRouter()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory live event queue for SSE — scanner_service pushes events here
# ---------------------------------------------------------------------------
_live_subscribers: list[asyncio.Queue] = []


def push_scan_event(event: dict):
    """Called from scanner_service to broadcast a job-evaluated event to all SSE subscribers."""
    dead = []
    for q in _live_subscribers:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        try:
            _live_subscribers.remove(q)
        except ValueError:
            pass


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
    """Return scan logs joined with source name."""
    result = await db.execute(
        select(ScanLog, ScanSource.name.label("source_name"))
        .outerjoin(ScanSource, ScanLog.source_id == ScanSource.id)
        .order_by(ScanLog.started_at.desc())
        .limit(limit)
    )
    rows = result.all()
    logs = []
    for log, source_name in rows:
        log_dict = {
            "id": log.id,
            "source_id": log.source_id,
            "source_name": source_name or "—",
            "status": log.status,
            "jobs_found": log.jobs_found,
            "jobs_new": log.jobs_new,
            "error_message": log.error_message,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "finished_at": log.finished_at.isoformat() if log.finished_at else None,
        }
        logs.append(log_dict)
    return logs


@router.get("/live")
async def live_scan_events():
    """
    SSE endpoint — streams job-evaluated events in real time during a scan.
    Each event is a JSON object: { type, job_id, title, company, score, grade, status }
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=200)
    _live_subscribers.append(queue)

    async def event_generator():
        try:
            # Send a heartbeat immediately so the connection is confirmed
            yield "event: connected\ndata: {}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    if event is None:  # sentinel — scan ended
                        yield "event: scan_done\ndata: {}\n\n"
                        break
                    yield f"event: job_evaluated\ndata: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive ping every 25s
                    yield "event: ping\ndata: {}\n\n"
        finally:
            try:
                _live_subscribers.remove(queue)
            except ValueError:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
