import { useState } from "react";
import { useLocation } from "react-router-dom";
import { getSession, SessionUser } from "@/lib/auth";
import AuthPage from "./Auth";
import Dashboard from "./Dashboard";

export default function Index() {
  const [user, setUser] = useState<SessionUser | null>(() => getSession());
  const location = useLocation();
  if (!user || location.pathname === "/login" || location.pathname === "/signup") {
    return <AuthPage onAuthenticated={setUser} />;
  }
  return <Dashboard user={user} />;
}
