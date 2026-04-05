# TODOS

## API Versioning

**What:** Add `/api/v1/` prefix to all routes.

**Why:** Without versioning, any breaking API change forces all consumers to update
simultaneously. Adding the prefix during router extraction costs 1 minute; retrofitting
later means changing every route, test, and doc.

**Depends on:** Workstream 2 (router extraction) complete, or done simultaneously.

## Task Queue for Training Jobs

**What:** Replace BackgroundTasks threads with Celery/ARQ + Redis for training job execution.

**Why:** Current in-process training doesn't survive restarts, can't be distributed,
and blocks on I/O. A task queue enables distributed training, job recovery, and better
resource management.

**Depends on:** Phase 2. Ghost job cleanup (this refactor) is the interim solution.
