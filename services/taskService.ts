import { apiClient } from "@/services/apiClient";
import type { TaskMetrics } from "@/data/metrics";
import type { Task } from "@/data/tasks";

type CreateTaskPayload = {
  title: string;
  branch: string;
  category: string;
  vendor: string;
  description: string;
};

type UpdateTaskCostsPayload = {
  taskId: string;
  labourCost: number;
  installationCost: number;
  repairCost: number;
  extraCost: number;
  extraReason: string;
};

type UpdateTaskPayload = {
  taskId: string;
  title: string;
  branch: string;
  category: string;
  vendor: string;
  description: string;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const { headers: initHeaders, ...restInit } = init ?? {};
  const base = apiClient.getBaseUrl().replace(/\/$/, "");
  const url = `${base}${path}`;
  const response = await fetch(url, {
    ...restInit,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...apiClient.getLocationHeaders(),
      ...(initHeaders as Record<string, string> | undefined)
    }
  });

  if (!response.ok) {
    const raw = await response.text();
    const trimmed = raw.trim();
    if (trimmed.startsWith("<!") || trimmed.toLowerCase().startsWith("<html")) {
      const hint404 =
        response.status === 404
          ? " If this is a new route, restart the backend from the backend folder (npm start) so the latest server code is running."
          : "";
      throw new Error(
        `HTTP ${response.status} from ${url} returned HTML instead of JSON (wrong port, proxy, or API not running).${hint404} Start the API: cd backend && npm start. Use your PC's LAN IP in .env (same Wi-Fi as the phone), not localhost.`
      );
    }
    let message = raw || "Request failed";
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        message = parsed.message.trim();
      }
    } catch {
      /* keep raw body */
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const taskService = {
  getBranches: async (): Promise<string[]> => request<string[]>("/branches"),
  getVendors: async (): Promise<string[]> => request<string[]>("/vendors"),
  getTasks: async (): Promise<Task[]> => {
    const rows = await request<Array<Task & { hasInvoice?: boolean }>>("/tasks");
    return rows.map((r) => ({
      ...r,
      hasInvoice: Boolean(r.hasInvoice),
      invoiceOriginalName: r.invoiceOriginalName ?? null,
      invoiceUploadedAt: r.invoiceUploadedAt ?? null
    }));
  },
  /** Counts and costs for the current city only (server scopes by location headers). */
  getTaskMetrics: async (): Promise<TaskMetrics> => request<TaskMetrics>("/tasks/metrics"),
  createTask: async (payload: CreateTaskPayload): Promise<Task> =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateTaskCosts: async (payload: UpdateTaskCostsPayload): Promise<void> => {
    await request<{ ok: boolean }>(`/tasks/${payload.taskId}/costs`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  markTaskCompleted: async (taskId: string): Promise<void> => {
    await request<{ ok: boolean }>(`/tasks/${taskId}/complete`, {
      method: "PATCH"
    });
  },
  holdTask: async (taskId: string): Promise<void> => {
    await request<{ ok: boolean }>(`/tasks/${taskId}/hold`, {
      method: "PATCH"
    });
  },
  updateTask: async (payload: UpdateTaskPayload): Promise<Task> =>
    request<Task>(`/tasks/${payload.taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteTask: async (taskId: string): Promise<void> => {
    await request<{ ok: boolean }>(`/tasks/${taskId}/delete`, {
      method: "POST"
    });
  },

  /** Multipart upload; do not set Content-Type (boundary is set automatically). */
  uploadTaskInvoice: async (taskId: string, body: FormData): Promise<void> => {
    const base = apiClient.getBaseUrl().replace(/\/$/, "");
    const url = `${base}/tasks/${taskId}/invoice`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...apiClient.getLocationHeaders()
      },
      body
    });
    if (!response.ok) {
      const raw = await response.text();
      let message = raw || "Upload failed";
      try {
        const parsed = JSON.parse(raw) as { message?: string };
        if (typeof parsed.message === "string" && parsed.message.trim()) {
          message = parsed.message.trim();
        }
      } catch {
        /* keep */
      }
      throw new Error(message);
    }
  }
};
