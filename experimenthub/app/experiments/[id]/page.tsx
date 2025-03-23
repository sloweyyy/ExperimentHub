"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { JobForm } from "@/components/jobs/job-form";
import { JobList } from "@/components/jobs/job-list";
import { experimentApi, jobApi } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function ExperimentDetailPage() {
	const params = useParams();
	const experimentId = Number(params.id);
	const { experiments, setExperiments, jobs, setJobs, setActiveExperiment } =
		useStore();
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const experiment = experiments.find((exp) => exp.id === experimentId);

	useEffect(() => {
		const fetchData = async () => {
			try {
				if (!experiment) {
					const experimentData = await experimentApi.getById(experimentId);
					setExperiments([
						...experiments.filter((exp) => exp.id !== experimentId),
						experimentData,
					]);
					setActiveExperiment(experimentData);
				} else {
					setActiveExperiment(experiment);
				}

				const jobsData = await jobApi.getAll(experimentId);
				setJobs(jobsData);

				setIsLoading(false);
			} catch (error) {
				console.error("Error fetching data:", error);
				setIsLoading(false);
			}
		};

		fetchData();

		return () => {
			setActiveExperiment(null);
		};
	}, [
		experimentId,
		experiment,
		experiments,
		setExperiments,
		setJobs,
		setActiveExperiment,
	]);

	if (isLoading || !experiment) {
		return (
			<PageLayout>
				<div className="flex justify-center py-12">
					<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout>
			<div className="space-y-6">
				{/* Experiment Header */}
				<div className="flex justify-between items-start">
					<div>
						<h1 className="text-3xl font-bold">{experiment.name}</h1>
						<p className="text-muted-foreground mt-1">
							{experiment.description || "No description provided."}
						</p>
						<p className="text-sm text-muted-foreground mt-2">
							Created on {new Date(experiment.created_at).toLocaleDateString()}
						</p>
					</div>
					<Button onClick={() => setIsFormOpen(true)}>Start New Job</Button>
				</div>

				{/* Overview Cards */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{
									jobs.filter((job) => job.experiment_id === experimentId)
										.length
								}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Best Accuracy
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{(() => {
									const experimentJobs = jobs.filter(
										(job) => job.experiment_id === experimentId
									);
									const bestAccuracy = experimentJobs.reduce((highest, job) => {
										const accuracy = job.best_accuracy || 0;
										return accuracy > highest ? accuracy : highest;
									}, 0);

									return bestAccuracy > 0
										? `${bestAccuracy.toFixed(2)}%`
										: "No data";
								})()}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Status</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{(() => {
									const experimentJobs = jobs.filter(
										(job) => job.experiment_id === experimentId
									);
									const runningJobs = experimentJobs.filter(
										(job) => job.status === "running"
									).length;
									const completedJobs = experimentJobs.filter(
										(job) => job.status === "completed"
									).length;

									if (runningJobs > 0) {
										return `${runningJobs} Running`;
									} else if (
										completedJobs === experimentJobs.length &&
										experimentJobs.length > 0
									) {
										return "Completed";
									} else if (experimentJobs.length === 0) {
										return "No Jobs";
									} else {
										return "In Progress";
									}
								})()}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Jobs List */}
				<div className="mt-8">
					<h2 className="text-xl font-semibold mb-4">Jobs</h2>
					<JobList experimentId={experimentId} />
				</div>
			</div>

			<JobForm
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				experiment={experiment}
			/>
		</PageLayout>
	);
}
