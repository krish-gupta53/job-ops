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

# ---------------------------------------------------------------------------
# Default pre-configured sources (ported from career-ops portals.example.yml)
# Organised by category. All entries have been verified against live ATS APIs.
# ---------------------------------------------------------------------------
DEFAULT_SOURCES = [
    # --- AI Labs & LLM providers ---
    {"name": "Anthropic",         "source_type": "greenhouse", "company_name": "anthropic"},
    {"name": "OpenAI",            "source_type": "greenhouse", "company_name": "openai"},
    {"name": "Cohere",            "source_type": "ashby",      "company_name": "cohere"},
    {"name": "LangChain",         "source_type": "ashby",      "company_name": "langchain"},
    {"name": "Pinecone",          "source_type": "ashby",      "company_name": "pinecone"},
    {"name": "Mistral AI",        "source_type": "lever",      "company_name": "mistral"},
    {"name": "Perplexity",        "source_type": "ashby",      "company_name": "perplexity"},
    {"name": "Hugging Face",      "source_type": "ashby",      "company_name": "huggingface"},
    {"name": "Aleph Alpha",       "source_type": "ashby",      "company_name": "AlephAlpha"},
    {"name": "DeepL",             "source_type": "ashby",      "company_name": "DeepL"},
    {"name": "Black Forest Labs", "source_type": "greenhouse", "company_name": "blackforestlabs"},
    {"name": "Stability AI",      "source_type": "greenhouse", "company_name": "stabilityai"},

    # --- Voice AI & Conversational AI ---
    {"name": "ElevenLabs",        "source_type": "ashby",      "company_name": "elevenlabs"},
    {"name": "PolyAI",            "source_type": "greenhouse", "company_name": "polyai"},
    {"name": "Parloa",            "source_type": "greenhouse", "company_name": "parloa"},
    {"name": "Hume AI",           "source_type": "greenhouse", "company_name": "humeai"},
    {"name": "Deepgram",          "source_type": "ashby",      "company_name": "deepgram"},
    {"name": "Vapi",              "source_type": "ashby",      "company_name": "vapi"},
    {"name": "Bland AI",          "source_type": "ashby",      "company_name": "bland"},
    {"name": "Speechmatics",      "source_type": "greenhouse", "company_name": "speechmatics"},

    # --- AI-native platforms (FDE/SA teams) ---
    {"name": "Retool",            "source_type": "greenhouse", "company_name": "retool"},
    {"name": "Airtable",          "source_type": "greenhouse", "company_name": "airtable"},
    {"name": "Vercel",            "source_type": "greenhouse", "company_name": "vercel"},
    {"name": "Temporal",          "source_type": "greenhouse", "company_name": "temporal"},
    {"name": "Arize AI",          "source_type": "greenhouse", "company_name": "arizeai"},
    {"name": "RunPod",            "source_type": "greenhouse", "company_name": "runpod"},
    {"name": "Glean",             "source_type": "greenhouse", "company_name": "gleanwork"},
    {"name": "Clay Labs",         "source_type": "ashby",      "company_name": "claylabs"},
    {"name": "Runway",            "source_type": "greenhouse", "company_name": "runwayml"},
    {"name": "Hightouch",         "source_type": "greenhouse", "company_name": "hightouch"},
    {"name": "Synthesia",         "source_type": "ashby",      "company_name": "synthesia"},
    {"name": "Attio",             "source_type": "ashby",      "company_name": "attio"},
    {"name": "Tinybird",          "source_type": "ashby",      "company_name": "tinybird"},
    {"name": "Lakera",            "source_type": "ashby",      "company_name": "lakera.ai"},
    {"name": "WorkOS",            "source_type": "ashby",      "company_name": "workos"},
    {"name": "Lovable",           "source_type": "ashby",      "company_name": "lovable"},
    {"name": "Legora",            "source_type": "ashby",      "company_name": "legora"},
    {"name": "Pigment",           "source_type": "lever",      "company_name": "pigment"},
    {"name": "Photoroom",         "source_type": "ashby",      "company_name": "photoroom"},

    # --- Contact Center AI & CX ---
    {"name": "Intercom",          "source_type": "greenhouse", "company_name": "intercom"},
    {"name": "Sierra",            "source_type": "ashby",      "company_name": "sierra"},
    {"name": "Decagon",           "source_type": "ashby",      "company_name": "decagon"},
    {"name": "Ada",               "source_type": "greenhouse", "company_name": "ada"},
    {"name": "Lindy",             "source_type": "ashby",      "company_name": "lindy"},
    {"name": "Cognigy",           "source_type": "ashby",      "company_name": "cognigy"},

    # --- Enterprise comms & contact center ---
    {"name": "Salesforce",        "source_type": "greenhouse", "company_name": "salesforce"},
    {"name": "Gong",              "source_type": "greenhouse", "company_name": "gong"},
    {"name": "Twilio",            "source_type": "greenhouse", "company_name": "twilio"},
    {"name": "Dialpad",           "source_type": "greenhouse", "company_name": "dialpad"},

    # --- AI infra & LLMOps ---
    {"name": "Weights & Biases",  "source_type": "lever",      "company_name": "wandb"},
    {"name": "Langfuse",          "source_type": "ashby",      "company_name": "langfuse"},
    {"name": "Arize AI",          "source_type": "greenhouse", "company_name": "arizeai"},

    # --- No-Code / Low-Code / Automation ---
    {"name": "n8n",               "source_type": "ashby",      "company_name": "n8n"},
    {"name": "Zapier",            "source_type": "ashby",      "company_name": "zapier"},
    {"name": "Boomi",             "source_type": "greenhouse", "company_name": "boomilp"},

    # --- Developer tools & AI infra ---
    {"name": "Supabase",          "source_type": "ashby",      "company_name": "supabase"},
    {"name": "Resend",            "source_type": "ashby",      "company_name": "resend"},
    {"name": "Clerk",             "source_type": "ashby",      "company_name": "clerk"},
    {"name": "Inngest",           "source_type": "ashby",      "company_name": "inngest"},
    {"name": "PlanetScale",       "source_type": "greenhouse", "company_name": "planetscale"},

    # --- UK & Ireland AI ---
    {"name": "Wayve",             "source_type": "greenhouse", "company_name": "wayve"},
    {"name": "Isomorphic Labs",   "source_type": "greenhouse", "company_name": "isomorphiclabs"},
    {"name": "PhysicsX",          "source_type": "greenhouse", "company_name": "physicsx"},
    {"name": "Faculty",           "source_type": "ashby",      "company_name": "faculty"},
    {"name": "Causaly",           "source_type": "ashby",      "company_name": "causaly"},

    # --- Nordics ---
    {"name": "Spotify",           "source_type": "lever",      "company_name": "spotify"},
    {"name": "Vinted",            "source_type": "lever",      "company_name": "vinted"},

    # --- European tech ---
    {"name": "Factorial",         "source_type": "greenhouse", "company_name": "factorial"},
    {"name": "Travelperk",        "source_type": "ashby",      "company_name": "travelperk"},
    {"name": "Clarity AI",        "source_type": "lever",      "company_name": "clarity-ai"},
    {"name": "Amplemarket",       "source_type": "greenhouse", "company_name": "amplemarket"},
    {"name": "Qonto",             "source_type": "lever",      "company_name": "qonto"},
    {"name": "Forto",             "source_type": "lever",      "company_name": "forto"},

    # --- DACH enterprise & AI ---
    {"name": "Celonis",           "source_type": "greenhouse", "company_name": "celonis"},
    {"name": "Contentful",        "source_type": "greenhouse", "company_name": "contentful"},
    {"name": "GetYourGuide",      "source_type": "greenhouse", "company_name": "getyourguide"},
    {"name": "HelloFresh",        "source_type": "greenhouse", "company_name": "hellofresh"},
    {"name": "Helsing",           "source_type": "greenhouse", "company_name": "helsing"},
    {"name": "N26",               "source_type": "greenhouse", "company_name": "n26"},
    {"name": "Trade Republic",    "source_type": "greenhouse", "company_name": "traderepublicbank"},
    {"name": "SumUp",             "source_type": "greenhouse", "company_name": "sumup"},
    {"name": "Scandit",           "source_type": "greenhouse", "company_name": "scandit"},
    {"name": "Palantir",          "source_type": "lever",      "company_name": "palantir"},

    # --- Canada / Vancouver tech ---
    {"name": "Later",             "source_type": "greenhouse", "company_name": "later"},
    {"name": "Hootsuite",         "source_type": "greenhouse", "company_name": "hootsuite"},
    {"name": "Klue",              "source_type": "ashby",      "company_name": "klue"},
    {"name": "Sanctuary AI",      "source_type": "lever",      "company_name": "sanctuary"},

    # --- Iberia AI ---
    {"name": "Amplemarket",       "source_type": "greenhouse", "company_name": "amplemarket"},
]

# Deduplicate by (source_type, company_name) in case of duplicates above
_seen = set()
_deduped = []
for s in DEFAULT_SOURCES:
    key = (s["source_type"], s["company_name"])
    if key not in _seen:
        _seen.add(key)
        _deduped.append(s)
DEFAULT_SOURCES = _deduped


async def seed_default_sources():
    """Add default sources if none exist in DB."""
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


async def seed_missing_defaults():
    """Add any default sources not yet present (safe to call multiple times)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ScanSource.company_name, ScanSource.source_type))
        existing_keys = {(row[1], row[0]) for row in result.all()}
        added = 0
        for s in DEFAULT_SOURCES:
            key = (s["source_type"], s["company_name"])
            if key not in existing_keys:
                db.add(ScanSource(
                    name=s["name"],
                    source_type=s["source_type"],
                    company_name=s["company_name"],
                    enabled=True,
                ))
                added += 1
        if added:
            await db.commit()
            logger.info(f"Added {added} missing default sources")
        return added


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

                    # Evaluate immediately after insert
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
