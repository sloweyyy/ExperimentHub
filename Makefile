.PHONY: dev dev-backend dev-frontend docker test test-backend test-frontend lint lint-backend lint-frontend format migrate clean

# ── Development ──────────────────────────────────────────

dev: dev-backend dev-frontend

dev-backend:
	cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd experimenthub && npm run dev

# ── Docker ───────────────────────────────────────────────

docker:
	docker compose up --build

docker-down:
	docker compose down

# ── Testing ──────────────────────────────────────────────

test: test-backend test-frontend

test-backend:
	cd backend && python -m pytest --cov=app --cov=models --cov-report=term-missing

test-frontend:
	cd experimenthub && npm test -- --coverage --watchAll=false

# ── Linting ──────────────────────────────────────────────

lint: lint-backend lint-frontend

lint-backend:
	cd backend && python -m black --check . && python -m isort --check . && python -m flake8 . && python -m mypy app/ models/

lint-frontend:
	cd experimenthub && npm run lint && npx tsc --noEmit

# ── Formatting ───────────────────────────────────────────

format:
	cd backend && python -m black . && python -m isort .
	cd experimenthub && npm run format

# ── Database ─────────────────────────────────────────────

migrate:
	cd backend && python -m alembic upgrade head

migrate-create:
	cd backend && python -m alembic revision --autogenerate -m "$(MSG)"

# ── Cleanup ──────────────────────────────────────────────

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	rm -rf backend/.mypy_cache 2>/dev/null || true
	rm -rf experimenthub/.next 2>/dev/null || true
	rm -rf experimenthub/coverage 2>/dev/null || true
