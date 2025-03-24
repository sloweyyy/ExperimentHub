import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

export const experimentApi = {
	getAll: async () => {
		const response = await api.get("/experiments/");
		return response.data;
	},

	getById: async (id: number) => {
		const response = await api.get(`/experiments/${id}`);
		return response.data;
	},

	create: async (data: { name: string; description?: string }) => {
		const response = await api.post("/experiments/", data);
		return response.data;
	},

	delete: async (id: number): Promise<void> => {
		await api.delete(`/experiments/${id}`);
	},
};

export const jobApi = {
	getAll: async (experimentId?: number) => {
		const params = experimentId ? { experiment_id: experimentId } : {};
		const response = await api.get("/jobs/", { params });
		return response.data;
	},

	getById: async (id: string) => {
		const response = await api.get(`/jobs/${id}`);
		return response.data;
	},

	create: async (data: {
		name: string;
		experiment_id: number;
		model_type: string;
		parameters: {
			model_type?: string;
			epochs: number;
			batch_size: number;
			learning_rate: number;
			optimizer: string;
			momentum?: number;
			dropout_rate?: number;
			hidden_size?: number;
			kernel_size?: number;
			use_scheduler?: boolean;
		};
	}) => {
		const response = await api.post("/jobs/", data);
		return response.data;
	},

	async delete(jobId: string): Promise<void> {
		await api.delete(`/jobs/${jobId}`);
	},

	async cancel(jobId: string): Promise<void> {
		await api.post(`/jobs/${jobId}/cancel`);
	},
};

export type JobStatus = {
	job_id: string;
	status: "pending" | "running" | "completed" | "failed";
	epoch?: number;
	epochs_total?: number;
	train_loss?: number;
	train_accuracy?: number;
	val_loss?: number;
	val_accuracy?: number;
	progress?: number;
	error?: string;
	final_results?: Record<string, unknown>;
};

export class WebSocketService {
	private socket: WebSocket | null = null;
	private clientId: string;
	private messageHandlers: Map<string, (data: JobStatus) => void> = new Map();

	constructor() {
		this.clientId = Math.random().toString(36).substring(2, 15);
	}

	connect() {
		if (this.socket?.readyState === WebSocket.OPEN) return;

		const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
		const wsUrl = apiUrl.replace(/^http/, "ws");

		try {
			this.socket = new WebSocket(`${wsUrl}/ws/${this.clientId}`);

			this.socket.onopen = () => {
				console.log("WebSocket connection established");
			};

			this.socket.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);
					const jobId = message.job_id;
					const data = message.data;

					if (this.messageHandlers.has(jobId)) {
						this.messageHandlers.get(jobId)!(data);
					}

					if (this.messageHandlers.has("global")) {
						this.messageHandlers.get("global")!(message);
					}
				} catch (error) {
					console.error("Error parsing WebSocket message:", error);
				}
			};

			this.socket.onerror = () => {
				console.warn("WebSocket connection error - will attempt to reconnect");
			};

			this.socket.onclose = (event) => {
				console.log(
					`WebSocket connection closed (code: ${event.code}, reason: ${
						event.reason || "No reason provided"
					})`
				);
				setTimeout(() => this.connect(), 5000);
			};
		} catch (err) {
			console.error("Failed to create WebSocket connection:", err);
			setTimeout(() => this.connect(), 5000);
		}
	}

	disconnect() {
		if (this.socket) {
			this.socket.close();
			this.socket = null;
		}
	}

	registerHandler(jobId: string, handler: (data: JobStatus) => void) {
		this.messageHandlers.set(jobId, handler);
	}

	unregisterHandler(jobId: string) {
		this.messageHandlers.delete(jobId);
	}
}

export const wsService = new WebSocketService();
