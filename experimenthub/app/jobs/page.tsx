"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { jobApi, experimentApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { JobList } from "@/components/jobs/job-list";
import { Experiment, Job } from "@/lib/store";

export default function JobsPage() {
	const { jobs, setJobs } = useStore();
	const [isLoading, setIsLoading] = useState(false);
	const [experiments, setExperiments] = useState<Experiment[]>([]);

	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true);
			try {
				const [jobsData, experimentsData] = await Promise.all([
					jobApi.getAll(),
					experimentApi.getAll(),
				]);
				setJobs(jobsData);
				setExperiments(experimentsData);
			} catch (error) {
				console.error("Error fetching data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [setJobs]);

	const jobsByExperiment: Record<number, Job[]> = jobs.reduce(
		(acc: Record<number, Job[]>, job) => {
			const experimentId = job.experiment_id;
			if (!acc[experimentId]) {
				acc[experimentId] = [];
			}
			acc[experimentId].push(job);
			return acc;
		},
		{}
	);

	const sortedExperimentIds = Object.keys(jobsByExperiment)
		.map((id) => parseInt(id, 10))
		.sort((a, b) => {
			const aJobs = jobsByExperiment[a];
			const bJobs = jobsByExperiment[b];
			const aLatest = new Date(aJobs[0].created_at).getTime();
			const bLatest = new Date(bJobs[0].created_at).getTime();
			return bLatest - aLatest;
		});

	const getExperimentName = (id: number) => {
		const experiment = experiments.find((exp) => exp.id === id);
		return experiment ? experiment.name : `Experiment ${id}`;
	};

	return (
		<PageLayout>
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold">All Jobs</h1>
					<Link href="/experiments">
						<Button>Create New Job</Button>
					</Link>
				</div>

				{isLoading ? (
					<div className="text-center py-10">
						<p className="text-muted-foreground">Loading jobs...</p>
					</div>
				) : jobs.length === 0 ? (
					<Card>
						<CardHeader>
							<CardTitle>No Jobs Found</CardTitle>
							<CardDescription>
								Start by creating an experiment and adding jobs to it.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/experiments">
								<Button>Create an Experiment</Button>
							</Link>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-6">
						{sortedExperimentIds.map((experimentId) => {
							const experimentName = getExperimentName(experimentId);

							return (
								<div key={experimentId} className="space-y-2">
									<div className="flex justify-between items-center">
										<h2 className="text-xl font-semibold">{experimentName}</h2>
										<Link href={`/experiments/${experimentId}`}>
											<Button variant="outline" size="sm">
												View Experiment
											</Button>
										</Link>
									</div>
									<JobList experimentId={experimentId} />
								</div>
							);
						})}
					</div>
				)}
			</div>
		</PageLayout>
	);
}
