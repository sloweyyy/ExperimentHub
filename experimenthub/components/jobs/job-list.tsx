import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Clock,
	CheckCircle2,
	AlertCircle,
	Loader2,
	ArrowRight,
	XCircle,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { wsService, jobApi, JobStatus } from "@/lib/api";
import { useStore, JobStatusUpdate } from "@/lib/store";
import { formatDuration } from "@/lib/utils";

interface JobListProps {
	experimentId: number;
}

type GlobalJobStatus = JobStatus & {
	[key: string]: unknown;
};

export function JobList({ experimentId }: JobListProps) {
	const router = useRouter();
	const { jobs, jobStatus, updateJobStatus, removeJob } = useStore();

	console.log(
		"All jobs:",
		jobs.map((j) => ({
			id: j.id,
			job_id: j.job_id,
			name: j.name,
			exp_id: j.experiment_id,
		}))
	);
	console.log("Current experiment ID:", experimentId);

	const uniqueJobIds = new Set();
	const experimentJobs = jobs
		.filter((job) => {
			const match = job.experiment_id === experimentId;
			console.log(
				`Job ${job.name} (${job.job_id}) experiment_id: ${job.experiment_id}, matches ${experimentId}? ${match}`
			);
			return match;
		})
		.filter((job) => {
			if (uniqueJobIds.has(job.job_id)) {
				console.warn(
					`Duplicate job_id found: ${job.job_id} for job ${job.name}. Filtering out duplicate.`
				);
				return false;
			}
			uniqueJobIds.add(job.job_id);
			return true;
		});

	console.log(
		"Filtered experiment jobs:",
		experimentJobs.map((j) => ({ id: j.id, job_id: j.job_id, name: j.name }))
	);

	const sortedJobs = [...experimentJobs].sort((a, b) => {
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	});

	useEffect(() => {
		wsService.connect();

		const globalHandler = (data: GlobalJobStatus) => {
			if (data.job_id) {
				let bestAccuracy: number | undefined = undefined;
				if (data.final_results && typeof data.final_results === "object") {
					const results = data.final_results as Record<string, unknown>;
					if ("accuracy" in results && typeof results.accuracy === "number") {
						bestAccuracy = results.accuracy;
					}
				}

				const statusUpdate: JobStatusUpdate = {
					job_id: data.job_id,
					status: data.status,
					epoch: data.epoch ?? 0,
					epochs_total: data.epochs_total ?? 0,
					train_loss: data.train_loss,
					val_loss: data.val_loss,
					train_accuracy: data.train_accuracy,
					val_accuracy: data.val_accuracy,
					epoch_time: data.progress ?? 0,
					best_accuracy: bestAccuracy,
				};

				updateJobStatus(data.job_id, statusUpdate);
			}
		};

		wsService.registerHandler(
			"global",
			globalHandler as (data: JobStatus) => void
		);

		return () => {
			wsService.disconnect();
		};
	}, [updateJobStatus]);

	const getJobStats = (jobId: string) => {
		const status = jobStatus[jobId];
		const job = experimentJobs.find((job) => job.job_id === jobId);

		if (!job) return { currentEpoch: 0, totalEpochs: 0 };

		if (!status) {
			return {
				currentEpoch: job.epochs_completed,
				totalEpochs: job.parameters.epochs,
			};
		}

		return {
			currentEpoch: status.epoch || job.epochs_completed,
			totalEpochs: status.epochs_total || job.parameters.epochs,
		};
	};

	const renderStatusBadge = (status: string) => {
		switch (status) {
			case "pending":
				return (
					<Badge variant="outline" className="flex items-center gap-1">
						<Clock className="h-3 w-3" />
						Pending
					</Badge>
				);
			case "running":
				return (
					<Badge variant="secondary" className="flex items-center gap-1">
						<Loader2 className="h-3 w-3 animate-spin" />
						Running
					</Badge>
				);
			case "completed":
				return (
					<Badge className="bg-green-500 text-white flex items-center gap-1">
						<CheckCircle2 className="h-3 w-3" />
						Completed
					</Badge>
				);
			case "failed":
				return (
					<Badge variant="destructive" className="flex items-center gap-1">
						<AlertCircle className="h-3 w-3" />
						Failed
					</Badge>
				);
			default:
				return <Badge>{status}</Badge>;
		}
	};

	const handleViewDetails = (jobId: string) => {
		router.push(`/jobs/${jobId}`);
	};

	const handleCancelJob = async (jobId: string) => {
		try {
			await jobApi.cancel(jobId);
			toast.success("Job cancelled successfully");
		} catch (error) {
			console.error("Error cancelling job:", error);
			toast.error("Failed to cancel job", {
				description: "There was an error cancelling the job. Please try again.",
			});
		}
	};

	const handleDeleteJob = async (jobId: string) => {
		try {
			await jobApi.delete(jobId);
			removeJob(jobId);
			toast.success("Job deleted successfully");
		} catch (error) {
			console.error("Error deleting job:", error);
			toast.error("Failed to delete job", {
				description: "There was an error deleting the job. Please try again.",
			});
		}
	};

	return (
		<div className="w-full space-y-4 rounded-md border">
			{sortedJobs.length === 0 ? (
				<div className="text-center py-10">
					<p className="text-muted-foreground">
						No jobs found for this experiment.
					</p>
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[200px]">Name</TableHead>
							<TableHead className="w-[100px]">Status</TableHead>
							<TableHead className="w-[150px]">Model</TableHead>
							<TableHead className="w-[100px]">Accuracy</TableHead>
							<TableHead className="w-[120px]">Training Time</TableHead>
							<TableHead className="w-[150px]">Progress</TableHead>
							<TableHead className="w-[180px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedJobs.map((job) => {
							const stats = getJobStats(job.job_id);
							const canCancel =
								job.status === "running" || job.status === "pending";

							return (
								<TableRow key={`${job.id}-${job.job_id}`}>
									<TableCell className="font-medium">{job.name}</TableCell>
									<TableCell>{renderStatusBadge(job.status)}</TableCell>
									<TableCell>
										{job.model_type.toUpperCase()}
										<div className="text-xs text-muted-foreground mt-1">
											{job.parameters.optimizer.toUpperCase()} | LR:{" "}
											{job.parameters.learning_rate} | BS:{" "}
											{job.parameters.batch_size}
										</div>
									</TableCell>
									<TableCell>
										{job.best_accuracy !== null &&
										job.best_accuracy !== undefined
											? `${job.best_accuracy.toFixed(2)}%`
											: "—"}
									</TableCell>
									<TableCell>
										{job.total_time !== null && job.total_time !== undefined
											? formatDuration(job.total_time)
											: "—"}
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											<div className="text-xs">
												Epoch {stats.currentEpoch || 0}/{stats.totalEpochs}
											</div>
											<div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
												<div
													className="bg-blue-600 h-2.5 rounded-full"
													style={{
														width: `${
															(stats.currentEpoch / stats.totalEpochs) * 100
														}%`,
													}}
												></div>
											</div>
										</div>
									</TableCell>
									<TableCell className="flex items-center justify-end gap-2">
										{canCancel && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleCancelJob(job.job_id)}
												className="px-2"
												title="Cancel Job"
											>
												<XCircle className="h-4 w-4" />
											</Button>
										)}
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDeleteJob(job.job_id)}
											className="px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
											title="Delete Job"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleViewDetails(job.job_id)}
										>
											Details <ArrowRight className="h-4 w-4 ml-1" />
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
