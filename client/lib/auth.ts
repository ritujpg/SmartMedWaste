import { apiGet, apiPost, clearAccessToken, getAccessToken, setAccessToken } from "@/lib/api";

export type UserRole = "facility" | "collector" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  phone?: string;
  is_active?: boolean;
};

type BackendUser = Omit<SessionUser, "role"> & {
  role: "facility" | "collector" | "administrator";
};

type AuthResponse = {
  access_token?: string;
  token_type?: string;
  user: BackendUser;
};

const SESSION_KEY = "smartmedwaste.session";

function normalizeRole(role: BackendUser["role"]): UserRole {
  return role === "administrator" ? "admin" : role;
}

function mapUser(user: BackendUser): SessionUser {
  return { ...user, role: normalizeRole(user.role) };
}

function saveSession(user: SessionUser): SessionUser {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function getSession(): SessionUser | null {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored || !getAccessToken()) return null;
  try {
    return JSON.parse(stored) as SessionUser;
  } catch {
    signOut();
    return null;
  }
}

export async function restoreSession(): Promise<SessionUser | null> {
  if (!getAccessToken()) return null;
  try {
    return saveSession(mapUser(await apiGet<BackendUser>("/api/auth/me")));
  } catch {
    signOut();
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const response = await apiPost<AuthResponse>("/api/auth/login", { email, password });
  if (!response.access_token) throw new Error("The backend did not return an access token.");
  setAccessToken(response.access_token);
  return saveSession(mapUser(response.user));
}

export async function signUp(input: { name: string; email: string; password: string; role: UserRole; organization: string }): Promise<SessionUser> {
  const response = await apiPost<AuthResponse>("/api/auth/signup", {
    ...input,
    role: input.role === "admin" ? "administrator" : input.role,
  });
  return response.access_token
    ? (setAccessToken(response.access_token), saveSession(mapUser(response.user)))
    : signIn(input.email, input.password);
}

export function signOut(): void {
  clearAccessToken();
  localStorage.removeItem(SESSION_KEY);
}
