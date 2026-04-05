"""Tests for database model relationships and startup cleanup logic."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, Experiment, Job


@pytest.fixture
def engine():
    """Create a fresh in-memory SQLite engine for each test."""
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)


@pytest.fixture
def session(engine):
    """Provide a transactional database session for each test."""
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    sess = Session()
    try:
        yield sess
    finally:
        sess.close()


class TestExperimentJobRelationship:
    def test_experiment_job_relationship(self, session):
        """Creating jobs linked to an experiment populates the relationship."""
        experiment = Experiment(name="Relationship Test", description="Testing FK")
        session.add(experiment)
        session.commit()
        session.refresh(experiment)

        job1 = Job(
            job_id="rel-job-1",
            name="Job 1",
            experiment_id=experiment.id,
            model_type="cnn",
            parameters={"epochs": 1},
            status="pending",
        )
        job2 = Job(
            job_id="rel-job-2",
            name="Job 2",
            experiment_id=experiment.id,
            model_type="mlp",
            parameters={"epochs": 2},
            status="pending",
        )
        session.add_all([job1, job2])
        session.commit()
        session.refresh(experiment)

        assert len(experiment.jobs) == 2
        job_ids = {j.job_id for j in experiment.jobs}
        assert job_ids == {"rel-job-1", "rel-job-2"}

        # Verify the back-reference from Job to Experiment
        assert job1.experiment.id == experiment.id

    def test_cascade_delete(self, session):
        """Deleting an experiment cascades to its child jobs."""
        experiment = Experiment(name="Cascade Test")
        session.add(experiment)
        session.commit()
        session.refresh(experiment)

        job = Job(
            job_id="cascade-job-1",
            name="Will be deleted",
            experiment_id=experiment.id,
            model_type="cnn",
            parameters={"epochs": 1},
            status="pending",
        )
        session.add(job)
        session.commit()

        # Confirm the job exists
        assert session.query(Job).filter(Job.job_id == "cascade-job-1").first() is not None

        # Delete the parent experiment
        session.delete(experiment)
        session.commit()

        # Verify the job was cascade-deleted
        assert session.query(Job).filter(Job.job_id == "cascade-job-1").first() is None


class TestGhostJobCleanup:
    def test_ghost_job_cleanup(self, session):
        """Ghost jobs (status='running' at startup) are marked as 'failed'.

        This replicates the cleanup logic from ``app.main.startup_event``.
        """
        experiment = Experiment(name="Ghost Test")
        session.add(experiment)
        session.commit()
        session.refresh(experiment)

        running_job = Job(
            job_id="ghost-job-1",
            name="Ghost runner",
            experiment_id=experiment.id,
            model_type="cnn",
            parameters={"epochs": 5},
            status="running",
        )
        pending_job = Job(
            job_id="ghost-job-2",
            name="Pending stays pending",
            experiment_id=experiment.id,
            model_type="mlp",
            parameters={"epochs": 3},
            status="pending",
        )
        completed_job = Job(
            job_id="ghost-job-3",
            name="Completed stays completed",
            experiment_id=experiment.id,
            model_type="rnn",
            parameters={"epochs": 10},
            status="completed",
        )
        session.add_all([running_job, pending_job, completed_job])
        session.commit()

        # Replicate the startup ghost-job cleanup logic
        ghost_jobs = session.query(Job).filter(Job.status == "running").all()
        for job in ghost_jobs:
            job.status = "failed"
        session.commit()

        # Verify: the running job should now be failed
        session.refresh(running_job)
        assert running_job.status == "failed"

        # Other statuses should be untouched
        session.refresh(pending_job)
        assert pending_job.status == "pending"

        session.refresh(completed_job)
        assert completed_job.status == "completed"
