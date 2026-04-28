"""AI evaluation engine: score + grade + report for each job using Gemini Flash."""
import json
import re
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.models import Job, Profile
from app.services.gemini_client import generate_flash
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


async def evaluate_job(job_id: str) -> dict:
    """Run full AI evaluation on a job. Returns updated job dict."""
    async with AsyncSessionLocal() as db:
        job_result = await db.execute(select(Job).where(Job.id == job_id))
        job = job_result.scalar_one_or_none()
        if not job:
            logger.error(f"Job {job_id} not found for evaluation")
            return {}

        profile_result = await db.execute(select(Profile).limit(1))
        profile = profile_result.scalar_one_or_none()
        if not profile or not profile.resume_markdown:
            logger.warning("No profile/resume found - skipping AI evaluation")
            return {}

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
  "strengths": [<list of 3-5 specific strengths from candidate's background that match this role>],
  "gaps": [<list of 2-4 areas where candidate falls short or risks>],
  "keywords": [<list of 10-15 important keywords from the JD for ATS optimization>],
  "positioning_strategy": <2-3 sentences on how candidate should position themselves>,
  "comp_assessment": <1-2 sentences on salary competitiveness>,
  "interview_prep": <2-3 bullet points of key topics to prepare>,
  "recommendation": <string: one of [Strongly Apply, Apply, Consider, Skip, Hard Pass]>,
  "full_report": <full markdown evaluation report with all sections>
}}

Return only valid JSON. No markdown fences."""

        try:
            raw = await generate_flash(prompt)
            raw = re.sub(r'^```json\s*|^```\s*|\s*```$', '', raw.strip(), flags=re.MULTILINE)
            data = json.loads(raw)

            job.score = float(data.get("score", 0.0))
            job.grade = score_to_grade(job.score)
            job.archetype = data.get("archetype", "")
            job.match_summary = data.get("match_summary", "")
            job.strengths = data.get("strengths", [])
            job.gaps = data.get("gaps", [])
            job.keywords = data.get("keywords", [])
            job.evaluation_report = data.get("full_report", "")
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

        except Exception as e:
            logger.error(f"Evaluation failed for job {job_id}: {e}")
            return {}
