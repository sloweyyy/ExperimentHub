"""
Router for job endpoints.

Handles CRUD operations for training jobs, background training execution,
and real-time status updates via the WebSocket router.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import Experiment, Job, get_db
from app.routers.websocket import send_ws_update
from app.schemas import JobCreate, JobResponse, JobWithHistory
from models.mnist_model import create_model
from models.trainer import train_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="")

# Reference to the main asyncio event loop, set during app startup.
_main_loop: Optional[asyncio.AbstractEventLoop] = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Store the main event loop so background threads can schedule coroutines."""
    global _main_loop
    _main_loop = loop


# -- Status callback ---------------------------------------------------------


async def training_status_callback(status_data: dict):
    """Process a training status update: persist to DB and broadcast via WS."""
    job_id = status_data.get("job_id")

    db = next(get_db())
    try:
        job = db.query(Job).filter(Job.job_id == job_id).first()
        if not job:
            return

        if "epoch" in status_data:
            job.epochs_completed = status_data["epoch"]

        if status_data.get("status") == "completed" and "final_results" in status_data:
            results = status_data["final_results"]
            job.status = "completed"
            job.completed_at = datetime.utcnow()
            job.best_accuracy = results.get("best_accuracy")
            job.total_time = results.get("total_time")
            job.history = results.get("history")
        elif status_data.get("status") == "failed":
            job.status = "failed"
            job.completed_at = datetime.utcnow()

        db.commit()
    finally:
        db.close()

    await send_ws_update(job_id, status_data)


# -- Background training runner ----------------------------------------------


def run_training_job(job_id: str, model_type: str, parameters: dict):
    """Execute a training job in a background thread.

    Uses ``asyncio.run_coroutine_threadsafe`` to schedule async status
    callbacks on the main event loop instead of creating a throwaway loop.
    """

    # Mark job as running
    db = next(get_db())
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if job:
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()
    db.close()

    try:
        # Build model
        model_params = {
            k: v
            for k, v in parameters.items()
            if k in ["dropout_rate", "hidden_size", "kernel_size", "num_layers"]
        }
        model = create_model(model_type, **model_params)

        # Training-only params
        training_params = {
            k: v
            for k, v in parameters.items()
            if k not in ["dropout_rate", "hidden_size", "kernel_size", "num_layers"]
        }

        def status_callback(status_data: dict):
            if _main_loop is not None and _main_loop.is_running():
                future = asyncio.run_coroutine_threadsafe(
                    training_status_callback(status_data), _main_loop
                )
                future.result(timeout=30)
            else:
                logger.warning(
                    "Main event loop not available; dropping status update for job %s",
                    job_id,
                )

        train_model(model, job_id, training_params, status_callback)

    except Exception as e:
        logger.error("Training job %s failed: %s", job_id, e)
        error_info = {
            "job_id": job_id,
            "status": "failed",
            "error": str(e),
        }
        if _main_loop is not None and _main_loop.is_running():
            future = asyncio.run_coroutine_threadsafe(
                training_status_callback(error_info), _main_loop
            )
            try:
                future.result(timeout=30)
            except Exception:
                logger.error("Failed to send error status for job %s", job_id)


# -- Endpoints ---------------------------------------------------------------


