"""
ExperimentHub API -- ML experiment tracking platform.

This is the main FastAPI application module. Route handlers live in
``app.routers``; this file wires them together, configures middleware,
and runs startup/shutdown hooks.
"""

import asyncio
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Job, SessionLocal, init_db
from app.routers import experiments, jobs, websocket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ExperimentHub API",
    description="ML experiment tracking platform",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(experiments.router, tags=["experiments"])
app.include_router(jobs.router, tags=["jobs"])
app.include_router(websocket.router, tags=["websocket"])


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    init_db()

    # Store the running event loop so background threads can schedule coroutines.
    jobs.set_main_loop(asyncio.get_running_loop())

    # Clean up ghost jobs (jobs that were still "running" when the server last
    # shut down -- they will never complete, so mark them as failed).
    try:
        db = SessionLocal()
        ghost_jobs = db.query(Job).filter(Job.status == "running").all()
        for job in ghost_jobs:
            job.status = "failed"
            logger.warning("Marked ghost job %s as failed", job.job_id)
        db.commit()
        db.close()
    except Exception as e:
        logger.error("Failed to clean up ghost jobs: %s", e)


# ---------------------------------------------------------------------------
# Root / health
# ---------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {"message": "Welcome to ExperimentHub API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
