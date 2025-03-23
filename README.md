# ExperimentHub

ExperimentHub is a web application for managing machine learning experiments and jobs.

![image](https://github.com/user-attachments/assets/765d961d-afca-4b16-b1dd-4006e8cb0f87)

## Running with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running the Application

1. Clone the repository:
   ```
   git clone <repository-url>
   cd ExperimentHub
   ```

2. Build and start the containers:
   ```
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### Development Mode

If you want to run the application in development mode with hot reloading:

1. Start only the backend:
   ```
   docker-compose up backend
   ```

2. Run the frontend in development mode:
   ```
   cd experimenthub
   npm install
   npm run dev
   ```

### Stopping the Application

To stop the running containers:
```
docker-compose down
```

## Manual Setup (Without Docker)

### Backend

1. Set up a Python virtual environment:
   ```
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the server:
   ```
   python run_server.py
   ```

### Frontend

1. Install Node.js dependencies:
   ```
   cd experimenthub
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

## Additional Information

- The backend uses a SQLite database by default, stored in `backend/experiment_db.sqlite`
- The application is configured to use TensorFlow/PyTorch for machine learning model training 
