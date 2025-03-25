"""
Database module for the Experiment Hub application.

This module defines database models, connection setup, and utility functions
for database operations.
"""
import os
from datetime import datetime
from typing import Generator

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./experiment_db.sqlite")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Database dependency
def get_db() -> Generator:
    """
    Dependency for database session management.

    Yields:
        db: Database session that will be automatically closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Database models
class Experiment(Base):  # type: ignore
    """
    Experiment model to store experiment metadata and related jobs.

    An experiment can contain multiple jobs and serves as the main
    organizational unit for the application.
    """

    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jobs = relationship(
        "Job",
        back_populates="experiment",
        cascade="all, delete-orphan",
    )


class Job(Base):  # type: ignore
    """
    Job model representing an individual machine learning job.

    Jobs contain parameters, results, and timing information related to
    a specific machine learning experiment run.
    """

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    name = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    model_type = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False)

    # Results
    best_accuracy = Column(Float, nullable=True)
    total_time = Column(Float, nullable=True)
    epochs_completed = Column(Integer, default=0)
    history = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    experiment = relationship("Experiment", back_populates="jobs")


# Create tables
def init_db() -> None:
    """
    Initialize database tables.

    Creates all tables defined by the Base metadata if they don't exist yet.
    """
    Base.metadata.create_all(bind=engine)
