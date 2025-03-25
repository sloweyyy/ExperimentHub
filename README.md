# ExperimentHub

<div align="center">
  <h3>🚀 A Modern Machine Learning Experiment Management Platform</h3>
  <p>Track, compare, and optimize your ML models with ease</p>
</div>

![ExperimentHub Dashboard](https://github.com/user-attachments/assets/765d961d-afca-4b16-b1dd-4006e8cb0f87)

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
