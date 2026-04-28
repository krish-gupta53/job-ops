"""Background scheduler: run job scans at configured intervals."""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.core.config import settings

logger = logging.getLogger(__name__)

_scheduler = None


async def run_scheduled_scan():
    """Called by the scheduler to run a full scan."""
    try:
        from app.services.scanner_service import run_full_scan
        logger.info("Starting scheduled scan...")
        result = await run_full_scan()
        logger.info(f"Scheduled scan complete: {result['total_new']} new jobs found")
    except Exception as e:
        logger.error(f"Scheduled scan error: {e}")


async def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        run_scheduled_scan,
        trigger=IntervalTrigger(hours=settings.SCAN_INTERVAL_HOURS),
        id="job_scan",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    _scheduler.start()
    logger.info(f"Scheduler started. Scans every {settings.SCAN_INTERVAL_HOURS}h.")


async def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
