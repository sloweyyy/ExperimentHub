import { Experiment, Job, JobWithHistory, JobStatusUpdate } from "../store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function fetchWithErrorHandling<T>(
	url: string,
	options: RequestInit = {}
): Promise<T> {
	try {
		const response = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...(options.headers || {}),
			},
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || "API request failed");
		}

		return await response.json();
	} catch (error) {
		console.error(`API error for ${url}:`, error);
		throw error;
	}
}

export const experimentApi = {
	getAll: async (): Promise<Experiment[]> => {
		return fetchWithErrorHandling<Experiment[]>(`${API_URL}/experiments`);
	},

	getById: async (id: string): Promise<Experiment> => {
		return fetchWithErrorHandling<Experiment>(`${API_URL}/experiments/${id}`);
	},

	create: async (
		experiment: Omit<Experiment, "id" | "created_at">
	): Promise<Experiment> => {
		return fetchWithErrorHandling<Experiment>(`${API_URL}/experiments`, {
			method: "POST",
			body: JSON.stringify(experiment),
		});
	},

	update: async (
		id: string,
		experiment: Partial<Experiment>
	): Promise<Experiment> => {
		return fetchWithErrorHandling<Experiment>(`${API_URL}/experiments/${id}`, {
			method: "PUT",
			body: JSON.stringify(experiment),
		});
	},

	delete: async (id: string): Promise<void> => {
		return fetchWithErrorHandling<void>(`${API_URL}/experiments/${id}`, {
			method: "DELETE",
		});
	},
};

export const jobApi = {
	getAll: async (experimentId?: number): Promise<Job[]> => {
		const url = experimentId
			? `${API_URL}/experiments/${experimentId}/jobs`
			: `${API_URL}/jobs`;
		return fetchWithErrorHandling<Job[]>(url);
	},

	getById: async (id: string): Promise<JobWithHistory> => {
		return fetchWithErrorHandling<JobWithHistory>(`${API_URL}/jobs/${id}`);
	},

	create: async (
		job: Omit<Job, "id" | "created_at" | "status">
	): Promise<Job> => {
		return fetchWithErrorHandling<Job>(`${API_URL}/jobs`, {
			method: "POST",
			body: JSON.stringify(job),
		});
	},

	start: async (id: string): Promise<Job> => {
		return fetchWithErrorHandling<Job>(`${API_URL}/jobs/${id}/start`, {
			method: "POST",
		});
	},

	stop: async (id: string): Promise<Job> => {
		return fetchWithErrorHandling<Job>(`${API_URL}/jobs/${id}/stop`, {
			method: "POST",
		});
	},

	delete: async (id: string): Promise<void> => {
		return fetchWithErrorHandling<void>(`${API_URL}/jobs/${id}`, {
			method: "DELETE",
		});
	},
};

export const wsService = {
	socket: null as WebSocket | null,
	handlers: new Map<string, (data: JobStatusUpdate) => void>(),
	isConnected: false,

	connect: function () {
		if (this.isConnected && this.socket) return;

		const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000/ws";
		this.socket = new WebSocket(wsUrl);

		this.socket.onopen = () => {
			console.log("WebSocket connected");
			this.isConnected = true;
		};

		this.socket.onclose = () => {
			console.log("WebSocket disconnected");
			this.isConnected = false;

			setTimeout(() => this.connect(), 3000);
		};

		this.socket.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		this.socket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as JobStatusUpdate;
				if (data && data.job_id) {
					const handler = this.handlers.get(data.job_id);
					if (handler) {
						handler(data);
					}
				}
			} catch (error) {
				console.error("Error parsing WebSocket message:", error);
			}
		};
	},

	registerHandler: function (
		jobId: string,
		handler: (data: JobStatusUpdate) => void
	) {
		this.handlers.set(jobId, handler);
	},

	unregisterHandler: function (jobId: string) {
		this.handlers.delete(jobId);
	},

	disconnect: function () {
		if (this.socket) {
			this.socket.close();
			this.socket = null;
			this.isConnected = false;
		}
	},
};
