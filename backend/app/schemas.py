"""
Pydantic schemas for request/response validation and API documentation.
"""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Experiment schemas
# ---------------------------------------------------------------------------


class ExperimentBase(BaseModel):
    name: str = Field(..., description="Human-readable experiment name")
    description: Optional[str] = Field(
        None, description="Optional longer description of the experiment"
    )


class ExperimentCreate(ExperimentBase):
    """Payload for creating a new experiment."""

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "MNIST Baseline",
                    "description": "Baseline CNN experiment on MNIST",
                }
            ]
        }
    }


class ExperimentUpdate(BaseModel):
    """Payload for updating an existing experiment (partial)."""

    name: Optional[str] = Field(None, description="Updated experiment name")
    description: Optional[str] = Field(
        None, description="Updated experiment description"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "MNIST Improved",
                    "description": "Updated description after tuning",
                }
            ]
        }
    }


class ExperimentResponse(ExperimentBase):
    """Experiment data returned by the API."""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Job schemas
# ---------------------------------------------------------------------------


class JobParameters(BaseModel):
    """Hyper-parameters for a training job."""

    model_type: str = Field(
        "cnn",
        description="Model architecture to train (cnn, mlp, or rnn)",
    )
    epochs: int = Field(5, description="Number of training epochs", ge=1)
    batch_size: int = Field(64, description="Mini-batch size for training", ge=1)
    learning_rate: float = Field(0.01, description="Initial learning rate", gt=0)
    optimizer: str = Field("sgd", description="Optimizer algorithm (sgd or adam)")
    momentum: Optional[float] = Field(0.5, description="Momentum for the SGD optimizer")
    dropout_rate: Optional[float] = Field(
        0.5, description="Dropout probability applied during training"
    )
    hidden_size: Optional[int] = Field(128, description="Width of hidden layers")
    kernel_size: Optional[int] = Field(
        3, description="Convolution kernel size (CNN only)"
    )
    num_layers: Optional[int] = Field(
        2, description="Number of hidden layers (MLP/RNN only)"
    )
    use_scheduler: Optional[bool] = Field(
        False, description="Enable ReduceLROnPlateau learning-rate scheduler"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "model_type": "cnn",
                    "epochs": 10,
                    "batch_size": 64,
                    "learning_rate": 0.001,
                    "optimizer": "adam",
                    "momentum": 0.5,
                    "dropout_rate": 0.3,
                    "hidden_size": 128,
                    "kernel_size": 3,
                    "num_layers": 2,
                    "use_scheduler": True,
                }
            ]
        }
    }


class JobBase(BaseModel):
    name: str = Field(..., description="Human-readable job name")
    model_type: str = Field("cnn", description="Model architecture (cnn, mlp, or rnn)")
    parameters: JobParameters


class JobCreate(JobBase):
    """Payload for creating a new training job."""

    experiment_id: int = Field(..., description="ID of the parent experiment")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "CNN baseline run",
                    "model_type": "cnn",
                    "experiment_id": 1,
                    "parameters": {
                        "model_type": "cnn",
                        "epochs": 5,
                        "batch_size": 64,
                        "learning_rate": 0.01,
                        "optimizer": "sgd",
                    },
                }
            ]
        }
    }


class JobResponse(JobBase):
    """Job data returned by the API (without full training history)."""

    id: int
    job_id: str = Field(..., description="Unique job identifier (UUID)")
    experiment_id: int
    # Status: pending | running | completed | failed | cancelled
    status: str = Field(..., description="Current job status")
    best_accuracy: Optional[float] = Field(
        None, description="Best validation accuracy achieved"
    )
    total_time: Optional[float] = Field(
        None, description="Total training wall-clock time in seconds"
    )
    epochs_completed: int = Field(0, description="Number of epochs completed so far")
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobWithHistory(JobResponse):
    """Job data including the full epoch-by-epoch training history."""

    history: Optional[Dict[str, List[float]]] = Field(
        None,
        description="Per-epoch training history (train_loss, val_accuracy, etc.)",
    )

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Job status update (internal)
# ---------------------------------------------------------------------------


class JobStatusUpdate(BaseModel):
    """Schema for real-time training status updates sent over WebSocket."""

    status: str = Field(..., description="Current status of the job")
    progress: Optional[float] = Field(
        None, description="Training progress as a percentage"
    )
    epoch: Optional[int] = Field(None, description="Current epoch number")
    train_loss: Optional[float] = None
    train_accuracy: Optional[float] = None
    val_loss: Optional[float] = None
    val_accuracy: Optional[float] = None

    class Config:
        from_attributes = True
