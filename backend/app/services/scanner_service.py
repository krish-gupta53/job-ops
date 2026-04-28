"""Portal scanning service: discover new jobs from configured sources."""
import hashlib
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.models import Job, ScanSource, ScanLog
from app.services.scraper import scan_greenhouse_company, scan_lever_company, scan_ashby_company
from app.services.evaluator import evaluate_job

logger = logging.getLogger(__name__)

# Default pre-configured sources
DEFAULT_SOURCES = [
    {"name": "Anthropic", "source_type": "greenhouse", "company_name": "anthropic"},
    {"name": "OpenAI", "source_type": "greenhouse", "company_name": "openai"},
    {"name": "ElevenLabs", "source_type": "greenhouse", "company_name": "elevenlabs"},
    {"name": "Retool", "source_type": "greenhouse", "company_name": "retool"},
    {"name": "Mistral AI", "source_type": "lever", "company_name": "mistral"},
    {"name": "Cohere", "source_type": "greenhouse", "company_name": "cohere"},
    {"name": "Weights & Biases", "source_type": "lever", "company_name": "weights-and-biases"},
    {"name": "n8n", "source_type": "ashby", "company_name": "n8n"},
    {"name": "Langfuse", "source_type": "ashby", "company_name": "langfuse"},
    {"name": "Temporal", "source_type": "greenhouse", "company_name": "temporal-technologies"},
]


async def seed_default_sources():
    """Add default sources if none exist."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ScanSource).limit(1))
        if result.scalar_one_or_none():
            return  # Already seeded
        for s in DEFAULT_SOURCES:
            src = ScanSource(
                name=s["name"],
                source_type=s["source_type"],
                company_name=s["company_name"],
                enabled=True,
            )
            db.add(src)
        await db.commit()
        logger.info(f"Seeded {len(DEFAULT_SOURCES)} default scan sources")


async def run_full_scan() -> dict:
    """Run a full scan of all enabled sources."""
    await seed_default_sources()

    async with AsyncSessionLocal() as db:
        sources_result = await db.execute(
            select(ScanSource).where(ScanSource.enabled == True)
        )
        sources = sources_result.scalars().all()

    total_new = 0
    total_found = 0
    errors = []

    for source in sources:
        log = ScanLog(source_id=source.id, status="running", started_at=datetime.utcnow())
        async with AsyncSessionLocal() as db:
            db.add(log)
            await db.commit()
            await db.refresh(log)

        found_jobs = []
        try:
            if source.source_type == "greenhouse":
                found_jobs = await scan_greenhouse_company(source.company_name)
            elif source.source_type == "lever":
                found_jobs = await scan_lever_company(source.company_name)
            elif source.source_type == "ashby":
                found_jobs = await scan_ashby_company(source.company_name)

            total_found += len(found_jobs)
            new_count = 0

            for jd in found_jobs:
                url = jd.get("source_url") or jd.get("apply_url", "")
                if not url:
                    continue
                ext_id = hashlib.md5(url.encode()).hexdigest()

                async with AsyncSessionLocal() as db:
                    existing = await db.execute(select(Job).where(Job.external_id == ext_id))
                    if existing.scalar_one_or_none():
                        continue

                    job = Job(
                        external_id=ext_id,
                        title=jd.get("title", "Untitled"),
                        company=source.name,
                        location=jd.get("location", ""),
                        remote=jd.get("remote", False),
                        job_type=jd.get("job_type", "full-time"),
                        source=source.source_type,
                        source_url=url,
                        apply_url=jd.get("apply_url", url),
                        description=jd.get("description", ""),
                        salary_min=jd.get("salary_min", 0),
                        salary_max=jd.get("salary_max", 0),
                        salary_currency=jd.get("salary_currency", "USD"),
                    )
                    db.add(job)
                    await db.commit()
                    await db.refresh(job)
                    new_count += 1
                    total_new += 1

                    # Evaluate asynchronously
                    try:
                        await evaluate_job(job.id)
                    except Exception as eval_err:
                        logger.warning(f"Eval failed for {job.id}: {eval_err}")

            async with AsyncSessionLocal() as db:
                log_result = await db.execute(select(ScanLog).where(ScanLog.id == log.id))
                log_obj = log_result.scalar_one_or_none()
                if log_obj:
                    log_obj.status = "completed"
                    log_obj.jobs_found = len(found_jobs)
                    log_obj.jobs_new = new_count
                    log_obj.finished_at = datetime.utcnow()
                    await db.commit()

            async with AsyncSessionLocal() as db:
                src_result = await db.execute(select(ScanSource).where(ScanSource.id == source.id))
                src_obj = src_result.scalar_one_or_none()
                if src_obj:
                    src_obj.last_scanned = datetime.utcnow()
                    src_obj.jobs_found_total += len(found_jobs)
                    await db.commit()

        except Exception as e:
            errors.append(f"{source.name}: {str(e)}")
            logger.error(f"Scan failed for {source.name}: {e}")
            async with AsyncSessionLocal() as db:
                log_result = await db.execute(select(ScanLog).where(ScanLog.id == log.id))
                log_obj = log_result.scalar_one_or_none()
                if log_obj:
                    log_obj.status = "failed"
                    log_obj.error_message = str(e)
                    log_obj.finished_at = datetime.utcnow()
                    await db.commit()

    return {
        "sources_scanned": len(sources),
        "total_found": total_found,
        "total_new": total_new,
        "errors": errors,
        "completed_at": datetime.utcnow().isoformat(),
    }
