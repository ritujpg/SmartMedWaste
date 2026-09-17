import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSession, restoreSession, SessionUser } from "@/lib/auth";
import AuthPage from "./Auth";
import Dashboard from "./Dashboard";

export default function Index() {
  const [user, setUser] = useState<SessionUser | null>(() => getSession());
  const [restoring, setRestoring] = useState(() => Boolean(getSession()));
  const location = useLocation();
  useEffect(() => {
    if (!user) return;
    restoreSession().then((session) => {
      setUser(session);
      setRestoring(false);
    });
  }, []);
  if (restoring) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Restoring session...</div>;
  if (!user || location.pathname === "/login" || location.pathname === "/signup") {
    return <AuthPage onAuthenticated={setUser} />;
  }
  return <Dashboard user={user} />;
}
