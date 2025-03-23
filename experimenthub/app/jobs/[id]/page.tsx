"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { JobDetails } from "@/components/jobs/job-details";
import { experimentApi, jobApi } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function JobDetailPage() {
	const params = useParams();
	const router = useRouter();
	const jobId = params.id ? params.id.toString() : "";
	const { jobs, setJobs, experiments, setExperiments, setActiveJob } =
		useStore();
	const [isLoading, setIsLoading] = useState(true);

	const job = jobs.find((j) => j.job_id === jobId);

	useEffect(() => {
		const fetchData = async () => {
			try {
				if (!job) {
					const jobData = await jobApi.getById(jobId);
					if (jobData) {
						setJobs([...jobs.filter((j) => j.job_id !== jobId), jobData]);

						setActiveJob(jobData);

						if (!experiments.find((e) => e.id === jobData.experiment_id)) {
							const experimentData = await experimentApi.getById(
								jobData.experiment_id.toString()
							);
							setExperiments([
								...experiments.filter((e) => e.id !== experimentData.id),
								experimentData,
							]);
						}
					}
				} else {
					setActiveJob(job);
				}

				setIsLoading(false);
			} catch (error) {
				console.error("Error fetching data:", error);
				setIsLoading(false);
			}
		};

		fetchData();

		return () => {
			setActiveJob(null);
		};
	}, [jobId, job, jobs, experiments, setJobs, setExperiments, setActiveJob]);

	if (isLoading || !job) {
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
				{/* Navigation */}
				<div className="flex items-center mb-6">
					<Button
						variant="ghost"
						onClick={() =>
							router.push(`/experiments/${job.experiment_id.toString()}`)
						}
						className="text-sm font-medium"
					>
						← Back to Experiment
					</Button>
				</div>

				{/* Job Details */}
				<JobDetails jobId={jobId} />
			</div>
		</PageLayout>
	);
}
