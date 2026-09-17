import GenericModule from "./GenericModule";
import type { SessionUser } from "@/lib/auth";

export default function AdminPage({ user }: { user: SessionUser }) {
  return <GenericModule type="facilities" user={user} />;
}