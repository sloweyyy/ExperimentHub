import { experimentApi, jobApi } from "@/lib/api";
import axios from "axios";

// Mock axios at the module level so every import gets the mock
jest.mock("axios", () => {
  const mockGet = jest.fn().mockResolvedValue({ data: [] });
  const mockPost = jest.fn().mockResolvedValue({ data: {} });
  const mockDelete = jest.fn().mockResolvedValue({ data: undefined });

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => ({
        get: mockGet,
        post: mockPost,
        delete: mockDelete,
      })),
    },
  };
});

// Grab a reference to the mocked axios instance methods
const mockAxiosInstance = (axios.create as jest.Mock).mock.results[0].value;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// experimentApi
// ---------------------------------------------------------------------------

describe("experimentApi", () => {
  it("getAll calls GET /experiments/", async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: [{ id: 1 }] });

    const result = await experimentApi.getAll();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith("/experiments/");
    expect(result).toEqual([{ id: 1 }]);
  });

  it("create calls POST /experiments/ with data", async () => {
    const payload = { name: "Exp 1", description: "desc" };
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 1, ...payload } });

    const result = await experimentApi.create(payload);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith("/experiments/", payload);
    expect(result).toEqual({ id: 1, ...payload });
  });
});

// ---------------------------------------------------------------------------
// jobApi
// ---------------------------------------------------------------------------

describe("jobApi", () => {
  it("getAll calls GET /jobs/", async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });

    const result = await jobApi.getAll();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith("/jobs/", { params: {} });
    expect(result).toEqual([]);
  });

  it("getAll with experimentId passes params", async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: [{ id: "j1" }] });

    const result = await jobApi.getAll(42);

    expect(mockAxiosInstance.get).toHaveBeenCalledWith("/jobs/", {
      params: { experiment_id: 42 },
    });
    expect(result).toEqual([{ id: "j1" }]);
  });

  it("cancel calls POST /jobs/{id}/cancel", async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({ data: undefined });

    await jobApi.cancel("job-123");

    expect(mockAxiosInstance.post).toHaveBeenCalledWith("/jobs/job-123/cancel");
  });
});
