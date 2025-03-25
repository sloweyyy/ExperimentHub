from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import json
import os

DATABASE_PATH = os.getenv("DATABASE_PATH", "experiment_db.sqlite")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class Experiment(Base):
    __tablename__ = "experiments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    jobs = relationship("Job", back_populates="experiment", cascade="all, delete-orphan")
    
class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    name = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    model_type = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False)
    
    best_accuracy = Column(Float, nullable=True)
    total_time = Column(Float, nullable=True)
    epochs_completed = Column(Integer, default=0)
    history = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    experiment = relationship("Experiment", back_populates="jobs")

def init_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    Base.metadata.create_all(bind=engine) 