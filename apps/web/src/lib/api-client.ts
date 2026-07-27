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
  /** NextAuth accessToken (the NestJS-issued JWT), forwarded as a Bearer token. */
  token?: string;
  body?: unknown;
}

// A backend hang (e.g. a stalled SMTP call — see mail.service.ts) would
// otherwise leave callers' `isPending` state stuck forever with no error,
// which reads to the user as a dead "Loading…" button. Every request gets
// a hard ceiling unless the caller passes its own `signal`.
const DEFAULT_TIMEOUT_MS = 20_000;

// Isomorphic fetch wrapper for the NestJS API. Deliberately has no knowledge
// of NextAuth/sessions — callers resolve the token (via `auth()` on the
// server, or `useSession()` on the client) and pass it in explicitly.
async function apiFetch<T>(
  path: string,
  { token, body, headers, ...init }: ApiFetchOptions = {}
): Promise<T> {
  // FormData (file uploads) must NOT be JSON-stringified, and must NOT get
  // an explicit Content-Type — the browser sets its own, with the
  // multipart boundary the server needs to parse it.
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
