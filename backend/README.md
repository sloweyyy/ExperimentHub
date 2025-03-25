# ExperimentHub Backend

A robust FastAPI backend for ExperimentHub that provides experiment management, model training, and API endpoints for the frontend.

## Technologies

- **FastAPI** for API server
- **SQLAlchemy** for database ORM
- **PyTorch** for neural networks
- **asyncpg** for async PostgreSQL connectivity
- **Pydantic** for data validation
- **Uvicorn** for ASGI server

## Getting Started

### Prerequisites

- Python 3.9+
- PostgreSQL (or SQLite for development)

### Installation

```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"
```

### Running the Server

```bash
# Start the development server
uvicorn app.main:app --reload
```

The API will be available at [http://localhost:8000](http://localhost:8000) with interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs).

## API Endpoints

- **/experiments**: Manage ML experiments
- **/jobs**: Create and manage model training jobs
- **/ws**: WebSocket connections for real-time updates

## Development Tools

- **Black** for code formatting
- **isort** for import sorting
- **flake8** for linting
- **mypy** for static type checking
- **pytest** for testing
- **pre-commit** for Git hooks

## Project Structure

- **/app**: Main application code (FastAPI routes, database models)
- **/models**: Machine learning model implementations
- **/tests**: Test suite

## Database

The application uses SQLite by default for development, but is configured to work with PostgreSQL in production.

## License

MIT
