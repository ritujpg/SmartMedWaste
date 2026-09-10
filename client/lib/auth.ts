export type UserRole = "facility" | "collector" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
};

const SESSION_KEY = "smartmedwaste.session";

export const demoAccounts: Record<UserRole, SessionUser & { password: string }> = {
  facility: { id: "usr-facility-01", name: "Riya Kapoor", email: "facility@smartmedwaste.demo", password: "demo123", role: "facility", organization: "Apollo Hospitals" },
  collector: { id: "usr-collector-01", name: "Arjun Mehta", email: "collector@smartmedwaste.demo", password: "demo123", role: "collector", organization: "GreenRoute Logistics" },
  admin: { id: "usr-admin-01", name: "Ananya Rao", email: "admin@smartmedwaste.demo", password: "demo123", role: "admin", organization: "SmartMedWaste Operations" },
};

export function getSession(): SessionUser | null {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) as SessionUser : null;
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const account = Object.values(demoAccounts).find((candidate) => candidate.email === email && candidate.password === password);
  if (!account) throw new Error("We couldn’t match that email and password.");
  const session = { id: account.id, name: account.name, email: account.email, role: account.role, organization: account.organization };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function signUp(input: { name: string; email: string; role: UserRole; organization: string }): Promise<SessionUser> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  const session = { id: `usr-${Date.now()}`, name: input.name, email: input.email, role: input.role, organization: input.organization };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signOut() { localStorage.removeItem(SESSION_KEY); }