@router.post("/jobs/", response_model=JobResponse)
def create_job(
    job: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Verify experiment exists
    experiment = db.query(Experiment).filter(Experiment.id == job.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Check for duplicate jobs
    existing_jobs = (
        db.query(Job)
        .filter(
            Job.experiment_id == job.experiment_id,
            Job.model_type == job.model_type,
        )
        .all()
    )

    logger.debug(
        "Creating job: %s, Model: %s, Params: %s",
        job.name,
        job.model_type,
        job.parameters,
    )
    logger.debug(
        "Found %d existing jobs with same experiment and model type",
        len(existing_jobs),
    )

    job_params = job.parameters.model_dump()

    for ej in existing_jobs:
        ej_params = ej.parameters

        logger.debug("Comparing with job: %s, ID: %s", ej.name, ej.job_id)
        logger.debug("Existing params: %s", ej_params)
        logger.debug("New params: %s", job_params)

        # Compare core parameters
        core_match = (
            ej_params.get("optimizer") == job_params.get("optimizer")
            and ej_params.get("learning_rate") == job_params.get("learning_rate")
            and ej_params.get("batch_size") == job_params.get("batch_size")
            and ej_params.get("epochs") == job_params.get("epochs")
        )

        logger.debug("Core parameters match: %s", core_match)

        # Check model-specific parameters
        specific_params_match = False
        if job.model_type == "mlp":
            specific_params_match = (
                ej_params.get("hidden_size") == job_params.get("hidden_size")
                and ej_params.get("dropout_rate") == job_params.get("dropout_rate")
                and ej_params.get("num_layers") == job_params.get("num_layers")
            )
            logger.debug(
                "MLP specific - hidden: %s vs %s, dropout: %s vs %s, layers: %s vs %s",
                ej_params.get("hidden_size"),
                job_params.get("hidden_size"),
                ej_params.get("dropout_rate"),
                job_params.get("dropout_rate"),
                ej_params.get("num_layers"),
                job_params.get("num_layers"),
            )
        elif job.model_type == "cnn":
            specific_params_match = (
                ej_params.get("kernel_size") == job_params.get("kernel_size")
                and ej_params.get("hidden_size") == job_params.get("hidden_size")
                and ej_params.get("dropout_rate") == job_params.get("dropout_rate")
            )
            logger.debug(
                "CNN specific - kernel: %s vs %s, hidden: %s vs %s, dropout: %s vs %s",
                ej_params.get("kernel_size"),
                job_params.get("kernel_size"),
                ej_params.get("hidden_size"),
                job_params.get("hidden_size"),
                ej_params.get("dropout_rate"),
                job_params.get("dropout_rate"),
            )
        elif job.model_type == "rnn":
            specific_params_match = (
                ej_params.get("hidden_size") == job_params.get("hidden_size")
                and ej_params.get("dropout_rate") == job_params.get("dropout_rate")
                and ej_params.get("num_layers") == job_params.get("num_layers")
            )
            logger.debug(
                "RNN specific - hidden: %s vs %s, dropout: %s vs %s, layers: %s vs %s",
                ej_params.get("hidden_size"),
                job_params.get("hidden_size"),
                ej_params.get("dropout_rate"),
                job_params.get("dropout_rate"),
                ej_params.get("num_layers"),
                job_params.get("num_layers"),
            )

        logger.debug("Specific parameters match: %s", specific_params_match)

        if core_match and specific_params_match:
            logger.debug("DUPLICATE FOUND - returning existing job %s", ej.job_id)
            return ej

    logger.debug("No duplicate found - creating new job")

    job_id = str(uuid.uuid4())
    db_job = Job(
        job_id=job_id,
        name=job.name,
        experiment_id=job.experiment_id,
        model_type=job.model_type,
        parameters=job.parameters.model_dump(),
        status="pending",
    )

    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    background_tasks.add_task(
        run_training_job,
        job_id=job_id,
        model_type=job.model_type,
        parameters=job.parameters.model_dump(),
    )

    return db_job


@router.get("/jobs/", response_model=list[JobResponse])
def read_jobs(
    experiment_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Job)
    if experiment_id:
        query = query.filter(Job.experiment_id == experiment_id)

    jobs = query.offset(skip).limit(limit).all()
    return jobs


@router.get("/jobs/{job_id}", response_model=JobWithHistory)
def read_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/jobs/{job_id}", response_model=dict)
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully", "job_id": job_id}


@router.post("/jobs/{job_id}/cancel", response_model=dict)
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in ["pending", "running"]:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled")

    job.status = "cancelled"
    job.completed_at = datetime.utcnow()
    db.commit()

    return {"message": "Job cancelled successfully", "job_id": job_id}
