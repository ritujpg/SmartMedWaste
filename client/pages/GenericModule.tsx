import { Activity, AlertTriangle, Bell, Check, CircleHelp, Download, FileBarChart, Hospital, Leaf, Settings, ShieldCheck, Truck, Users } from "lucide-react";
import { AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SessionUser } from "@/lib/auth";
import { CardTitle, PageHeading, StatCard } from "@/components/dashboard/primitives";
import { wasteTrend } from "@/components/dashboard/data";
import RouteMap from "./Route";
export function GenericModule({
  type,
  user,
}: {
  type: string;
  user: SessionUser;
}) {
  const config: Record<
    string,
    {
      title: string;
      eyebrow: string;
      subtitle: string;
      icon: any;
      stats: [string, string][];
    }
  > = {
    compliance: {
      title: "Compliance monitoring",
      eyebrow: "Governance & safety",
      subtitle:
        "Monitor the signals that keep every waste handoff accountable.",
      icon: ShieldCheck,
      stats: [
        ["Overall score", "92 / 100"],
        ["Segregation accuracy", "96.4%"],
        ["Collection timeliness", "88.1%"],
        ["Tracking completeness", "98.2%"],
      ],
    },

    credits: {
      title: "Green Credits",
      eyebrow: "Sustainability incentives",
      subtitle:
        "Recognize consistent segregation with a transparent incentive mechanism.",
      icon: Leaf,
      stats: [
        ["Current credits", "2,840"],
        ["Earned this month", "+480"],
        ["Credits used", "120"],
        ["Segregation accuracy", "96.4%"],
      ],
    },

    alerts: {
      title: "Alerts & notifications",
      eyebrow: "Operations center",
      subtitle:
        "Review classification, compliance and route signals in one place.",
      icon: Bell,
      stats: [
        ["Unread alerts", "03"],
        ["Critical", "01"],
        ["Warnings", "02"],
        ["Resolved this week", "18"],
      ],
    },

    reports: {
      title: "Reports & analytics",
      eyebrow: "Operational intelligence",
      subtitle:
        "Generate clear reports for waste volume, compliance and collections.",
      icon: FileBarChart,
      stats: [
        ["Reports generated", "24"],
        ["This month volume", "1,284 kg"],
        ["Avg. accuracy", "94.8%"],
        ["Facilities tracked", "08"],
      ],
    },

    facilities: {
      title: "Facilities",
      eyebrow: "Admin workspace",
      subtitle:
        "Monitor facility performance and collection readiness.",
      icon: Hospital,
      stats: [
        ["Total facilities", "08"],
        ["Compliant", "06"],
        ["Needs attention", "02"],
        ["Active requests", "17"],
      ],
    },

    collectors: {
      title: "Collectors",
      eyebrow: "Admin workspace",
      subtitle:
        "Coordinate collection teams and route capacity.",
      icon: Users,
      stats: [
        ["Active collectors", "06"],
        ["On route", "04"],
        ["Available", "02"],
        ["Avg. pickup time", "38 min"],
      ],
    },

    heatmap: {
      title: "Waste heatmap",
      eyebrow: "Analytics signal",
      subtitle:
        "Explore waste-generation intensity by pincode and facility.",
      icon: Activity,
      stats: [
        ["Areas monitored", "12"],
        ["Highest pincode", "560034"],
        ["Waste volume", "248 kg"],
        ["Potential spikes", "02"],
      ],
    },

    route: {
      title: "Route optimization",
      eyebrow: "Collection logistics",
      subtitle:
        "Plan efficient routes for today's pickup network.",
      icon: Truck,
      stats: [
        ["Total distance", "48.6 km"],
        ["Estimated time", "2h 18m"],
        ["Stops", "07"],
        ["Route efficiency", "91%"],
      ],
    },

    settings: {
      title: "Settings",
      eyebrow: "Workspace preferences",
      subtitle:
        "Manage profile, notifications, security and integrations.",
      icon: Settings,
      stats: [
        ["Profile", "Complete"],
        ["Notifications", "Enabled"],
        ["Security", "Strong"],
        ["API status", "Sandbox"],
      ],
    },

    support: {
      title: "Help & support",
      eyebrow: "Operations support",
      subtitle:
        "Find answers and connect with the SmartMedWaste operations team.",
      icon: CircleHelp,
      stats: [
        ["Open tickets", "02"],
        ["Avg. response", "12 min"],
        ["Documentation", "Available"],
        ["Service status", "Online"],
      ],
    },
  };

  const data =
    config[type] || config.compliance;

  const Icon = data.icon;

  return (
    <>
      <PageHeading
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
        action={
          <button className="secondary-button">
            <Download size={14} /> Export view
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map(([label, value], index) => (
          <StatCard
            key={label}
            icon={Icon}
            label={label}
            value={value}
            change={
              index === 0 ? "+4.6%" : undefined
            }
            tone={
              [
                "tone-teal",
                "tone-blue",
                "tone-green",
                "tone-amber",
              ][index]
            }
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="panel">
          <CardTitle
            title={
              type === "route"
                ? "Today's optimized route"
                : type === "alerts"
                  ? "Recent alerts"
                  : type === "facilities"
                    ? "Facility performance"
                    : "Performance trend"
            }
            subtitle="Demo data - updated a few minutes ago"
            action="View details"
          />

          {type === "route" ? (
            <RouteMap />
          ) : type === "heatmap" ? (
            <div className="mock-map">
              <div className="map-route" />

              <span className="map-pin pin-a">A</span>
              <span className="map-pin pin-b">B</span>
              <span className="map-pin pin-c">C</span>
              <span className="map-pin pin-d">D</span>

              <div className="map-label">
                Waste intensity by pincode
              </div>
            </div>
          ) : (
            <div className="h-[270px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={wasteTrend}
                  margin={{
                    left: -25,
                    right: 8,
                    top: 10,
                  }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#edf1f4"
                  />

                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#8b9aaa",
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
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

                  <Bar
                    dataKey="value"
                    fill="#65bba6"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel">
          <CardTitle
            title={
              type === "alerts"
                ? "Priority queue"
                : "Recommended next steps"
            }
            subtitle="Actions for your workspace"
          />

          <div className="space-y-3">
            {[
              "Review the two requests awaiting collector assignment",
              "Confirm today's segregation audit evidence",
              "Share the latest volume report with your operations lead",
              "Check the route exception from yesterday",
            ].map((text, index) => (
              <div
                key={text}
                className="flex gap-3 rounded-lg bg-slate-50 p-3"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    index === 0
                      ? "bg-amber-50 text-amber-600"
                      : "bg-mint-pale text-teal"
                  }`}
                >
                  {index === 0 ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <Check size={14} />
                  )}
                </span>

                <p className="text-xs leading-5 text-slate-600">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default GenericModule;
