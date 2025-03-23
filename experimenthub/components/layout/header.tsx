import Link from "next/dist/client/app-dir/link";
import { Button } from "../ui/button";

export function Header() {
	return (
		<header className="bg-background border-b">
			<div className="container flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 mx-auto">
				<Link href="/" className="font-bold text-2xl">
					Experiment Hub
				</Link>
				<nav className="flex items-center gap-4">
					<Link href="/" legacyBehavior>
						<Button variant="ghost">Dashboard</Button>
					</Link>
					<Link href="/experiments" legacyBehavior>
						<Button variant="ghost">Experiments</Button>
					</Link>
					<Link href="/jobs" legacyBehavior>
						<Button variant="ghost">Jobs</Button>
					</Link>
				</nav>
			</div>
		</header>
	);
}
