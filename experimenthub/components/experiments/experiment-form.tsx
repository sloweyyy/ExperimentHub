import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { experimentApi } from "@/lib/api";
import { useStore } from "@/lib/store";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExperimentFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ExperimentForm({ open, onOpenChange }: ExperimentFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { setExperiments, experiments } = useStore();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
		},
	});

	const onSubmit = async (data: FormValues) => {
		setIsSubmitting(true);
		try {
			const experiment = await experimentApi.create(data);

			setExperiments([...experiments, experiment]);

			toast.success("Experiment created successfully");

			form.reset();
			onOpenChange(false);
		} catch (error) {
			console.error("Error creating experiment:", error);
			toast.error("Failed to create experiment");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create New Experiment</DialogTitle>
				</DialogHeader>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							{...form.register("name")}
							placeholder="MNIST Classification"
						/>
						{form.formState.errors.name && (
							<p className="text-sm text-red-500">
								{form.formState.errors.name.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Input
							id="description"
							{...form.register("description")}
							placeholder="Experiment to find the best model for MNIST classification"
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Experiment"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
