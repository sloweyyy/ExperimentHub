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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ExperimentsPage() {
	const { experiments, setExperiments, removeExperiment } = useStore();
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

	const handleDeleteExperiment = async (experimentId: number) => {
		try {
			await experimentApi.delete(experimentId);
			removeExperiment(experimentId);
			toast.success("Experiment deleted successfully");
		} catch (error) {
			console.error("Error deleting experiment:", error);
			toast.error("Failed to delete experiment", {
				description:
					"There was an error deleting the experiment. Please try again.",
			});
		}
	};

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
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleDeleteExperiment(experiment.id)}
												className="px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
												title="Delete Experiment"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
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
