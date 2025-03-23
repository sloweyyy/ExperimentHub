import { create } from "zustand";
import { persist } from "zustand/middleware";

export type JobStatus = "pending" | "running" | "completed" | "failed";

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
			setJobs: (jobs) => set({ jobs }),
			setActiveExperiment: (activeExperiment) => set({ activeExperiment }),
			setActiveJob: (activeJob) => set({ activeJob }),
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
		}
	)
);
