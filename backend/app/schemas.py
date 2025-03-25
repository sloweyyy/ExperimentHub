from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

# Experiment schemas
class ExperimentBase(BaseModel):
    name: str
    description: Optional[str] = None

class ExperimentCreate(ExperimentBase):
    pass

class ExperimentResponse(ExperimentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Job schemas
class JobParameters(BaseModel):
    model_type: str = Field("cnn", description="Model type (cnn or nn)")
    epochs: int = Field(5, description="Number of training epochs")
    batch_size: int = Field(64, description="Batch size for training")
    learning_rate: float = Field(0.01, description="Learning rate")
    optimizer: str = Field("sgd", description="Optimizer (sgd or adam)")
    momentum: Optional[float] = Field(0.5, description="Momentum for SGD optimizer")
    dropout_rate: Optional[float] = Field(0.5, description="Dropout rate")
    hidden_size: Optional[int] = Field(128, description="Hidden layer size")
    kernel_size: Optional[int] = Field(3, description="Kernel size for CNN")
    num_layers: Optional[int] = Field(2, description="Number of hidden layers for MLP/RNN")
    use_scheduler: Optional[bool] = Field(False, description="Use learning rate scheduler")

class JobBase(BaseModel):
    name: str
    model_type: str = "cnn"
    parameters: JobParameters

class JobCreate(JobBase):
    experiment_id: int

class JobResponse(JobBase):
    id: int
    job_id: str
    experiment_id: int
    status: str
    best_accuracy: Optional[float] = None
    total_time: Optional[float] = None
    epochs_completed: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class JobWithHistory(JobResponse):
    history: Optional[Dict[str, List[float]]] = None
    
    class Config:
        from_attributes = True

# Job status update schema
class JobStatusUpdate(BaseModel):
    status: str
    progress: Optional[float] = None
    epoch: Optional[int] = None
    train_loss: Optional[float] = None
    train_accuracy: Optional[float] = None
    val_loss: Optional[float] = None
    val_accuracy: Optional[float] = None
    
    class Config:
        from_attributes = True 