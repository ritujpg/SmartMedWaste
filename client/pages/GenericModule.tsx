import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Bell, Check, CircleHelp, Download, FileBarChart, Hospital, Leaf, Settings, ShieldCheck, Truck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SessionUser } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { CardTitle, PageHeading, StatCard } from "@/components/dashboard/primitives";

type ModuleType = "compliance" | "credits" | "alerts" | "reports" | "facilities" | "collectors" | "heatmap" | "settings" | "support";
type ModuleData = Record<string, unknown>;

const metadata: Record<ModuleType, { title: string; eyebrow: string; subtitle: string; icon: typeof ShieldCheck }> = {
  compliance: { title: "Compliance monitoring", eyebrow: "Governance & safety", subtitle: "Monitor persisted compliance records for your workspace.", icon: ShieldCheck },
  credits: { title: "Green Credits", eyebrow: "Sustainability incentives", subtitle: "Review credits calculated from persisted transactions.", icon: Leaf },
  alerts: { title: "Alerts & notifications", eyebrow: "Operations center", subtitle: "Review persisted emergency signals for your workspace.", icon: Bell },
  reports: { title: "Reports & analytics", eyebrow: "Operational intelligence", subtitle: "Review metrics calculated from persisted waste and requests.", icon: FileBarChart },
  facilities: { title: "Facilities", eyebrow: "Admin workspace", subtitle: "Monitor facilities loaded from the database.", icon: Hospital },
  collectors: { title: "Collectors", eyebrow: "Admin workspace", subtitle: "Coordinate collectors loaded from the database.", icon: Users },
  heatmap: { title: "Waste heatmap", eyebrow: "Analytics signal", subtitle: "Explore persisted waste-generation locations.", icon: Activity },
  settings: { title: "Settings", eyebrow: "Workspace preferences", subtitle: "Profile settings are not available yet.", icon: Settings },
  support: { title: "Help & support", eyebrow: "Operations support", subtitle: "Support records are not available yet.", icon: CircleHelp },
};

function endpointFor(type: ModuleType): string | null {
  if (type === "compliance") return "/api/compliance";
  if (type === "credits") return "/api/green-credits";
  if (type === "alerts") return "/api/emergency";
  if (type === "reports" || type === "heatmap") return "/api/analytics";
  if (type === "facilities") return "/api/admin/facilities";
  if (type === "collectors") return "/api/admin/collectors";
  return null;
}

function statsFor(type: ModuleType, data: ModuleData): [string, string][] {
  if (type === "reports" || type === "heatmap") {
    return [["Total waste", `${Number(data.total_waste_kg || 0).toFixed(1)} kg`], ["Processed waste", `${Number(data.processed_waste_kg || 0).toFixed(1)} kg`], ["Requests", String(data.request_count || 0)], ["Pending collections", String(data.pending_collections || 0)]];
  }
  if (type === "alerts") return [["Open emergencies", String(Array.isArray(data.items) ? data.items.filter((item: any) => item.status === "Open").length : 0)], ["Total records", String(Array.isArray(data.items) ? data.items.length : 0)], ["Source", "Database"], ["Status", "Live"]];
  if (type === "facilities" || type === "collectors") return [["Records", String(Array.isArray(data.items) ? data.items.length : 0)], ["Source", "Database"], ["Status", "Live"], ["Last refresh", new Date().toLocaleTimeString()]];
  if (type === "credits") return [["Current balance", String(data.current_balance ?? 0)], ["Earned this month", String(data.month_earned ?? 0)], ["Transactions", String(Array.isArray(data.history) ? data.history.length : 0)], ["Source", "Database"]];
  if (type === "compliance") return [["Overall score", data.overall_score == null ? "--" : String(data.overall_score)], ["Segregation accuracy", data.segregation_accuracy == null ? "--" : `${data.segregation_accuracy}%`], ["Collection timeliness", data.collection_timeliness == null ? "--" : `${data.collection_timeliness}%`], ["Tracking completeness", data.tracking_completeness == null ? "--" : `${data.tracking_completeness}%`]];
  return [];
}

export default function GenericModule({ type, user }: { type: string; user: SessionUser }) {
  const moduleType = (type in metadata ? type : "compliance") as ModuleType;
  const [data, setData] = useState<ModuleData | null>(null);
  const [error, setError] = useState("");
  const endpoint = endpointFor(moduleType);
  const meta = metadata[moduleType];
  const Icon = meta.icon;

  useEffect(() => {
    if (!endpoint) return;
    setData(null);
    apiGet<ModuleData>(endpoint).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Data could not be loaded."));
  }, [endpoint]);

  const stats = data ? statsFor(moduleType, data) : [];
  const chartData = Array.isArray(data?.daily_trend) ? data.daily_trend as { day: string; value: number }[] : [];

  return <>
    <PageHeading eyebrow={meta.eyebrow} title={meta.title} subtitle={meta.subtitle} action={<button className="secondary-button"><Download size={14} /> Export view</button>} />
    {error && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</div>}
    {!endpoint && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">This workspace feature has no backend persistence yet.</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(([label, value], index) => <StatCard key={label} icon={Icon} label={label} value={value} tone={["tone-teal", "tone-blue", "tone-green", "tone-amber"][index]} />)}
    </div>
    <div className="panel mt-4">
      <CardTitle title={moduleType === "alerts" ? "Recent emergencies" : "Persisted performance"} subtitle={data ? "Loaded from the FastAPI backend" : "Loading database records..."} />
      {chartData.length ? <div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid vertical={false} stroke="#edf1f4" /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="value" fill="#65bba6" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">{data ? "No persisted records available." : "Loading..."}</div>}
    </div>
  </>;
}
