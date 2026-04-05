// Canonical type definitions for ExperimentHub.
// All components and modules import types from here.

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type ModelType = "mlp" | "cnn" | "rnn";

export interface Experiment {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface JobParameters {
  model_type: ModelType;
  optimizer: string;
  learning_rate: number;
  batch_size: number;
  epochs: number;
  dropout_rate?: number;
  hidden_size?: number;
  kernel_size?: number;
  num_layers?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface Job {
  id: number;
  job_id: string;
  name: string;
  experiment_id: number;
  parameters: JobParameters;
  model_type: ModelType;
  status: JobStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  total_time?: number;
  best_accuracy?: number;
  epochs_completed: number;
}

export interface JobHistory {
  train_loss: number[];
  val_loss: number[];
  train_accuracy: number[];
  val_accuracy: number[];
  epoch_times: number[];
}

export interface JobWithHistory extends Job {
  history?: JobHistory;
}

export interface JobStatusUpdate {
  job_id: string;
  status: JobStatus;
  epoch: number;
  epochs_total: number;
  train_loss?: number;
  val_loss?: number;
  train_accuracy?: number;
  val_accuracy?: number;
  epoch_time?: number;
  best_accuracy?: number;
}

export interface WebSocketMessage {
  job_id: string;
  data: JobStatusUpdate;
}
