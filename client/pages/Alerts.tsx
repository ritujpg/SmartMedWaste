import GenericModule from "./GenericModule";
import type { SessionUser } from "@/lib/auth";

export default function AlertsPage({ user }: { user: SessionUser }) {
  return <GenericModule type="alerts" user={user} />;
}