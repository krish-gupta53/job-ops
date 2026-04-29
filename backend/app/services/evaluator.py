"""AI evaluation engine: score + grade + report for each job using OpenAI gpt-4o-mini."""
import json
import re
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.models import Job, Profile
from app.services.openai_client import generate_flash
from app.services.resume_generator import generate_resume_variant

logger = logging.getLogger(__name__)


def score_to_grade(score: float) -> str:
    if score >= 4.5:
        return "A"
    elif score >= 3.8:
        return "B"
    elif score >= 3.0:
        return "C"
    elif score >= 2.0:
        return "D"
    return "F"


def _to_str(value) -> str:
    """Safely coerce any AI-returned value to a plain string for Text columns."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    # dict / list returned by AI — serialize to JSON string
    return json.dumps(value)


def _to_list(value) -> list:
    """Safely coerce any AI-returned value to a list for JSON columns."""
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else [value]
        except Exception:
            return [value]
    return []


async def evaluate_job(job_id: str) -> dict:
    """Run full AI evaluation on a job. Returns updated job dict."""
    async with AsyncSessionLocal() as db:
        job_result = await db.execute(select(Job).where(Job.id == job_id))
        job = job_result.scalar_one_or_none()
        if not job:
            logger.error(f"evaluate_job: job {job_id} not found")
            return {"error": "job_not_found", "job_id": job_id}

        profile_result = await db.execute(select(Profile).limit(1))
        profile = profile_result.scalar_one_or_none()
        if not profile:
            logger.warning("evaluate_job: no profile row in DB — skipping")
            return {"error": "no_profile", "job_id": job_id}
        if not profile.resume_markdown:
            logger.warning("evaluate_job: profile exists but resume_markdown is empty — skipping")
            return {"error": "no_resume", "job_id": job_id}

        prompt = f"""You are an expert career coach and recruiter. Evaluate this job against the candidate's profile.

=== CANDIDATE PROFILE ===
Name: {profile.name}
Experience: {profile.experience_years} years
Target Roles: {', '.join(profile.target_roles or [])}
Target Domains: {', '.join(profile.target_domains or [])}
Skills: {', '.join(profile.skills or [])}
Preferred Locations: {', '.join(profile.preferred_locations or [])}
Work Style: {', '.join(profile.work_style or [])}
Salary Expectation: {profile.min_salary}-{profile.max_salary} {profile.salary_currency}
Career Story: {profile.career_story or 'Not provided'}
Key Achievements: {profile.proof_points or 'Not provided'}
Preferences to Avoid: {profile.avoid_preferences or 'None'}

Resume Summary:
{profile.resume_markdown[:3000]}

=== JOB POSTING ===
Title: {job.title}
Company: {job.company}
Location: {job.location}
Remote: {job.remote}
Type: {job.job_type}
Salary: {job.salary_min}-{job.salary_max} {job.salary_currency}

Description:
{job.description[:4000]}

=== EVALUATION TASK ===
Provide a detailed evaluation. Return a JSON object with EXACTLY these keys:

{{
  "score": <float 0.0-5.0>,
  "archetype": <string: one of [LLMOps, Agentic AI, Backend, Full-Stack, Data Engineering, ML Engineering, Product, Solutions Architecture, Startup Generalist, Other]>,
  "match_summary": <2-3 sentence summary of overall fit>,
  "strengths": [<list of 3-5 specific strengths from candidate background matching this role>],
  "gaps": [<list of 2-4 areas where candidate falls short>],
  "keywords": [<list of 10-15 important JD keywords for ATS>],
  "positioning_strategy": <2-3 sentences on how candidate should position themselves>,
  "comp_assessment": <1-2 sentences on salary competitiveness>,
  "interview_prep": [<list of 2-3 key topics to prepare as strings>],
  "recommendation": <string: one of [Strongly Apply, Apply, Consider, Skip, Hard Pass]>,
  "full_report": <full markdown evaluation report as a single string with all sections>
}}

IMPORTANT: interview_prep must be a JSON array of strings, not an object.
full_report must be a plain markdown string, NOT a JSON object.
Return only valid JSON. No markdown fences."""

        try:
            raw = await generate_flash(prompt)
            raw = re.sub(r'^```json\s*|^```\s*|\s*```$', '', raw.strip(), flags=re.MULTILINE)
            data = json.loads(raw)

            job.score = float(data.get("score", 0.0))
            job.grade = score_to_grade(job.score)
            job.archetype = _to_str(data.get("archetype", ""))
            job.match_summary = _to_str(data.get("match_summary", ""))
            job.strengths = _to_list(data.get("strengths", []))
            job.gaps = _to_list(data.get("gaps", []))
            job.keywords = _to_list(data.get("keywords", []))
            # full_report must be a string — coerce dict/list to JSON string if AI misbehaves
            job.evaluation_report = _to_str(data.get("full_report", ""))
            job.evaluated_at = datetime.utcnow()

            # Auto-shortlist if score >= 3.5
            if job.score >= 3.5 and job.status == "new":
                job.status = "shortlisted"

            await db.commit()
            await db.refresh(job)

            # Auto-generate resume variant for shortlisted jobs
            if job.score >= 3.5:
                try:
                    await generate_resume_variant(job.id)
                except Exception as re_err:
                    logger.warning(f"Resume generation failed for {job_id}: {re_err}")

            return {
                "id": job.id,
                "score": job.score,
                "grade": job.grade,
                "archetype": job.archetype,
                "match_summary": job.match_summary,
                "status": job.status,
            }

        except json.JSONDecodeError as e:
            logger.error(f"evaluate_job: JSON parse error for job {job_id}: {e}\nRaw: {raw[:500]}")
            return {"error": "json_parse_failed", "job_id": job_id}
        except Exception as e:
            logger.error(f"evaluate_job: unexpected error for job {job_id}: {type(e).__name__}: {e}")
            return {"error": "evaluation_failed", "detail": str(e), "job_id": job_id}
