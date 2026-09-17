import GenericModule from "./GenericModule";
import type { SessionUser } from "@/lib/auth";

export default function HistoryPage({ user }: { user: SessionUser }) {
  return <GenericModule type="reports" user={user} />;
}