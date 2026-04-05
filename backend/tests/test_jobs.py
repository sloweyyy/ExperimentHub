"""Tests for job CRUD endpoints."""

import pytest


def _create_experiment(client, name="Test Experiment"):
    """Helper: create an experiment and return its id."""
    resp = client.post("/experiments/", json={"name": name})
    assert resp.status_code == 200
    return resp.json()["id"]


def _minimal_job_payload(experiment_id, name="Test Job", model_type="cnn"):
    """Helper: build a minimal valid JobCreate payload."""
    return {
        "name": name,
        "model_type": model_type,
        "experiment_id": experiment_id,
        "parameters": {
            "model_type": model_type,
            "epochs": 1,
            "batch_size": 64,
            "learning_rate": 0.01,
            "optimizer": "sgd",
        },
    }


class TestCreateJob:
    def test_create_job(self, client):
        """POST /jobs/ with a valid experiment creates a pending job."""
        exp_id = _create_experiment(client)
        payload = _minimal_job_payload(exp_id)

        response = client.post("/jobs/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert data["experiment_id"] == exp_id
        assert data["model_type"] == "cnn"
        assert data["name"] == "Test Job"
        assert "job_id" in data

    def test_create_job_experiment_not_found(self, client):
        """POST /jobs/ with a non-existent experiment_id returns 404."""
        payload = _minimal_job_payload(experiment_id=9999)

        response = client.post("/jobs/", json=payload)
        assert response.status_code == 404
        assert response.json()["detail"] == "Experiment not found"


class TestListJobs:
    def test_list_jobs(self, client):
        """GET /jobs/ returns created jobs."""
        exp_id = _create_experiment(client)
        client.post("/jobs/", json=_minimal_job_payload(exp_id, name="Job A", model_type="cnn"))
        client.post("/jobs/", json=_minimal_job_payload(exp_id, name="Job B", model_type="mlp"))

        response = client.get("/jobs/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_list_jobs_filter_by_experiment(self, client):
        """GET /jobs/?experiment_id=X returns only jobs for that experiment."""
        exp1 = _create_experiment(client, name="Exp 1")
        exp2 = _create_experiment(client, name="Exp 2")

        client.post("/jobs/", json=_minimal_job_payload(exp1, name="Job for Exp1"))
        client.post("/jobs/", json=_minimal_job_payload(exp2, name="Job for Exp2"))

        response = client.get(f"/jobs/?experiment_id={exp1}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["experiment_id"] == exp1


class TestGetJob:
    def test_get_job_not_found(self, client):
        """GET /jobs/nonexistent returns 404."""
        response = client.get("/jobs/nonexistent-uuid")
        assert response.status_code == 404
        assert response.json()["detail"] == "Job not found"


class TestCancelJob:
    def test_cancel_running_job_returns_cancelled(self, client, db_session):
        """POST /jobs/{id}/cancel on a running job sets status to cancelled."""
        from app.database import Job

        exp_id = _create_experiment(client)
        create_resp = client.post("/jobs/", json=_minimal_job_payload(exp_id))
        job_id = create_resp.json()["job_id"]

        # Manually set the job to "running" so we can cancel it
        job = db_session.query(Job).filter(Job.job_id == job_id).first()
        job.status = "running"
        db_session.commit()

        response = client.post(f"/jobs/{job_id}/cancel")
        assert response.status_code == 200
        assert response.json()["message"] == "Job cancelled successfully"
        assert response.json()["job_id"] == job_id

        # Verify the job status in the database
        db_session.refresh(job)
        assert job.status == "cancelled"

    def test_cancel_pending_job_succeeds(self, client):
        """POST /jobs/{id}/cancel on a pending job sets status to cancelled."""
        exp_id = _create_experiment(client)
        create_resp = client.post("/jobs/", json=_minimal_job_payload(exp_id))
        job_id = create_resp.json()["job_id"]

        response = client.post(f"/jobs/{job_id}/cancel")
        assert response.status_code == 200
        assert response.json()["message"] == "Job cancelled successfully"

    def test_cancel_completed_job_fails(self, client, db_session):
        """POST /jobs/{id}/cancel on a completed job returns 400."""
        from app.database import Job

        exp_id = _create_experiment(client)
        create_resp = client.post("/jobs/", json=_minimal_job_payload(exp_id))
        job_id = create_resp.json()["job_id"]

        # Manually set the job to "completed"
        job = db_session.query(Job).filter(Job.job_id == job_id).first()
        job.status = "completed"
        db_session.commit()

        response = client.post(f"/jobs/{job_id}/cancel")
        assert response.status_code == 400
        assert response.json()["detail"] == "Job cannot be cancelled"

    def test_cancel_nonexistent_job_returns_404(self, client):
        """POST /jobs/nonexistent/cancel returns 404."""
        response = client.post("/jobs/nonexistent-uuid/cancel")
        assert response.status_code == 404
        assert response.json()["detail"] == "Job not found"


class TestDeleteJob:
    def test_delete_job(self, client):
        """DELETE /jobs/{id} removes the job."""
        exp_id = _create_experiment(client)
        create_resp = client.post("/jobs/", json=_minimal_job_payload(exp_id))
        job_id = create_resp.json()["job_id"]

        delete_resp = client.delete(f"/jobs/{job_id}")
        assert delete_resp.status_code == 200
        assert delete_resp.json()["message"] == "Job deleted successfully"
        assert delete_resp.json()["job_id"] == job_id

        # Confirm it is gone
        get_resp = client.get(f"/jobs/{job_id}")
        assert get_resp.status_code == 404

    def test_delete_job_not_found(self, client):
        """DELETE /jobs/nonexistent returns 404."""
        response = client.delete("/jobs/nonexistent-uuid")
        assert response.status_code == 404
        assert response.json()["detail"] == "Job not found"
