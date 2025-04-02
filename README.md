# ExperimentHub

<div align="center">
  <h3>🚀 A Modern Machine Learning Experiment Management Platform</h3>
  <p>Track, compare, and optimize your ML models with ease</p>
</div>

![ExperimentHub Dashboard](https://github.com/user-attachments/assets/765d961d-afca-4b16-b1dd-4006e8cb0f87)

## System Architecturee

![System Architecture](https://github.com/user-attachments/assets/72a42c4c-f6c8-4fbc-b317-f8e0fb5805b9)

The ExperimentHub platform uses a modern containerized architecture with the following components:

- **Frontend Container**:
  - Next.js Application (UI) for the main interface
  - Job Management UI for monitoring training progress
  - Communicates with backend via REST API and WebSocket for real-time updates

- **Backend Container**:
  - FastAPI Server handling API requests and WebSocket connections
  - ML Model Training Modules for executing experiments
  - Integrates with SQLite for job/experiment tracking
  - Manages MNIST dataset access for training

- **Data & Persistence**:
  - SQLite Database for storing experiment metadata and results
  - MNIST Dataset for model training

The system uses Docker Compose for orchestration, making it easy to deploy and scale. The architecture ensures real-time communication between components through WebSocket connections for live training updates and REST APIs for general operations.

## Features

- **Experiment Management**: Create, organize, and track machine learning experiments
- **Model Training**: Train MLP, CNN, and RNN models with customizable hyperparameters
- **Real-time Monitoring**: Track metrics and progress during training via WebSockets
- **Interactive Visualizations**: Compare performance metrics across models and experiments
- **Job Queue**: Manage multiple training jobs simultaneously

## Project Structure

The project is organized into two main components:

- [**Frontend**](experimenthub/README.md): Next.js-based web interface (React 19, Tailwind CSS)
- [**Backend**](backend/README.md): FastAPI server with PyTorch model training

## Quick Start

### Using Docker

The easiest way to run the entire application stack is with Docker Compose:

```bash
# Start all services
docker-compose up

# Access the frontend at http://localhost:3000
# Access the backend API at http://localhost:8000
```

### Manual Setup

For development, you can set up the frontend and backend separately:

1. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -e ".[dev]"
   uvicorn app.main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd experimenthub
   npm install
   npm run dev
   ```

## Development

See the individual README files in the [frontend](experimenthub/README.md) and [backend](backend/README.md) directories for detailed development instructions.

## License

MIT
