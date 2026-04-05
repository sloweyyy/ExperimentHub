"""
Router for experiment endpoints.

Handles CRUD operations for experiments.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import Experiment, get_db
from app.schemas import ExperimentCreate, ExperimentResponse, ExperimentUpdate

router = APIRouter(prefix="")


@router.post("/experiments/", response_model=ExperimentResponse)
def create_experiment(
    experiment: ExperimentCreate, db: Session = Depends(get_db)
):
    db_experiment = Experiment(**experiment.model_dump())
    db.add(db_experiment)
    db.commit()
    db.refresh(db_experiment)
    return db_experiment


@router.get("/experiments/", response_model=list[ExperimentResponse])
def read_experiments(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    experiments = db.query(Experiment).offset(skip).limit(limit).all()
    return experiments


@router.get("/experiments/{experiment_id}", response_model=ExperimentResponse)
def read_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = (
        db.query(Experiment).filter(Experiment.id == experiment_id).first()
    )
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment


@router.put("/experiments/{experiment_id}", response_model=ExperimentResponse)
def update_experiment(
    experiment_id: int,
    payload: ExperimentUpdate,
    db: Session = Depends(get_db),
):
    experiment = (
        db.query(Experiment).filter(Experiment.id == experiment_id).first()
    )
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(experiment, field, value)

    db.commit()
    db.refresh(experiment)
    return experiment


@router.delete("/experiments/{experiment_id}")
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = (
        db.query(Experiment).filter(Experiment.id == experiment_id).first()
    )
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    db.delete(experiment)
    db.commit()
    return {"message": "Experiment deleted successfully"}
