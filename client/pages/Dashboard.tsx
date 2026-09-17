import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, FileText, Leaf, PackageCheck, Plus, QrCode, ScanLine, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SessionUser } from "@/lib/auth";
import { Header, Sidebar } from "@/components/dashboard/navigation";
import { CardTitle, PageHeading, QuickAction, StatCard } from "@/components/dashboard/primitives";
import { apiGet } from "@/lib/api";
import Scanner from "./Scanner";
import Requests from "./Requests";
import Tracking from "./Tracking";
import GenericModule from "./GenericModule";
import RoutePage from "./Route";
import AlertsPage from "./Alerts";
import HistoryPage from "./History";
import AdminPage from "./Admin";
type Analytics = {
  total_waste_kg: number;
  pending_collections: number;
  daily_trend: { day: string; value: number }[];
  waste_by_category: Record<string, number>;
};

function Overview({ user, analytics }: { user: SessionUser; analytics: Analytics | null }) {
  const categoryData = Object.entries(analytics?.waste_by_category || {}).map(([name, value], index) => ({ name, value, color: ["#e7b94a", "#e5766c", "#6aa8d7", "#b6c4d5"][index % 4] }));
  return (
    <>
      <PageHeading
        eyebrow="Tuesday, 18 June 2024"
        title={`Good morning, ${user.name.split(" ")[0]} *`}
        subtitle={`Here's what's happening across ${user.organization} today.`}
        action={
          <>
            <Link to="/reports" className="secondary-button hidden sm:flex">
              <FileText size={15} /> Export report
            </Link>

            <Link to="/scanner" className="primary-button">
              <ScanLine size={16} /> Scan waste
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={PackageCheck}
          label="Waste generated today"
          value={analytics ? `${analytics.total_waste_kg.toFixed(1)} kg` : "--"}
          tone="tone-teal"
          note="vs yesterday"
        />

        <StatCard
          icon={Truck}
          label="Pending collections"
          value={analytics ? String(analytics.pending_collections).padStart(2, "0") : "--"}
          tone="tone-blue"
          note="2 urgent"
        />

        <StatCard
          icon={Sparkles}
          label="Segregation accuracy"
          value="--"
          tone="tone-purple"
          note="this week"
        />

        <StatCard
          icon={ShieldCheck}
          label="Compliance score"
          value="--"
          tone="tone-green"
        />

        <StatCard
          icon={Leaf}
          label="Green credits"
          value="--"
          tone="tone-amber"
          note="this month"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="panel">
          <CardTitle
            title="Waste generated"
            subtitle="Total volume across all categories - Last 7 days"
            action="View report"
          />

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics?.daily_trend || []}
                margin={{ top: 8, right: 4, left: -28, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="wasteFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#23a58a"
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="100%"
                      stopColor="#23a58a"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  stroke="#edf1f4"
                />

                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: "#8b9aaa",
                    fontSize: 11,
                  }}
                  dy={10}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: "#9aa7b5",
                    fontSize: 10,
                  }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e5ebef",
                    fontSize: 12,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#159b83"
                  strokeWidth={2.5}
                  fill="url(#wasteFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <CardTitle
            title="Waste by category"
            subtitle="Distribution by bin type"
            action="Details"
          />

          <div className="flex items-center gap-4">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    innerRadius={51}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[24px] font-bold text-navy">
                  {analytics ? analytics.total_waste_kg.toFixed(1) : "--"}
                </span>
                <span className="text-[10px] text-slate-500">
                  total kg
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {categoryData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 text-[11px]"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />

                  <span className="text-slate-500">
                    {item.name} bin
                  </span>

                  <strong className="ml-auto text-navy">
                    {item.value}%
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-mint-pale px-3 py-2.5 text-[11px] text-teal">
            <span className="font-bold">Good sorting habits.</span>{" "}
            Yellow waste is your highest category this week.
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="panel">
          <CardTitle
            title="Quick actions"
            subtitle="Jump into your most-used workflows"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <QuickAction
              icon={ScanLine}
              label="Scan waste"
              to="/scanner"
            />

            <QuickAction
              icon={Plus}
              label="Create collection request"
              to="/requests"
            />

            <QuickAction
              icon={QrCode}
              label="Track waste"
              to="/tracking"
            />

            <QuickAction
              icon={ShieldCheck}
              label="View compliance"
              to="/compliance"
            />
          </div>
        </div>

        <div className="panel">
          <CardTitle
            title="Compliance health"
            subtitle="Your facility performance"
            action="Audit details"
          />

          <div className="flex items-center gap-5">
            <div className="score-ring">
              <div>
                <span>92</span>
                <small>/ 100</small>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-navy">
                Excellent standing
              </p>

              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                You're above the 85% compliance benchmark.
              </p>

              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <ArrowUpRight size={13} /> 4.6% from last month
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export function Dashboard({ user }: { user: SessionUser }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] =
    useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    apiGet<Analytics>("/api/analytics").then(setAnalytics).catch(() => setAnalytics(null));
  }, []);

  let content: React.ReactNode;

  if (
    location.pathname === "/" ||
    location.pathname === "/collector"
  ) {
    content = <Overview user={user} analytics={analytics} />;
  } else if (
    location.pathname === "/scanner"
  ) {
    content = <Scanner />;
  } else if (
    location.pathname === "/requests"
  ) {
    content = <Requests />;
  } else if (
    location.pathname === "/tracking"
  ) {
    content = <Tracking />;
  } else if (location.pathname === "/route") {
    content = <RoutePage />;
  } else if (location.pathname === "/alerts") {
    content = <AlertsPage user={user} />;
  } else if (location.pathname === "/reports") {
    content = <HistoryPage user={user} />;
  } else if (location.pathname === "/admin") {
    content = <AdminPage user={user} />;
  } else {
    content = (
      <GenericModule
        type={location.pathname.slice(1)}
        user={user}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main-area">
        <Header
          user={user}
          onMenu={() => setMenuOpen(true)}
        />

        <div className="content-area">
          {content}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
