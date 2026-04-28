from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.models import Profile

router = APIRouter()
logger = logging.getLogger(__name__)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    target_roles: Optional[List[str]] = None
    target_domains: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    work_style: Optional[List[str]] = None
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    salary_currency: Optional[str] = None
    experience_years: Optional[float] = None
    open_to_relocation: Optional[bool] = None
    notice_period_days: Optional[int] = None
    resume_markdown: Optional[str] = None
    skills: Optional[List[str]] = None
    certifications: Optional[List] = None
    education: Optional[List] = None
    experience: Optional[List] = None
    projects: Optional[List] = None
    summary: Optional[str] = None
    career_story: Optional[str] = None
    proof_points: Optional[str] = None
    avoid_preferences: Optional[str] = None


async def get_or_create_profile(db: AsyncSession) -> Profile:
    result = await db.execute(select(Profile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = Profile()
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


@router.get("")
async def get_profile(db: AsyncSession = Depends(get_db)):
    profile = await get_or_create_profile(db)
    return profile


@router.put("")
async def update_profile(data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    profile = await get_or_create_profile(db)
    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
    profile.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload resume file (PDF or DOCX) and extract text content."""
    content = await file.read()
    text = ""

    if file.filename.endswith(".pdf"):
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        for page in reader.pages:
            text += page.extract_text() + "\n"
    elif file.filename.endswith(".docx"):
        import io
        import docx2txt
        text = docx2txt.process(io.BytesIO(content))
    elif file.filename.endswith(".md") or file.filename.endswith(".txt"):
        text = content.decode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="Supported formats: PDF, DOCX, MD, TXT")

    profile = await get_or_create_profile(db)
    profile.resume_markdown = text
    profile.updated_at = datetime.utcnow()
    await db.commit()

    return {"success": True, "characters": len(text), "preview": text[:500]}
