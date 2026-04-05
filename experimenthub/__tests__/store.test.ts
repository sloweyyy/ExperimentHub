import { useStore } from "@/lib/store";
import type {
  Experiment,
  Job,
  JobWithHistory,
  JobStatusUpdate,
} from "@/types";

// Reset the store to a clean state before each test
beforeEach(() => {
  useStore.setState({
    experiments: [],
    jobs: [],
    jobsWithHistory: {},
    jobStatus: {},
    activeExperiment: null,
    activeJob: null,
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    id: 1,
    name: "Test Experiment",
    description: "A test experiment",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    job_id: "job-1",
    name: "Test Job",
    experiment_id: 1,
    parameters: {
      model_type: "cnn",
      optimizer: "adam",
      learning_rate: 0.001,
      batch_size: 32,
      epochs: 10,
    },
    model_type: "cnn",
    status: "pending",
    created_at: "2025-01-01T00:00:00Z",
    epochs_completed: 0,
    ...overrides,
  };
}

function makeJobWithHistory(
  overrides: Partial<JobWithHistory> = {}
): JobWithHistory {
  return {
    ...makeJob(),
    history: {
      train_loss: [],
      val_loss: [],
      train_accuracy: [],
      val_accuracy: [],
      epoch_times: [],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useStore", () => {
  describe("setExperiments", () => {
    it("replaces the experiments list", () => {
      const exps = [makeExperiment({ id: 1 }), makeExperiment({ id: 2 })];

      useStore.getState().setExperiments(exps);

      expect(useStore.getState().experiments).toEqual(exps);
      expect(useStore.getState().experiments).toHaveLength(2);
    });
  });

  describe("setJobs deduplication", () => {
    it("deduplicates jobs by job_id when adding overlapping sets", () => {
      const jobA = makeJob({ id: 1, job_id: "job-a", name: "Job A" });
      const jobB = makeJob({ id: 2, job_id: "job-b", name: "Job B" });
      const jobC = makeJob({ id: 3, job_id: "job-c", name: "Job C" });
      const jobBUpdated = makeJob({
        id: 2,
        job_id: "job-b",
        name: "Job B Updated",
      });

      // First batch
      useStore.getState().setJobs([jobA, jobB]);
      expect(useStore.getState().jobs).toHaveLength(2);

      // Second batch overlaps on job-b and adds job-c
      useStore.getState().setJobs([jobBUpdated, jobC]);

      const { jobs } = useStore.getState();
      expect(jobs).toHaveLength(3);

      // job-b should be the updated version
      const foundB = jobs.find((j) => j.job_id === "job-b");
      expect(foundB?.name).toBe("Job B Updated");
    });
  });

  describe("removeExperiment", () => {
    it("removes the experiment by id", () => {
      const exp = makeExperiment({ id: 5 });
      useStore.setState({ experiments: [exp] });

      useStore.getState().removeExperiment(5);

      expect(useStore.getState().experiments).toHaveLength(0);
    });

    it("clears activeExperiment when the removed experiment was active", () => {
      const exp = makeExperiment({ id: 5 });
      useStore.setState({ experiments: [exp], activeExperiment: exp });

      useStore.getState().removeExperiment(5);

      expect(useStore.getState().activeExperiment).toBeNull();
    });

    it("does not clear activeExperiment when a different experiment is removed", () => {
      const active = makeExperiment({ id: 1 });
      const other = makeExperiment({ id: 2 });
      useStore.setState({
        experiments: [active, other],
        activeExperiment: active,
      });

      useStore.getState().removeExperiment(2);

      expect(useStore.getState().activeExperiment).toEqual(active);
      expect(useStore.getState().experiments).toHaveLength(1);
    });
  });

  describe("removeJob", () => {
    it("removes the job from jobs, jobsWithHistory, and jobStatus", () => {
      const job = makeJob({ job_id: "job-x" });
      const jwh = makeJobWithHistory({ job_id: "job-x" });
      const statusUpdate: JobStatusUpdate = {
        job_id: "job-x",
        status: "running",
        epoch: 1,
        epochs_total: 10,
      };

      useStore.setState({
        jobs: [job],
        jobsWithHistory: { "job-x": jwh },
        jobStatus: { "job-x": statusUpdate },
      });

      useStore.getState().removeJob("job-x");

      const state = useStore.getState();
      expect(state.jobs).toHaveLength(0);
      expect(state.jobsWithHistory["job-x"]).toBeUndefined();
      expect(state.jobStatus["job-x"]).toBeUndefined();
    });
  });

  describe("updateJobStatus", () => {
    it("updates job fields and appends to history arrays when epoch is new", () => {
      const job = makeJob({ job_id: "job-1", status: "pending" });
      const jwh = makeJobWithHistory({ job_id: "job-1" });

      useStore.setState({
        jobs: [job],
        jobsWithHistory: { "job-1": jwh },
      });

      const statusUpdate: JobStatusUpdate = {
        job_id: "job-1",
        status: "running",
        epoch: 1,
        epochs_total: 10,
        train_loss: 0.5,
        val_loss: 0.6,
        train_accuracy: 0.7,
        val_accuracy: 0.65,
        epoch_time: 1.2,
        best_accuracy: 0.7,
      };

      useStore.getState().updateJobStatus("job-1", statusUpdate);

      const state = useStore.getState();

      // Job in jobs array should be updated
      const updatedJob = state.jobs.find((j) => j.job_id === "job-1");
      expect(updatedJob?.status).toBe("running");
      expect(updatedJob?.epochs_completed).toBe(1);
      expect(updatedJob?.best_accuracy).toBe(0.7);

      // History should have grown
      const history = state.jobsWithHistory["job-1"].history!;
      expect(history.train_loss).toEqual([0.5]);
      expect(history.val_loss).toEqual([0.6]);
      expect(history.train_accuracy).toEqual([0.7]);
      expect(history.val_accuracy).toEqual([0.65]);
      expect(history.epoch_times).toEqual([1.2]);

      // jobStatus record should be stored
      expect(state.jobStatus["job-1"]).toEqual(statusUpdate);
    });

    it("skips appending to history when epoch is not new", () => {
      const jwh: JobWithHistory = {
        ...makeJob({ job_id: "job-1" }),
        history: {
          train_loss: [0.5],
          val_loss: [0.6],
          train_accuracy: [0.7],
          val_accuracy: [0.65],
          epoch_times: [1.2],
        },
      };

      useStore.setState({
        jobs: [makeJob({ job_id: "job-1" })],
        jobsWithHistory: { "job-1": jwh },
      });

      // Same epoch=1 again (history already has length 1, so epoch <= length)
      const statusUpdate: JobStatusUpdate = {
        job_id: "job-1",
        status: "running",
        epoch: 1,
        epochs_total: 10,
        train_loss: 0.4,
        val_loss: 0.5,
        train_accuracy: 0.75,
        val_accuracy: 0.7,
        epoch_time: 1.1,
      };

      useStore.getState().updateJobStatus("job-1", statusUpdate);

      const history = useStore.getState().jobsWithHistory["job-1"].history!;
      // History arrays should NOT have grown because epoch (1) is not > train_loss.length (1)
      expect(history.train_loss).toEqual([0.5]);
      expect(history.val_loss).toEqual([0.6]);
      expect(history.train_accuracy).toEqual([0.7]);
      expect(history.val_accuracy).toEqual([0.65]);
      expect(history.epoch_times).toEqual([1.2]);
    });
  });
});
