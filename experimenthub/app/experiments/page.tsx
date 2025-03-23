"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExperimentForm } from "@/components/experiments/experiment-form";
import { PageLayout } from "@/components/layout/page-layout";
import { experimentApi } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function ExperimentsPage() {
	const { experiments, setExperiments } = useStore();
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchExperiments = async () => {
			try {
				const data = await experimentApi.getAll();
				setExperiments(data);
				setIsLoading(false);
			} catch (error) {
				console.error("Error fetching experiments:", error);
				setIsLoading(false);
			}
		};

		fetchExperiments();
	}, [setExperiments]);

	return (
		<PageLayout>
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold">Experiments</h1>
					<Button onClick={() => setIsFormOpen(true)}>Create Experiment</Button>
				</div>

				{isLoading ? (
					<div className="flex justify-center py-12">
						<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
					</div>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{experiments.length > 0 ? (
							experiments.map((experiment) => (
								<Card key={experiment.id}>
									<CardHeader>
										<CardTitle>{experiment.name}</CardTitle>
										<CardDescription>
											{experiment.description || "No description provided."}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="flex justify-between items-center">
											<p className="text-sm text-muted-foreground">
												Created on{" "}
												{new Date(experiment.created_at).toLocaleDateString()}
											</p>
											<Link href={`/experiments/${experiment.id}`}>
												<Button variant="outline" size="sm">
													View Details
												</Button>
											</Link>
										</div>
									</CardContent>
								</Card>
							))
						) : (
							<Card className="col-span-full">
								<CardHeader>
									<CardTitle>No Experiments Found</CardTitle>
									<CardDescription>
										Get started by creating your first experiment.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Button onClick={() => setIsFormOpen(true)}>
										Create Experiment
									</Button>
								</CardContent>
							</Card>
						)}
					</div>
				)}
			</div>

			<ExperimentForm open={isFormOpen} onOpenChange={setIsFormOpen} />
		</PageLayout>
	);
}
