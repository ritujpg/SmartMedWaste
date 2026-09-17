export type ApiError = {
  status: number;
  detail: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "smartmedwaste.access_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Unable to reach the FastAPI server at ${API_BASE_URL}.`);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed with status ${response.status}`;
    if (response.status === 401) clearAccessToken();
    const error = new Error(detail) as Error & Partial<ApiError>;
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

export function apiPostForm<T>(path: string, body: FormData): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body });
}
