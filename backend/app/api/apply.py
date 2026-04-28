"""Assisted auto-apply endpoint using Playwright browser automation."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
import logging
import os
import tempfile

from app.core.database import get_db
from app.core.models import Application, Job, ResumeVariant
from app.api.profile import get_or_create_profile

router = APIRouter()
logger = logging.getLogger(__name__)


class AutoApplyRequest(BaseModel):
    application_id: str
    confirm: bool = False  # Safety: must explicitly confirm


@router.post("/prefill")
async def prefill_application(data: AutoApplyRequest, db: AsyncSession = Depends(get_db)):
    """Open the apply URL in a browser, prefill form fields, take screenshot — does NOT submit."""
    if not data.confirm:
        raise HTTPException(status_code=400, detail="Set confirm=true to proceed with browser automation")

    result = await db.execute(select(Application).where(Application.id == data.application_id))
    app_obj = result.scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")

    job_result = await db.execute(select(Job).where(Job.id == app_obj.job_id))
    job = job_result.scalar_one_or_none()
    if not job or not job.apply_url:
        raise HTTPException(status_code=400, detail="No apply URL for this job")

    profile = await get_or_create_profile(db)

    # Build fill data
    fill_data = {
        "name": profile.name,
        "email": profile.email,
        "phone": profile.phone,
        "linkedin": profile.linkedin_url,
        "github": profile.github_url,
        "location": profile.location,
    }

    try:
        from playwright.async_api import async_playwright

        screenshot_path = tempfile.mktemp(suffix=".png")
        notes = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(job.apply_url, wait_until="networkidle", timeout=30000)

            # Try to fill common fields
            field_selectors = {
                "name": ["input[name*='name']", "input[placeholder*='name' i]", "#name"],
                "email": ["input[type='email']", "input[name*='email']", "#email"],
                "phone": ["input[type='tel']", "input[name*='phone']", "#phone"],
                "linkedin": ["input[name*='linkedin']", "input[placeholder*='linkedin' i]"],
                "github": ["input[name*='github']", "input[placeholder*='github' i]"],
            }

            filled = []
            for field, selectors in field_selectors.items():
                value = fill_data.get(field, "")
                if not value:
                    continue
                for sel in selectors:
                    try:
                        el = page.locator(sel).first
                        if await el.count() > 0:
                            await el.fill(value)
                            filled.append(field)
                            break
                    except Exception:
                        continue

            notes.append(f"Prefilled: {', '.join(filled) if filled else 'none'} — Review before submitting")
            await page.screenshot(path=screenshot_path)
            await browser.close()

        # Read screenshot bytes
        with open(screenshot_path, "rb") as f:
            _ = f.read()
        os.unlink(screenshot_path)

        app_obj.auto_fill_attempted = True
        app_obj.auto_fill_success = len(filled) > 0
        app_obj.auto_fill_notes = "\n".join(notes)
        app_obj.last_activity = datetime.utcnow()
        await db.commit()

        return {
            "success": True,
            "fields_filled": filled,
            "apply_url": job.apply_url,
            "notes": notes,
            "message": "Form prefilled. Open the URL in your browser to review and submit.",
        }

    except Exception as e:
        logger.error(f"Auto-fill failed: {e}")
        app_obj.auto_fill_attempted = True
        app_obj.auto_fill_success = False
        app_obj.auto_fill_notes = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Browser automation failed: {str(e)}")
