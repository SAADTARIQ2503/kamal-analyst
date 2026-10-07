import type { z } from "zod";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  init?: { method?: "GET" | "POST"; body?: unknown },
): Promise<z.infer<S>> {
  const response = await fetch(`/api${path}`, {
    method: init?.method ?? "GET",
    credentials: "same-origin",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) {
    return undefined as z.infer<S>;
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload === "object" && payload && "detail" in payload && typeof payload.detail === "string" ? payload.detail : "Request failed.";
    throw new ApiError(response.status, detail);
  }
  return schema.parse(payload);
}

export async function apiPost(path: string, method: "POST" | "DELETE" = "POST"): Promise<void> {
  const response = await fetch(`/api${path}`, { method, credentials: "same-origin" });
  if (!response.ok) {
    throw new ApiError(response.status, "Request failed.");
  }
}
