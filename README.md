# ExperimentHub

[![CI](https://github.com/sloweyyy/ExperimentHub/actions/workflows/ci.yml/badge.svg)](https://github.com/sloweyyy/ExperimentHub/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A contributor-friendly ML experiment management platform. Track experiments, train
models, and monitor progress in real time.

ExperimentHub exists to be studied, forked, and improved. If you want to learn how a
full-stack ML app works, or you want to contribute to one, start here.

![ExperimentHub Demo](docs/demo.gif)

## Quick Start

```bash
git clone https://github.com/sloweyyy/ExperimentHub.git
cd ExperimentHub
cp .env.example .env
make dev
```

Open `http://localhost:3000`. Create an experiment, start a training job, watch it train.

**Requirements:** Python 3.10+, Node.js 20+. Or use Docker: `make docker`.

## What It Does

- **Experiment management** with create, update, and delete
- **Model training** with CNN, MLP, and RNN architectures on MNIST
- **Real-time progress** via WebSocket (loss, accuracy, epoch timing)
- **Hyperparameter configuration** (optimizer, learning rate, batch size, epochs, dropout, hidden size)
- **Job lifecycle** with pending, running, completed, cancelled, and failed states
- **Training history** with loss curves and accuracy metrics

## Architecture

![System Architecture](https://github.com/user-attachments/assets/72a42c4c-f6c8-4fbc-b317-f8e0fb5805b9)

Next.js 15 frontend communicates with the FastAPI backend over REST and WebSocket.
The backend trains PyTorch models and streams real-time progress to the UI.
SQLite for local dev, PostgreSQL for Docker.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI, Zustand, Recharts |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic 2, Alembic |
| ML | PyTorch, TorchVision (MNIST) |
| Infra | Docker Compose, GitHub Actions, GHCR |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Quick start guide (running in under 3 minutes)
- Architecture overview
- **How to Add a New Model Architecture** (step-by-step tutorial)
- **How to Add a New API Endpoint**
- Code style and testing guidelines

Looking for something to work on? Check issues labeled
[`good first issue`](https://github.com/sloweyyy/ExperimentHub/labels/good%20first%20issue).

## Development Commands

```bash
make dev              # Start local development
make docker           # Run with Docker Compose
make test             # Run all tests
make lint             # Run all linters
make format           # Auto-format code
make migrate          # Apply database migrations
```

## API Documentation

With the backend running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Known Limitations

- Training jobs run in-process. Server restart kills running jobs (cleaned up on next start).
- MNIST only. Dataset extensibility is planned.
- Single-machine. No distributed training yet.

To report a security issue, email truonglevinhphuc2006@gmail.com.

## License

[MIT](LICENSE)
