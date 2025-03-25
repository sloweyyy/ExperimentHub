"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { experimentApi, jobApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { JobStatus } from "@/lib/store";
import {
	BarChart,
	Layers,
	Activity,
	Clock,
	CheckCircle2,
	AlertCircle,
	Loader2,
	TrendingUp,
	ArrowUpRight,
	ArrowRight,
} from "lucide-react";

export default function HomePage() {
	const { experiments, jobs, setExperiments, setJobs } = useStore();
	const [, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true);
			try {
				const [experimentsData, jobsData] = await Promise.all([
					experimentApi.getAll(),
					jobApi.getAll(),
				]);
				setExperiments(experimentsData);
				setJobs(jobsData);
			} catch (error) {
				console.error("Error fetching data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [setExperiments, setJobs]);

	const totalExperiments = experiments.length;
	const totalJobs = jobs.length;
	const completedJobs = jobs.filter((job) => job.status === "completed").length;
	const runningJobs = jobs.filter((job) => job.status === "running").length;
	const failedJobs = jobs.filter((job) => job.status === "failed").length;

	const bestJob = jobs
		.filter(
			(job) => job.best_accuracy !== undefined && job.best_accuracy !== null
		)
		.sort((a, b) => (b.best_accuracy || 0) - (a.best_accuracy || 0))[0];

	const recentJobs = [...jobs]
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)
		.slice(0, 5);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	};

	const renderStatusBadge = (status: JobStatus) => {
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

	return (
		<PageLayout>
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<div className="flex gap-3">
						<Link href="/experiments">
							<Button variant="outline">View All Experiments</Button>
						</Link>
						<Link href="/experiments">
							<Button>Create Experiment</Button>
						</Link>
					</div>
				</div>

				{/* Stats Overview */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<CardTitle className="text-sm font-medium">
								Total Experiments
							</CardTitle>
							<Layers className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{totalExperiments}</div>
							<p className="text-xs text-muted-foreground mt-1">
								ML Experiment groups
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
							<BarChart className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{totalJobs}</div>
							<div className="flex space-x-2 text-xs text-muted-foreground mt-1">
								<span className="text-green-500">
									{completedJobs} completed
								</span>
								<span>•</span>
								<span className="text-blue-500">{runningJobs} running</span>
								<span>•</span>
								<span className="text-red-500">{failedJobs} failed</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<CardTitle className="text-sm font-medium">
								Best Accuracy
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{bestJob ? `${bestJob.best_accuracy?.toFixed(2)}%` : "N/A"}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{bestJob
									? `Model: ${bestJob.model_type.toUpperCase()}`
									: "No completed jobs yet"}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
							<Activity className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{runningJobs}</div>
							<p className="text-xs text-muted-foreground mt-1">
								Currently running
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Recent Activity and Experiments */}
				<div className="grid gap-6 md:grid-cols-7">
					{/* Recent Activity */}
					<Card className="md:col-span-4">
						<CardHeader>
							<CardTitle>Recent Activity</CardTitle>
							<CardDescription>
								Your latest training jobs and experiments
							</CardDescription>
						</CardHeader>
						<CardContent>
							{recentJobs.length > 0 ? (
								<div className="space-y-4">
									{recentJobs.map((job) => (
										<div
											key={job.job_id}
											className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
										>
											<div className="flex flex-col">
												<div className="font-medium">{job.name}</div>
												<div className="text-sm text-muted-foreground flex items-center gap-2">
													<span>{job.model_type.toUpperCase()}</span>
													<span>•</span>
													<span>{formatDate(job.created_at)}</span>
												</div>
											</div>
											<div className="flex items-center gap-3">
												{renderStatusBadge(job.status)}
												<Link href={`/jobs/${job.job_id}`}>
													<Button
														variant="ghost"
														size="sm"
														className="p-0 h-8 w-8 rounded-full"
													>
														<ArrowRight className="h-4 w-4" />
													</Button>
												</Link>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-center py-6 text-muted-foreground">
									No jobs have been created yet.
								</div>
							)}
						</CardContent>
						{jobs.length > 0 && (
							<CardFooter className="flex justify-end">
								<Link href="/jobs">
									<Button variant="outline" size="sm" className="gap-1">
										View All Jobs
										<ArrowUpRight className="h-3 w-3" />
									</Button>
								</Link>
							</CardFooter>
						)}
					</Card>

					{/* Experiments Section */}
					<Card className="md:col-span-3">
						<CardHeader>
							<CardTitle>Recent Experiments</CardTitle>
							<CardDescription>Your latest experiment groups</CardDescription>
						</CardHeader>
						<CardContent>
							{experiments.length > 0 ? (
								<div className="space-y-4">
									{experiments
										.sort(
											(a, b) =>
												new Date(b.created_at).getTime() -
												new Date(a.created_at).getTime()
										)
										.slice(0, 3)
										.map((experiment) => (
											<Link
												href={`/experiments/${experiment.id}`}
												key={experiment.id}
												className="block"
											>
												<div className="p-3 rounded-lg border hover:border-primary hover:bg-accent transition-colors">
													<div className="font-medium">{experiment.name}</div>
													<div className="text-sm text-muted-foreground mt-1 line-clamp-1">
														{experiment.description ||
															"No description provided."}
													</div>
													<div className="text-xs text-muted-foreground mt-2">
														Created on{" "}
														{new Date(
															experiment.created_at
														).toLocaleDateString()}
													</div>
												</div>
											</Link>
										))}
								</div>
							) : (
								<div className="text-center py-6 text-muted-foreground">
									No experiments have been created yet.
								</div>
							)}
						</CardContent>
						{experiments.length > 0 && (
							<CardFooter className="flex justify-end">
								<Link href="/experiments">
									<Button variant="outline" size="sm" className="gap-1">
										View All Experiments
										<ArrowUpRight className="h-3 w-3" />
									</Button>
								</Link>
							</CardFooter>
						)}
					</Card>
				</div>

				{/* Getting Started Guide */}
				<Card>
					<CardHeader>
						<CardTitle>Getting Started</CardTitle>
						<CardDescription>
							Learn how to use Experiment Hub for ML experimentation.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-3">
						<div className="p-4 rounded-lg border">
							<div className="flex items-center gap-2 mb-2">
								<div className="bg-primary rounded-full h-6 w-6 flex items-center justify-center text-primary-foreground text-sm font-medium">
									1
								</div>
								<h3 className="font-semibold">Create an Experiment</h3>
							</div>
							<p className="text-sm text-muted-foreground">
								Start by creating an experiment to group related training jobs.
								This helps you organize different approaches to a problem.
							</p>
						</div>
						<div className="p-4 rounded-lg border">
							<div className="flex items-center gap-2 mb-2">
								<div className="bg-primary rounded-full h-6 w-6 flex items-center justify-center text-primary-foreground text-sm font-medium">
									2
								</div>
								<h3 className="font-semibold">Configure Training Jobs</h3>
							</div>
							<p className="text-sm text-muted-foreground">
								Add training jobs with different hyperparameters to find the
								best model. Try varying learning rates, batch sizes, and model
								architectures.
							</p>
						</div>
						<div className="p-4 rounded-lg border">
							<div className="flex items-center gap-2 mb-2">
								<div className="bg-primary rounded-full h-6 w-6 flex items-center justify-center text-primary-foreground text-sm font-medium">
									3
								</div>
								<h3 className="font-semibold">Compare Results</h3>
							</div>
							<p className="text-sm text-muted-foreground">
								Review and compare job results to identify the best performing
								model. Look at accuracy metrics, training curves, and
								convergence speed.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageLayout>
	);
}
