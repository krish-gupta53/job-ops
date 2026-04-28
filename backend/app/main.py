from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db
from app.api import profile, jobs, resumes, applications, scanner, apply
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Job-Ops backend...")
    await init_db()
    await start_scheduler()
    yield
    # Shutdown
    await stop_scheduler()
    logger.info("Job-Ops backend stopped.")


app = FastAPI(
    title="Job-Ops API",
    description="AI-powered job search automation platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(resumes.router, prefix="/api/resumes", tags=["Resumes"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(scanner.router, prefix="/api/scanner", tags=["Scanner"])
app.include_router(apply.router, prefix="/api/apply", tags=["Apply"])


@app.get("/")
async def root():
    return {"status": "ok", "service": "job-ops-api", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
