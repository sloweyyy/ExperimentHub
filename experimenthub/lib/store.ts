import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	Experiment,
	Job,
	JobWithHistory,
	JobStatusUpdate,
	JobStatus,
} from "@/types";

interface StoreState {
	experiments: Experiment[];
	jobs: Job[];
	jobsWithHistory: Record<string, JobWithHistory>;
	jobStatus: Record<string, JobStatusUpdate>;

	activeExperiment: Experiment | null;
	activeJob: Job | null;

	setExperiments: (experiments: Experiment[]) => void;
	setJobs: (jobs: Job[]) => void;
	setActiveExperiment: (experiment: Experiment | null) => void;
	setActiveJob: (job: Job | null) => void;
	removeExperiment: (experimentId: number) => void;

	setJobHistory: (jobId: string, job: JobWithHistory) => void;
	updateJobStatus: (jobId: string, status: JobStatusUpdate) => void;
	removeJob: (jobId: string) => void;
}

export const useStore = create<StoreState>()(
	persist(
		(set) => ({
			experiments: [],
			jobs: [],
			jobsWithHistory: {},
			jobStatus: {},
			activeExperiment: null,
			activeJob: null,

			setExperiments: (experiments) => set({ experiments }),
			setJobs: (jobs) =>
				set((state) => {
					const existingJobIds = new Map(
						state.jobs.map((job) => [job.job_id, job])
					);

					for (const job of jobs) {
						existingJobIds.set(job.job_id, job);
					}

					const dedupedJobs = Array.from(existingJobIds.values());

					return { jobs: dedupedJobs };
				}),
			setActiveExperiment: (activeExperiment) => set({ activeExperiment }),
			setActiveJob: (activeJob) => set({ activeJob }),
			removeExperiment: (experimentId) =>
				set((state) => ({
					experiments: state.experiments.filter(
						(exp) => exp.id !== experimentId
					),
					activeExperiment:
						state.activeExperiment?.id === experimentId
							? null
							: state.activeExperiment,
				})),
			setJobHistory: (jobId, job) =>
				set((state) => ({
					jobsWithHistory: { ...state.jobsWithHistory, [jobId]: job },
				})),
			updateJobStatus: (jobId, statusUpdate) =>
				set((state) => {
					const updatedJobs = state.jobs.map((job) =>
						job.job_id === jobId
							? {
									...job,
									status: statusUpdate.status,
									epochs_completed: statusUpdate.epoch,
									best_accuracy:
										statusUpdate.best_accuracy || job.best_accuracy,
							  }
							: job
					);

					const existingJobWithHistory = state.jobsWithHistory[jobId];
					let updatedJobsWithHistory = { ...state.jobsWithHistory };

					if (existingJobWithHistory) {
						const history = existingJobWithHistory.history || {
							train_loss: [],
							val_loss: [],
							train_accuracy: [],
							val_accuracy: [],
							epoch_times: [],
						};

						if (
							statusUpdate.epoch > 0 &&
							statusUpdate.epoch > history.train_loss.length &&
							statusUpdate.train_loss !== undefined &&
							statusUpdate.val_loss !== undefined &&
							statusUpdate.train_accuracy !== undefined &&
							statusUpdate.val_accuracy !== undefined &&
							statusUpdate.epoch_time !== undefined
						) {
							updatedJobsWithHistory = {
								...state.jobsWithHistory,
								[jobId]: {
									...existingJobWithHistory,
									status: statusUpdate.status,
									epochs_completed: statusUpdate.epoch,
									best_accuracy:
										statusUpdate.best_accuracy ||
										existingJobWithHistory.best_accuracy,
									history: {
										train_loss: [
											...history.train_loss,
											statusUpdate.train_loss,
										],
										val_loss: [...history.val_loss, statusUpdate.val_loss],
										train_accuracy: [
											...history.train_accuracy,
											statusUpdate.train_accuracy,
										],
										val_accuracy: [
											...history.val_accuracy,
											statusUpdate.val_accuracy,
										],
										epoch_times: [
											...history.epoch_times,
											statusUpdate.epoch_time,
										],
									},
								},
							};
						} else {
							updatedJobsWithHistory = {
								...state.jobsWithHistory,
								[jobId]: {
									...existingJobWithHistory,
									status: statusUpdate.status,
									epochs_completed: statusUpdate.epoch,
									best_accuracy:
										statusUpdate.best_accuracy ||
										existingJobWithHistory.best_accuracy,
								},
							};
						}
					}

					return {
						jobs: updatedJobs,
						jobsWithHistory: updatedJobsWithHistory,
						jobStatus: {
							...state.jobStatus,
							[jobId]: statusUpdate,
						},
					};
				}),
			removeJob: (jobId) =>
				set((state) => ({
					jobs: state.jobs.filter((j) => j.job_id !== jobId),
					jobsWithHistory: Object.fromEntries(
						Object.entries(state.jobsWithHistory).filter(
							([key]) => key !== jobId
						)
					),
					jobStatus: Object.fromEntries(
						Object.entries(state.jobStatus).filter(([key]) => key !== jobId)
					),
				})),
		}),
		{
			name: "experiment-hub-storage",
			version: 1,
			migrate: (persistedState: unknown, version: number) => {
				if (version === 0) {
					// Clear stale data from pre-refactor schema
					return {
						experiments: [],
						jobs: [],
						jobsWithHistory: {},
						jobStatus: {},
						activeExperiment: null,
						activeJob: null,
					};
				}
				return persistedState as StoreState;
			},
		}
	)
);

export type {
	Experiment,
	Job,
	JobWithHistory,
	JobStatusUpdate,
	JobStatus,
	ModelType,
	JobParameters,
	JobHistory,
} from "@/types";
