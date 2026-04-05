# Changelog

All notable changes to ExperimentHub are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Makefile with unified dev commands (`make dev`, `make test`, `make lint`)
- `.env.example` with documented environment variables
- Alembic database migrations with SQLite batch mode support
- GitHub Actions CI pipeline (lint, type check, test, Docker build)
- GitHub Actions Docker image publishing to GHCR
- CONTRIBUTING.md with step-by-step guides for adding models and endpoints
- CODE_OF_CONDUCT.md (Contributor Covenant)
- Issue templates (bug report, feature request, new model architecture)
- PR template with review checklist
- `GET /health` endpoint
- `PUT /experiments/{id}` endpoint for updating experiments
- `cancelled` job status (distinct from `failed`)
- Ghost job cleanup on server startup
- Backend router modules (`routers/experiments.py`, `routers/jobs.py`, `routers/websocket.py`)
- Thread-safe WebSocket connection management
- Backend and frontend test suites
- Zustand persist migration strategy

### Changed
- Extracted monolithic `main.py` into modular router files
- Updated SQLAlchemy to modern `DeclarativeBase` pattern
- Replaced `allow_origins=["*"]` with configurable CORS via `CORS_ORIGINS` env var
- Replaced debug `print()` statements with proper `logging` module
- Fixed async/sync bridge to use `run_coroutine_threadsafe()` instead of per-thread event loops
- Fixed Docker Compose to reference correct Dockerfile paths
- Fixed `Dockerfile.frontend` to reference `next.config.ts` (was `.mjs`)
- Fixed RNN duplicate detection (was missing from job creation)
- Aligned Python version to 3.10 across all configs
- Deduplicated TypeScript types into `types/index.ts`
- Removed unused Storybook dependencies
- Proper Python package structure (removed `sys.path.insert` hack)

### Fixed
- WebSocket connections dict was not thread-safe (added threading.Lock)
- Cancel endpoint set status to "failed" instead of "cancelled"
- Orphaned "running" jobs after server restart now cleaned up automatically

## [0.1.0] - 2025-01-01

### Added
- Initial release: experiment and job management
- CNN, MLP, and RNN model architectures on MNIST
- Real-time training progress via WebSocket
- Docker Compose deployment with PostgreSQL
- Next.js 15 frontend with Shadcn UI
