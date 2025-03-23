# ExperimentHub

<div align="center">
  <h3>🚀 A Modern Machine Learning Experiment Management Platform</h3>
  <p>Track, compare, and optimize your ML models with ease</p>
</div>

![image](https://github.com/user-attachments/assets/765d961d-afca-4b16-b1dd-4006e8cb0f87)

## 🌟 Features

- **Experiment Organization**: Group related ML training jobs into experiments
- **Multiple Model Support**: Train and evaluate MLP, CNN, and RNN architectures
- **Real-time Monitoring**: Track training progress and metrics with WebSocket updates
- **Interactive Dashboard**: Visualize performance metrics and experiment results
- **Hyperparameter Management**: Configure and test different parameter combinations
- **Job Control**: Start, stop, and cancel training jobs as needed

## 🔧 Tech Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) with React 19
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Tailwind CSS
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with persist middleware
- **API Client**: Axios with WebSocket integration
- **Form Handling**: React Hook Form with Zod validation
- **Data Visualization**: Recharts for performance metrics
- **Notifications**: Sonner toast notifications

### Backend
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) with Pydantic schemas
- **ML Library**: PyTorch for model training
- **Database**: SQLAlchemy ORM with SQLite
- **Async**: Uvicorn ASGI server with WebSocket support
- **Task Management**: Background tasks for training jobs

### DevOps
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for service coordination
- **Deployment**: Ready-made configuration for easy deployment

## 🚀 Installation & Setup

### Docker (Recommended)

#### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

#### Running the Application
1. Clone the repository:
   ```bash
   git clone https://github.com/sloweyyy/ExperimentHub
   cd ExperimentHub
   ```

2. Build and start the containers:
   ```bash
   docker compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000 
   - API Docs: http://localhost:8000/docs

### Development Mode

If you want to run the application in development mode with hot reloading:

1. Start only the backend:
   ```bash
   docker compose up backend
   ```

2. Run the frontend in development mode:
   ```bash
   cd experimenthub
   npm install
   npm run dev
   ```

### Manual Setup (Without Docker)

#### Backend
1. Set up a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:
   ```bash
   python run_server.py
   ```

#### Frontend
1. Install Node.js dependencies:
   ```bash
   cd experimenthub
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## 📦 Project Structure

```
ExperimentHub/
├── backend/                # Python FastAPI backend
│   ├── app/                # Application code
│   │   ├── database.py     # Database models and connection
│   │   ├── main.py         # Main FastAPI application
│   │   └── schemas.py      # Pydantic schemas
│   ├── models/             # ML model definitions
│   ├── data/               # Training datasets
│   └── requirements.txt    # Python dependencies
├── experimenthub/          # Next.js frontend
│   ├── app/                # Next.js pages
│   ├── components/         # React components
│   ├── lib/                # Utilities and API client
│   └── public/             # Static assets
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile.backend      # Backend Docker configuration
└── Dockerfile.frontend     # Frontend Docker configuration
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
