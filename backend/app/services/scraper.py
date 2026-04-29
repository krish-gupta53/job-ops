"""Job scraper: fetch job details from URLs and extract structured data."""
import httpx
from bs4 import BeautifulSoup
import logging
import re
from typing import Optional, Dict, Any
from app.services.openai_client import generate_lite

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


async def fetch_html(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=HEADERS) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.text
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    return text.strip()[:8000]  # cap at 8k chars to save tokens


def extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    # Remove boilerplate
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return clean_text(soup.get_text(separator=" "))


async def scrape_job_url(url: str) -> Optional[Dict[str, Any]]:
    """Fetch a job URL and extract structured job data using GPT-4o-mini."""
    html = await fetch_html(url)
    if not html:
        return None

    raw_text = extract_text_from_html(html)
    if len(raw_text) < 100:
        return None

    prompt = f"""Extract the following fields from this job posting text. Return ONLY a JSON object with these exact keys:
- title (string)
- company (string)
- location (string, e.g. "Remote", "San Francisco, CA", "Chennai, India")
- remote (boolean)
- job_type (string: full-time, contract, part-time, freelance)
- description (string, full cleaned job description text)
- salary_min (integer or 0)
- salary_max (integer or 0)
- salary_currency (string, e.g. USD, INR)
- apply_url (string, the direct application URL if different from source)

Job posting text:
{raw_text}

Return only valid JSON, no markdown, no explanation."""

    try:
        result = await generate_lite(prompt)
        # Strip markdown code fences if present
        result = re.sub(r'^```json\s*|^```\s*|\s*```$', '', result.strip(), flags=re.MULTILINE)
        import json
        data = json.loads(result)
        data["apply_url"] = data.get("apply_url") or url
        return data
    except Exception as e:
        logger.error(f"Failed to parse scraped job from {url}: {e}")
        # Return partial data
        return {
            "title": "",
            "company": "",
            "location": "",
            "remote": False,
            "job_type": "full-time",
            "description": raw_text[:3000],
            "salary_min": 0,
            "salary_max": 0,
            "salary_currency": "USD",
            "apply_url": url,
        }


async def scan_greenhouse_company(company_id: str) -> list:
    """Scan a Greenhouse company board for job listings."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{company_id}/jobs?content=true"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            jobs = []
            for j in data.get("jobs", []):
                jobs.append({
                    "title": j.get("title", ""),
                    "company": company_id,
                    "location": j.get("location", {}).get("name", ""),
                    "remote": "remote" in j.get("location", {}).get("name", "").lower(),
                    "job_type": "full-time",
                    "description": BeautifulSoup(j.get("content", ""), "lxml").get_text(" ")[:5000],
                    "source_url": j.get("absolute_url", ""),
                    "apply_url": j.get("absolute_url", ""),
                    "salary_min": 0,
                    "salary_max": 0,
                    "salary_currency": "USD",
                })
            return jobs
    except Exception as e:
        logger.warning(f"Greenhouse scan failed for {company_id}: {e}")
        return []


async def scan_lever_company(company_id: str) -> list:
    """Scan a Lever company board for job listings."""
    url = f"https://api.lever.co/v0/postings/{company_id}?mode=json"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            r.raise_for_status()
            postings = r.json()
            jobs = []
            for p in postings:
                text_content = " ".join(
                    [block.get("content", "") for block in p.get("descriptionBody", {}).get("content", [])]
                )[:5000]
                jobs.append({
                    "title": p.get("text", ""),
                    "company": company_id,
                    "location": p.get("categories", {}).get("location", ""),
                    "remote": "remote" in p.get("categories", {}).get("location", "").lower(),
                    "job_type": p.get("categories", {}).get("commitment", "full-time").lower(),
                    "description": p.get("description", "")[:5000] or text_content,
                    "source_url": p.get("hostedUrl", ""),
                    "apply_url": p.get("applyUrl", "") or p.get("hostedUrl", ""),
                    "salary_min": 0,
                    "salary_max": 0,
                    "salary_currency": "USD",
                })
            return jobs
    except Exception as e:
        logger.warning(f"Lever scan failed for {company_id}: {e}")
        return []


async def scan_ashby_company(company_id: str) -> list:
    """Scan an Ashby company board for job listings."""
    url = f"https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams"
    payload = {"operationName": "ApiJobBoardWithTeams", "variables": {"organizationHostedJobsPageName": company_id}, "query": "query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title locationName isRemote employmentType descriptionHtml jobPostingUrl } } }"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            postings = data.get("data", {}).get("jobBoard", {}).get("jobPostings", [])
            jobs = []
            for p in postings:
                jobs.append({
                    "title": p.get("title", ""),
                    "company": company_id,
                    "location": p.get("locationName", ""),
                    "remote": p.get("isRemote", False),
                    "job_type": (p.get("employmentType") or "full-time").lower(),
                    "description": BeautifulSoup(p.get("descriptionHtml", ""), "lxml").get_text(" ")[:5000],
                    "source_url": p.get("jobPostingUrl", ""),
                    "apply_url": p.get("jobPostingUrl", ""),
                    "salary_min": 0,
                    "salary_max": 0,
                    "salary_currency": "USD",
                })
            return jobs
    except Exception as e:
        logger.warning(f"Ashby scan failed for {company_id}: {e}")
        return []
