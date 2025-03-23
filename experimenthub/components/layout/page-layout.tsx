import { Header } from "./header";

interface PageLayoutProps {
	children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
	return (
		<div className="flex flex-col min-h-screen">
			<Header />
			<main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{children}
			</main>
			<footer className="border-t py-4">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
					© {new Date().getFullYear()} Experiment Hub - ML/DL Experiment
					Management
				</div>
			</footer>
		</div>
	);
}
