"""Resume tailoring engine: generate a customized resume variant per job."""
import json
import re
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.models import Job, Profile, ResumeVariant
from app.services.openai_client import generate_flash  # ← switched from gemini

logger = logging.getLogger(__name__)


async def generate_resume_variant(job_id: str) -> dict:
    """Generate a tailored resume variant for a specific job."""
    async with AsyncSessionLocal() as db:
        job_result = await db.execute(select(Job).where(Job.id == job_id))
        job = job_result.scalar_one_or_none()
        if not job:
            logger.error(f"generate_resume_variant: job {job_id} not found")
            return {"error": "job_not_found", "job_id": job_id}

        profile_result = await db.execute(select(Profile).limit(1))
        profile = profile_result.scalar_one_or_none()
        if not profile or not profile.resume_markdown:
            logger.warning(f"generate_resume_variant: no resume in profile — skipping job {job_id}")
            return {"error": "no_resume", "job_id": job_id}

        keywords = ", ".join(job.keywords or [])
        prompt = f"""You are a professional resume writer. Tailor this resume for the specific job posting.

RULES:
- Do NOT invent experience, skills, or achievements. Only reframe existing ones.
- Reorder bullet points to highlight most relevant experience first.
- Inject relevant keywords naturally into existing bullets (do not stuff).
- Adjust the summary/objective section to speak directly to this role.
- Keep all facts, dates, and metrics exactly as they are.
- Output clean Markdown resume format.

=== MASTER RESUME ===
{profile.resume_markdown[:4000]}

=== JOB TARGET ===
Title: {job.title}
Company: {job.company}
Key JD Keywords: {keywords}
Job Description Summary:
{job.description[:2000]}

=== OUTPUT FORMAT ===
Return a JSON object with:
{{
  "tailored_resume": <full tailored resume in markdown>,
  "changes_summary": <brief bullet list of what was changed and why>,
  "keywords_injected": [<list of keywords that were added/highlighted>]
}}

Return only valid JSON. No markdown fences."""

        try:
            raw = await generate_flash(prompt)
            raw = re.sub(r'^```json\s*|^```\s*|\s*```$', '', raw.strip(), flags=re.MULTILINE)
            data = json.loads(raw)

            # Check if variant already exists for this job
            existing = await db.execute(
                select(ResumeVariant).where(ResumeVariant.job_id == job_id)
            )
            variant = existing.scalar_one_or_none()

            if variant:
                variant.content_markdown = data.get("tailored_resume", "")
                variant.changes_summary = data.get("changes_summary", "")
                variant.keywords_injected = data.get("keywords_injected", [])
                variant.generated_at = datetime.utcnow()
            else:
                variant = ResumeVariant(
                    job_id=job_id,
                    job_title=job.title,
                    company=job.company,
                    content_markdown=data.get("tailored_resume", ""),
                    changes_summary=data.get("changes_summary", ""),
                    keywords_injected=data.get("keywords_injected", []),
                )
                db.add(variant)

            await db.commit()
            await db.refresh(variant)

            # Link variant to job
            job_result2 = await db.execute(select(Job).where(Job.id == job_id))
            job2 = job_result2.scalar_one_or_none()
            if job2:
                job2.resume_id = variant.id
                await db.commit()

            return {
                "id": variant.id,
                "job_id": job_id,
                "job_title": variant.job_title,
                "company": variant.company,
                "changes_summary": variant.changes_summary,
                "keywords_injected": variant.keywords_injected,
            }

        except json.JSONDecodeError as e:
            logger.error(f"generate_resume_variant: JSON parse error for job {job_id}: {e}")
            return {"error": "json_parse_failed", "job_id": job_id}
        except Exception as e:
            logger.error(f"generate_resume_variant: unexpected error for job {job_id}: {type(e).__name__}: {e}")
            return {"error": "generation_failed", "detail": str(e), "job_id": job_id}


async def generate_pdf_from_markdown(resume_markdown: str, output_path: str) -> bool:
    """Render a markdown resume to a clean ATS-friendly PDF using Playwright."""
    try:
        from playwright.async_api import async_playwright
        import markdown

        html_content = markdown.markdown(resume_markdown, extensions=["tables", "nl2br"])

        full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
    padding: 40px 50px;
    max-width: 800px;
  }}
  h1 {{ font-size: 20pt; color: #0f172a; margin-bottom: 4px; }}
  h2 {{ font-size: 13pt; color: #1e3a5f; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px; margin: 16px 0 8px; }}
  h3 {{ font-size: 11pt; font-weight: 600; margin: 8px 0 2px; }}
  p {{ margin-bottom: 6px; }}
  ul {{ padding-left: 18px; margin-bottom: 6px; }}
  li {{ margin-bottom: 3px; }}
  a {{ color: #1e3a5f; text-decoration: none; }}
  table {{ width: 100%; border-collapse: collapse; margin: 8px 0; }}
  td, th {{ padding: 4px 8px; text-align: left; }}
  hr {{ border: none; border-top: 1px solid #e2e8f0; margin: 12px 0; }}
</style>
</head>
<body>
{html_content}
</body>
</html>"""

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            await page.set_content(full_html, wait_until="networkidle")
            await page.pdf(
                path=output_path,
                format="A4",
                margin={"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"},
                print_background=True,
            )
            await browser.close()
        return True
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        return False
