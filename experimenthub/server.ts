import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const BACKEND_DIR = path.join(__dirname, "../backend");

try {
	execSync("python --version");
	console.log("Python is installed");
} catch {
	console.error(
		"Python is not installed. Please install Python to run the backend server."
	);
	process.exit(1);
}

if (!fs.existsSync(BACKEND_DIR)) {
	console.error(`Backend directory not found at ${BACKEND_DIR}`);
	process.exit(1);
}

try {
	console.log("Starting backend server...");
	console.log(`Working directory: ${BACKEND_DIR}`);

	const cmd = "python run_server.py";

	execSync(cmd, {
		cwd: BACKEND_DIR,
		stdio: "inherit",
	});
} catch (error) {
	console.error("Failed to start backend server:", error);
	process.exit(1);
}
