import { env } from "@/lib/env";

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

// Isomorphic fetch wrapper for the NestJS API. Deliberately has no knowledge
// of NextAuth/sessions — callers resolve the token (via `auth()` on the
// server, or `useSession()` on the client) and pass it in explicitly.
async function apiFetch<T>(
  path: string,
  { token, body, headers, ...init }: ApiFetchOptions = {}
): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
