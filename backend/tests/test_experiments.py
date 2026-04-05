"""Tests for experiment CRUD endpoints."""


class TestCreateExperiment:
    def test_create_experiment(self, client):
        """POST /experiments/ with name and description creates an experiment."""
        response = client.post(
            "/experiments/",
            json={"name": "MNIST Baseline", "description": "A baseline CNN experiment"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "MNIST Baseline"
        assert data["description"] == "A baseline CNN experiment"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_experiment_minimal(self, client):
        """POST /experiments/ with only a name (no description) succeeds."""
        response = client.post(
            "/experiments/",
            json={"name": "Minimal Experiment"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Experiment"
        assert data["description"] is None


class TestListExperiments:
    def test_list_experiments(self, client):
        """GET /experiments/ returns all created experiments."""
        # Create two experiments
        client.post("/experiments/", json={"name": "Exp 1"})
        client.post("/experiments/", json={"name": "Exp 2"})

        response = client.get("/experiments/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        names = {exp["name"] for exp in data}
        assert names == {"Exp 1", "Exp 2"}

    def test_list_experiments_empty(self, client):
        """GET /experiments/ returns an empty list when none exist."""
        response = client.get("/experiments/")
        assert response.status_code == 200
        assert response.json() == []


class TestGetExperiment:
    def test_get_experiment(self, client):
        """GET /experiments/{id} returns the correct experiment."""
        create_resp = client.post(
            "/experiments/",
            json={"name": "Target Experiment", "description": "Find me"},
        )
        exp_id = create_resp.json()["id"]

        response = client.get(f"/experiments/{exp_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == exp_id
        assert data["name"] == "Target Experiment"
        assert data["description"] == "Find me"

    def test_get_experiment_not_found(self, client):
        """GET /experiments/999 returns 404."""
        response = client.get("/experiments/999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Experiment not found"


class TestDeleteExperiment:
    def test_delete_experiment(self, client):
        """DELETE /experiments/{id} removes the experiment."""
        create_resp = client.post("/experiments/", json={"name": "To Delete"})
        exp_id = create_resp.json()["id"]

        delete_resp = client.delete(f"/experiments/{exp_id}")
        assert delete_resp.status_code == 200
        assert delete_resp.json()["message"] == "Experiment deleted successfully"

        # Confirm it is gone
        get_resp = client.get(f"/experiments/{exp_id}")
        assert get_resp.status_code == 404

    def test_delete_experiment_not_found(self, client):
        """DELETE /experiments/999 returns 404."""
        response = client.delete("/experiments/999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Experiment not found"
