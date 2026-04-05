# Contributing to ExperimentHub

Thank you for your interest in contributing! This guide will get you from zero to
your first pull request.

## Quick Start

```bash
git clone https://github.com/sloweyyy/ExperimentHub.git
cd ExperimentHub
cp .env.example .env
make dev
```

The backend runs at `http://localhost:8000` and the frontend at `http://localhost:3000`.

**Requirements:** Python 3.10+, Node.js 20+.

## Architecture Overview

```
ExperimentHub/
├── backend/                 # FastAPI + PyTorch
│   ├── app/
│   │   ├── main.py          # App setup, CORS, startup hooks
│   │   ├── database.py      # SQLAlchemy models and DB connection
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   └── routers/         # Route handlers
│   │       ├── experiments.py
│   │       ├── jobs.py
│   │       └── websocket.py
│   ├── models/
│   │   ├── mnist_model.py   # PyTorch model architectures + factory
│   │   └── trainer.py       # Training loop and validation
│   ├── alembic/             # Database migrations
│   └── tests/               # pytest test suite
│
├── experimenthub/           # Next.js 15 frontend
│   ├── app/                 # Pages (App Router)
│   ├── components/          # React components
│   ├── lib/                 # API client, Zustand store
│   ├── types/               # Shared TypeScript type definitions
│   └── __tests__/           # Jest test suite
│
├── docker-compose.yml       # Full-stack Docker deployment
├── Makefile                 # Unified dev commands
└── .github/workflows/       # CI/CD pipelines
```

## Development Workflow

1. Fork the repo and create a branch: `git checkout -b my-feature`
2. Make your changes
3. Run checks: `make lint && make test`
4. Commit with a descriptive message
5. Open a pull request against `main`

## Code Style

**Backend (Python):**
- Formatter: Black (88 char line length)
- Import sorting: isort (black profile)
- Linting: Flake8
- Type checking: mypy (strict mode)
- Run all: `make lint-backend`

**Frontend (TypeScript):**
- Linting: ESLint (Next.js config)
- Formatting: Prettier
- Run all: `make lint-frontend`

## Testing

```bash
make test              # Run all tests
make test-backend      # Backend only
make test-frontend     # Frontend only
```

Backend tests use pytest with an in-memory SQLite database. Frontend tests use Jest
with React Testing Library.

When adding a feature, add tests alongside the code. Test names should describe the
behavior being tested, not the implementation: `test_cancel_running_job_returns_cancelled_status`
not `test_cancel_endpoint`.

## Database Migrations

We use Alembic for schema changes. SQLite is used for local dev, PostgreSQL for Docker.

```bash
make migrate                          # Apply pending migrations
make migrate-create MSG="add column"  # Generate a new migration
```

**SQLite limitation:** SQLite does not support `ALTER TABLE DROP COLUMN` and some other
DDL operations. Alembic is configured with `render_as_batch=True` to handle this, but
always test migrations against both SQLite and PostgreSQL before submitting.

## How to Add a New Model Architecture

This is the most common contribution. The `create_model()` factory in
`backend/models/mnist_model.py` makes it straightforward.

### Step 1: Create the model class

Add your model to `backend/models/mnist_model.py`:

```python
class MyModel(nn.Module):
    def __init__(self, hidden_size=128, dropout_rate=0.3):
        super().__init__()
        # Your architecture here. Input: MNIST (1, 28, 28). Output: 10 classes.
        ...

    def forward(self, x):
        # Input shape: [batch_size, 1, 28, 28]
        ...
        return F.log_softmax(x, dim=1)
```

### Step 2: Register in the factory

Add a branch to `create_model()`:

```python
elif model_type.lower() == "mymodel":
    valid_params = ["hidden_size", "dropout_rate"]
    filtered_kwargs = {k: v for k, v in kwargs.items() if k in valid_params}
    return MyModel(**filtered_kwargs)
```

### Step 3: Add duplicate detection

In `backend/app/routers/jobs.py`, add a branch to the duplicate detection logic:

```python
elif job.model_type == "mymodel":
    specific_params_match = (
        ej_params.get("hidden_size") == job_params.get("hidden_size")
        and ej_params.get("dropout_rate") == job_params.get("dropout_rate")
    )
```

### Step 4: Add tests

In `backend/tests/test_models.py`:

```python
def test_create_mymodel():
    model = create_model("mymodel", hidden_size=64, dropout_rate=0.2)
    x = torch.randn(1, 1, 28, 28)
    output = model(x)
    assert output.shape == (1, 10)
```

### Step 5: Update the frontend

Add your model type to `experimenthub/types/index.ts`:

```typescript
export type ModelType = "mlp" | "cnn" | "rnn" | "mymodel";
```

Update the job form in `experimenthub/components/jobs/job-form.tsx` to show your
model's configurable parameters.

### Step 6: Open your PR

That's it. The CI will run tests automatically. A maintainer will review your PR.

## How to Add a New API Endpoint

### Step 1: Add the schema

Define request/response models in `backend/app/schemas.py` using Pydantic:

```python
class MyRequest(BaseModel):
    field: str = Field(..., description="What this field does")
```

### Step 2: Add the route

Create or edit a router in `backend/app/routers/`. Use FastAPI's dependency injection:

```python
@router.post("/my-endpoint/", response_model=MyResponse)
def my_endpoint(request: MyRequest, db: Session = Depends(get_db)):
    ...
```

### Step 3: Add tests

In the appropriate test file under `backend/tests/`:

```python
def test_my_endpoint_success(client):
    response = client.post("/my-endpoint/", json={"field": "value"})
    assert response.status_code == 200
```

### Step 4: Update the frontend API client

Add the new endpoint to `experimenthub/lib/api.ts`.

## Known Limitations

- **Training jobs are in-process.** If the server restarts, running jobs are lost
  (marked as failed on next startup). A task queue is planned for Phase 2.
- **Single-machine only.** No distributed training support yet.
- **MNIST only.** The data loading pipeline is hardcoded for MNIST. Dataset
  extensibility is a future goal.

## Questions?

Open a [Discussion](https://github.com/sloweyyy/ExperimentHub/discussions) or
file an issue. We're happy to help!
