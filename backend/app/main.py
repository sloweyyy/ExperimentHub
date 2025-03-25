from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import asyncio
import uuid
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import get_db, init_db, Job, Experiment
from app.schemas import ExperimentCreate, ExperimentResponse, JobCreate, JobResponse, JobWithHistory, JobStatusUpdate
from models.mnist_model import create_model
from models.trainer import train_model

# Create FastAPI app
app = FastAPI(title="Experiment Hub API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections dictionary
ws_connections = {}

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# WebSocket endpoint for real-time updates
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    ws_connections[client_id] = websocket
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        if client_id in ws_connections:
            del ws_connections[client_id]

# Helper function to send WebSocket updates
async def send_ws_update(job_id: str, data: dict):
    # Send update to all connected clients
    disconnected_clients = []
    for client_id, websocket in ws_connections.items():
        try:
            await websocket.send_json({"job_id": job_id, "data": data})
        except:
            disconnected_clients.append(client_id)
    
    # Clean up disconnected clients
    for client_id in disconnected_clients:
        if client_id in ws_connections:
            del ws_connections[client_id]

# Status update callback for training job
async def training_status_callback(status_data):
    job_id = status_data.get("job_id")
    
    # Update database with status
    async def update_job_in_db():
        db = next(get_db())
        job = db.query(Job).filter(Job.job_id == job_id).first()
        
        if not job:
            return
        
        if "epoch" in status_data:
            job.epochs_completed = status_data["epoch"]
        
        if status_data.get("status") == "completed" and "final_results" in status_data:
            results = status_data["final_results"]
            job.status = "completed"
            job.completed_at = datetime.utcnow()
            job.best_accuracy = results.get("best_accuracy")
            job.total_time = results.get("total_time")
            job.history = results.get("history")
        elif status_data.get("status") == "failed":
            job.status = "failed"
            job.completed_at = datetime.utcnow()
        
        db.commit()
    
    # Run database update
    loop = asyncio.get_event_loop()
    asyncio.create_task(update_job_in_db())
    
    # Send WebSocket update
    await send_ws_update(job_id, status_data)

# Background task to run training job
def run_training_job(job_id: str, model_type: str, parameters: dict):
    # Create event loop for async operations
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Update job status to running
    db = next(get_db())
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if job:
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()
    
    # Create model and train
    try:
        # Create model
        model_params = {k: v for k, v in parameters.items() 
                       if k in ['dropout_rate', 'hidden_size', 'kernel_size', 'num_layers']}
        model = create_model(model_type, **model_params)
        
        # Training params
        training_params = {k: v for k, v in parameters.items() 
                          if k not in ['dropout_rate', 'hidden_size', 'kernel_size', 'num_layers']}
        
        # Setup callback for status updates
        def status_callback(status_data):
            loop.run_until_complete(training_status_callback(status_data))
        
        # Train the model
        train_model(model, job_id, training_params, status_callback)
    
    except Exception as e:
        # Handle exceptions
        error_info = {
            "job_id": job_id,
            "status": "failed",
            "error": str(e)
        }
        loop.run_until_complete(training_status_callback(error_info))
    
    finally:
        loop.close()

# API Endpoints
@app.get("/")
def read_root():
    return {"message": "Welcome to Experiment Hub API"}

# Experiments endpoints
@app.post("/experiments/", response_model=ExperimentResponse)
def create_experiment(experiment: ExperimentCreate, db: Session = Depends(get_db)):
    db_experiment = Experiment(**experiment.dict())
    db.add(db_experiment)
    db.commit()
    db.refresh(db_experiment)
    return db_experiment

@app.get("/experiments/", response_model=list[ExperimentResponse])
def read_experiments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    experiments = db.query(Experiment).offset(skip).limit(limit).all()
    return experiments

@app.get("/experiments/{experiment_id}", response_model=ExperimentResponse)
def read_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment

@app.delete("/experiments/{experiment_id}")
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    db.delete(experiment)
    db.commit()
    return {"message": "Experiment deleted successfully"}

# Jobs endpoints
@app.post("/jobs/", response_model=JobResponse)
def create_job(job: JobCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if experiment exists
    experiment = db.query(Experiment).filter(Experiment.id == job.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    # Check for duplicate job
    existing_job = db.query(Job).filter(
        Job.experiment_id == job.experiment_id,
        Job.model_type == job.model_type
    ).all()
    
    # Debug logging
    print(f"Creating job: {job.name}, Model: {job.model_type}, Params: {job.parameters}")
    print(f"Found {len(existing_job)} existing jobs with same experiment and model type")
    
    # Check for exact parameter matches by comparing individual parameters
    # Some parameters like dropout_rate, hidden_size, etc. are allowed to be different
    duplicate_found = False
    for ej in existing_job:
        ej_params = ej.parameters
        job_params = job.parameters.dict()
        
        print(f"Comparing with job: {ej.name}, ID: {ej.job_id}")
        print(f"Existing params: {ej_params}")
        print(f"New params: {job_params}")
        
        # Compare essential parameters
        core_match = (
            ej_params.get('optimizer') == job_params.get('optimizer') and
            ej_params.get('learning_rate') == job_params.get('learning_rate') and
            ej_params.get('batch_size') == job_params.get('batch_size') and
            ej_params.get('epochs') == job_params.get('epochs')
        )
        
        print(f"Core parameters match: {core_match}")
        
        # Check model-specific parameters
        specific_params_match = False  # Start with False
        if job.model_type == 'mlp':
            # For MLP, compare hidden_size and dropout_rate
            ej_hidden = ej_params.get('hidden_size')
            new_hidden = job_params.get('hidden_size')
            ej_dropout = ej_params.get('dropout_rate') 
            new_dropout = job_params.get('dropout_rate')
            ej_num_layers = ej_params.get('num_layers')
            new_num_layers = job_params.get('num_layers')
            
            specific_params_match = (
                ej_hidden == new_hidden and 
                ej_dropout == new_dropout and
                ej_num_layers == new_num_layers
            )
            print(f"MLP specific - hidden: {ej_hidden} vs {new_hidden}, dropout: {ej_dropout} vs {new_dropout}, layers: {ej_num_layers} vs {new_num_layers}")
        elif job.model_type == 'cnn':
            # For CNN, compare kernel_size
            ej_kernel = ej_params.get('kernel_size')
            new_kernel = job_params.get('kernel_size')
            specific_params_match = (ej_kernel == new_kernel)
            print(f"CNN specific - kernel: {ej_kernel} vs {new_kernel}")
        
        print(f"Specific parameters match: {specific_params_match}")
        
        # If both core and specific parameters match, it's a duplicate
        if core_match and specific_params_match:
            print(f"DUPLICATE FOUND - returning existing job {ej.job_id}")
            duplicate_found = True
            return ej
    
    print("No duplicate found - creating new job")
    # If no duplicate found, create new job
    job_id = str(uuid.uuid4())
    db_job = Job(
        job_id=job_id,
        name=job.name,
        experiment_id=job.experiment_id,
        model_type=job.model_type,
        parameters=job.parameters.dict(),
        status="pending"
    )
    
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Start training job in background
    background_tasks.add_task(
        run_training_job,
        job_id=job_id,
        model_type=job.model_type,
        parameters=job.parameters.dict()
    )
    
    return db_job

@app.get("/jobs/", response_model=list[JobResponse])
def read_jobs(
    experiment_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Job)
    if experiment_id:
        query = query.filter(Job.experiment_id == experiment_id)
    
    jobs = query.offset(skip).limit(limit).all()
    return jobs

@app.get("/jobs/{job_id}", response_model=JobWithHistory)
def read_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.delete("/jobs/{job_id}", response_model=dict)
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete the job
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully", "job_id": job_id}

@app.post("/jobs/{job_id}/cancel", response_model=dict)
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in ["pending", "running"]:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled")
    
    # Cancel the job
    job.status = "failed"
    job.completed_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Job cancelled successfully", "job_id": job_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 