import { useState, useEffect } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Clock,
	CheckCircle2,
	AlertCircle,
	Loader2,
	LineChart,
	BarChart,
	Settings,
	RefreshCw,
} from "lucide-react";
import {
	LineChart as RechartsLineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { jobApi, wsService } from "@/lib/api";
import { useStore, JobWithHistory, JobParameters } from "@/lib/store";
import { formatDuration } from "@/lib/utils";

interface JobDetailsProps {
	jobId: string;
}

export function JobDetails({ jobId }: JobDetailsProps) {
	const [activeTab, setActiveTab] = useState("overview");
	const { jobsWithHistory, jobStatus, updateJobStatus, setJobHistory } =
		useStore();
	const [loading, setLoading] = useState(true);

	const job = jobsWithHistory[jobId];
	const realTimeStatus = jobStatus[jobId];

	useEffect(() => {
		const fetchJob = async () => {
			try {
				const jobData = await jobApi.getById(jobId);
				setJobHistory(jobId, jobData);
				setLoading(false);
			} catch (error) {
				console.error("Error fetching job details:", error);
				setLoading(false);
			}
		};

		if (!job || !job.history) {
			fetchJob();
		} else {
			setLoading(false);
		}

		wsService.connect();

		wsService.registerHandler(jobId, (data) => {
			updateJobStatus(jobId, data);
		});

		return () => {
			wsService.unregisterHandler(jobId);
		};
	}, [jobId, job, setJobHistory, updateJobStatus]);

	const formatParameters = (params: JobParameters) => {
		const modelSpecificParams: Record<string, string[]> = {
			cnn: ["kernel_size"],
			mlp: ["num_layers"],
			rnn: ["num_layers"],
		};

		const commonParams = [
			"model_type",
			"optimizer",
			"learning_rate",
			"batch_size",
			"epochs",
			"dropout_rate",
			"hidden_size",
			"use_scheduler",
		];

		const specificParams = modelSpecificParams[params.model_type] || [];

		return Object.entries(params)
			.filter(([key]) => {
				return commonParams.includes(key) || specificParams.includes(key);
			})
			.map(([key, value]) => {
				const formattedKey = key
					.replace(/_/g, " ")
					.replace(
						/\w\S*/g,
						(txt) => txt.charAt(0).toUpperCase() + txt.substr(1)
					);

				let formattedValue = value;
				if (typeof value === "boolean") {
					formattedValue = value ? "Yes" : "No";
				} else if (typeof value === "number" && key === "learning_rate") {
					formattedValue = value.toExponential(4);
				}

				return { key: formattedKey, value: formattedValue };
			});
	};

	const prepareChartData = (job: JobWithHistory) => {
		if (!job.history) return [];

		return Array.from({ length: job.history.train_loss.length }, (_, i) => ({
			epoch: i + 1,
			trainLoss: job.history?.train_loss[i],
			valLoss: job.history?.val_loss[i],
			trainAccuracy: job.history?.train_accuracy[i],
			valAccuracy: job.history?.val_accuracy[i],
			epochTime: job.history?.epoch_times[i],
		}));
	};

	const getProgress = () => {
		if (!job) return 0;

		if (job.status === "completed") return 100;
		if (job.status === "failed") return 0;

		if (realTimeStatus && realTimeStatus.epoch && realTimeStatus.epochs_total) {
			return (realTimeStatus.epoch / realTimeStatus.epochs_total) * 100;
		}

		return (job.epochs_completed / job.parameters.epochs) * 100;
	};

	const renderStatusBadge = (status: string) => {
		switch (status) {
			case "completed":
				return (
					<Badge className="bg-green-500">
						<CheckCircle2 className="h-3 w-3 mr-1" />
						Completed
					</Badge>
				);
			case "running":
				return (
					<Badge className="bg-blue-500">
						<Loader2 className="h-3 w-3 mr-1 animate-spin" />
						Running
					</Badge>
				);
			case "failed":
				return (
					<Badge className="bg-red-500">
						<AlertCircle className="h-3 w-3 mr-1" />
						Failed
					</Badge>
				);
			default:
				return (
					<Badge className="bg-gray-500">
						<Clock className="h-3 w-3 mr-1" />
						Pending
					</Badge>
				);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-48">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!job) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>Error</AlertTitle>
				<AlertDescription>
					Could not load job details. Job might not exist.
				</AlertDescription>
			</Alert>
		);
	}

	const chartData = prepareChartData(job);
	const parameters = formatParameters(job.parameters);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2">
				<div className="flex justify-between items-start">
					<div>
						<h1 className="text-2xl font-bold">{job.name}</h1>
						<div className="flex items-center gap-2 mt-2">
							<div className="text-sm text-muted-foreground">
								Model:{" "}
								<span className="font-semibold">
									{job.model_type.toUpperCase()}
								</span>
							</div>
							<div className="text-sm text-muted-foreground">
								Created:{" "}
								<span className="font-semibold">
									{new Date(job.created_at).toLocaleString()}
								</span>
							</div>
							{renderStatusBadge(job.status)}
						</div>
					</div>
				</div>

				<div className="mt-4">
					<Progress value={getProgress()} className="h-2" />
					<div className="flex justify-between mt-1 text-sm text-muted-foreground">
						<span>
							{job.epochs_completed} / {job.parameters.epochs} epochs
						</span>
						<span>{getProgress().toFixed(0)}%</span>
					</div>
				</div>
			</div>

			<Tabs
				defaultValue="overview"
				value={activeTab}
				onValueChange={setActiveTab}
				className="w-full"
			>
				<TabsList className="grid grid-cols-3 w-full">
					<TabsTrigger value="overview">
						<LineChart className="h-4 w-4 mr-2" />
						Overview
					</TabsTrigger>
					<TabsTrigger value="metrics">
						<BarChart className="h-4 w-4 mr-2" />
						Metrics
					</TabsTrigger>
					<TabsTrigger value="parameters">
						<Settings className="h-4 w-4 mr-2" />
						Parameters
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Best Accuracy
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{job.best_accuracy !== null && job.best_accuracy !== undefined
										? `${job.best_accuracy.toFixed(2)}%`
										: "—"}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Total Training Time
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{job.total_time ? formatDuration(job.total_time) : "—"}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">Epochs</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{job.epochs_completed} / {job.parameters.epochs}
								</div>
							</CardContent>
						</Card>
					</div>

					{job.history && (
						<Card>
							<CardHeader>
								<CardTitle>Training Progress</CardTitle>
								<CardDescription>Accuracy and loss over epochs</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="h-[300px]">
									<ResponsiveContainer width="100%" height="100%">
										<RechartsLineChart
											data={chartData}
											margin={{
												top: 5,
												right: 30,
												left: 20,
												bottom: 5,
											}}
										>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="epoch" />
											<YAxis yAxisId="left" />
											<YAxis yAxisId="right" orientation="right" />
											<Tooltip />
											<Legend />
											<Line
												yAxisId="right"
												type="monotone"
												dataKey="trainAccuracy"
												name="Training Accuracy"
												stroke="#4ade80"
												activeDot={{ r: 8 }}
											/>
											<Line
												yAxisId="right"
												type="monotone"
												dataKey="valAccuracy"
												name="Validation Accuracy"
												stroke="#2563eb"
												activeDot={{ r: 8 }}
											/>
											<Line
												yAxisId="left"
												type="monotone"
												dataKey="trainLoss"
												name="Training Loss"
												stroke="#f97316"
											/>
											<Line
												yAxisId="left"
												type="monotone"
												dataKey="valLoss"
												name="Validation Loss"
												stroke="#ef4444"
											/>
										</RechartsLineChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				{/* Metrics Tab */}
				<TabsContent value="metrics" className="space-y-4">
					{job.history ? (
						<>
							{/* Accuracy Chart */}
							<Card>
								<CardHeader>
									<CardTitle>Accuracy</CardTitle>
									<CardDescription>
										Training and validation accuracy over epochs
									</CardDescription>
								</CardHeader>
								<CardContent className="pt-0">
									<div className="h-[300px]">
										<ResponsiveContainer width="100%" height="100%">
											<RechartsLineChart
												data={chartData}
												margin={{
													top: 5,
													right: 30,
													left: 20,
													bottom: 5,
												}}
											>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis dataKey="epoch" />
												<YAxis />
												<Tooltip />
												<Legend />
												<Line
													type="monotone"
													dataKey="trainAccuracy"
													name="Training Accuracy"
													stroke="#4ade80"
													activeDot={{ r: 8 }}
												/>
												<Line
													type="monotone"
													dataKey="valAccuracy"
													name="Validation Accuracy"
													stroke="#2563eb"
													activeDot={{ r: 8 }}
												/>
											</RechartsLineChart>
										</ResponsiveContainer>
									</div>
								</CardContent>
							</Card>

							{/* Loss Chart */}
							<Card>
								<CardHeader>
									<CardTitle>Loss</CardTitle>
									<CardDescription>
										Training and validation loss over epochs
									</CardDescription>
								</CardHeader>
								<CardContent className="pt-0">
									<div className="h-[300px]">
										<ResponsiveContainer width="100%" height="100%">
											<RechartsLineChart
												data={chartData}
												margin={{
													top: 5,
													right: 30,
													left: 20,
													bottom: 5,
												}}
											>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis dataKey="epoch" />
												<YAxis />
												<Tooltip />
												<Legend />
												<Line
													type="monotone"
													dataKey="trainLoss"
													name="Training Loss"
													stroke="#f97316"
													activeDot={{ r: 8 }}
												/>
												<Line
													type="monotone"
													dataKey="valLoss"
													name="Validation Loss"
													stroke="#ef4444"
													activeDot={{ r: 8 }}
												/>
											</RechartsLineChart>
										</ResponsiveContainer>
									</div>
								</CardContent>
							</Card>

							{/* Epoch Time Chart */}
							<Card>
								<CardHeader>
									<CardTitle>Epoch Time</CardTitle>
									<CardDescription>Time taken per epoch</CardDescription>
								</CardHeader>
								<CardContent className="pt-0">
									<div className="h-[300px]">
										<ResponsiveContainer width="100%" height="100%">
											<RechartsLineChart
												data={chartData}
												margin={{
													top: 5,
													right: 30,
													left: 20,
													bottom: 5,
												}}
											>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis dataKey="epoch" />
												<YAxis />
												<Tooltip />
												<Legend />
												<Line
													type="monotone"
													dataKey="epochTime"
													name="Epoch Time (s)"
													stroke="#a855f7"
													activeDot={{ r: 8 }}
												/>
											</RechartsLineChart>
										</ResponsiveContainer>
									</div>
								</CardContent>
							</Card>
						</>
					) : (
						<Alert>
							<RefreshCw className="h-4 w-4" />
							<AlertTitle>No Metrics Available</AlertTitle>
							<AlertDescription>
								{job.status === "completed"
									? "No training metrics were recorded for this job."
									: "Metrics will be available once training starts."}
							</AlertDescription>
						</Alert>
					)}
				</TabsContent>

				{/* Parameters Tab */}
				<TabsContent value="parameters" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Model Parameters</CardTitle>
							<CardDescription>
								Configuration used for this training job
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
								{parameters.map((param) => (
									<div key={param.key} className="flex justify-between">
										<span className="text-muted-foreground">{param.key}:</span>
										<span className="font-semibold">
											{param.value?.toString()}
										</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
