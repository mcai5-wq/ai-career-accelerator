import { publicEnv } from "@/lib/env.public";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  token?: string;
  body?: unknown;
}

// Without this, a backend hang would leave callers' isPending state stuck
// forever with no error — reads to the user as a dead "Loading…" button.
const DEFAULT_TIMEOUT_MS = 20_000;

async function apiFetch<T>(
  path: string,
  { token, body, headers, ...init }: ApiFetchOptions = {}
): Promise<T> {
  // FormData must not be JSON-stringified or given an explicit Content-Type —
  // the browser sets its own, with the multipart boundary the server needs.
  const isFormData = body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ApiError(0, "That took too long. Please try again.");
    }
    throw error;
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => undefined);
    throw new ApiError(
      res.status,
      errorBody?.message ?? res.statusText,
      errorBody
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
