import type {
  Job,
  Experiment,
  JobStatus,
  ModelType,
  JobStatusUpdate,
} from "@/types";

describe("Type definitions", () => {
  it("JobStatus includes cancelled", () => {
    const status: JobStatus = "cancelled";
    expect(status).toBe("cancelled");
  });

  it("ModelType includes all architectures", () => {
    const types: ModelType[] = ["cnn", "mlp", "rnn"];
    expect(types).toHaveLength(3);
  });

  it("Experiment type can be instantiated", () => {
    const exp: Experiment = {
      id: 1,
      name: "Test",
      description: "desc",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };
    expect(exp.id).toBe(1);
    expect(exp.name).toBe("Test");
  });

  it("Job type can be instantiated", () => {
    const job: Job = {
      id: 1,
      job_id: "j-1",
      name: "Job 1",
      experiment_id: 1,
      parameters: {
        model_type: "mlp",
        optimizer: "sgd",
        learning_rate: 0.01,
        batch_size: 64,
        epochs: 5,
      },
      model_type: "mlp",
      status: "running",
      created_at: "2025-01-01T00:00:00Z",
      epochs_completed: 2,
    };
    expect(job.status).toBe("running");
  });

  it("JobStatusUpdate type can be instantiated", () => {
    const update: JobStatusUpdate = {
      job_id: "j-1",
      status: "completed",
      epoch: 10,
      epochs_total: 10,
      train_loss: 0.1,
      val_loss: 0.15,
      train_accuracy: 0.95,
      val_accuracy: 0.93,
      epoch_time: 2.5,
      best_accuracy: 0.95,
    };
    expect(update.status).toBe("completed");
    expect(update.epoch).toBe(10);
  });
});
