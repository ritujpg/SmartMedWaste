import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

maplibregl.setWorkerUrl(workerUrl);
import {
  demoAccounts,
  getSession,
  signIn,
  signOut,
  signUp,
  SessionUser,
  UserRole,
} from "@/lib/auth";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Download,
  FileBarChart,
  FileText,
  Gauge,
  Hospital,
  Leaf,
  LogOut,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ScanLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const navItems = [
  { label: "Overview", icon: Gauge, path: "/" },
  {
    label: "AI Waste Scanner",
    icon: ScanLine,
    path: "/scanner",
    badge: "New",
  },
  {
    label: "Waste Requests",
    icon: ClipboardCheck,
    path: "/requests",
  },
  { label: "Tracking", icon: QrCode, path: "/tracking" },
  { label: "Compliance", icon: ShieldCheck, path: "/compliance" },
  { label: "Green Credits", icon: Leaf, path: "/credits" },
  { label: "Alerts", icon: Bell, path: "/alerts", count: 3 },
  { label: "Reports", icon: FileBarChart, path: "/reports" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const categories = ["Yellow", "Red", "White", "Blue"];

const statuses = [
  "Requested",
  "Assigned",
  "Collector En Route",
  "Picked Up",
  "In Transit",
  "Delivered",
  "Processed",
];

const requestSeed = [
  [
    "REQ-24091",
    "Apollo Hospitals",
    "Yellow",
    "12.4 kg",
    "High",
    "Arjun Mehta",
    "Today, 10:30 AM",
    "Collector En Route",
  ],
  [
    "REQ-24090",
    "Fortis Bannerghatta",
    "Red",
    "8.2 kg",
    "Normal",
    "Priya Nair",
    "Today, 11:15 AM",
    "Assigned",
  ],
  [
    "REQ-24089",
    "Manipal Whitefield",
    "White",
    "5.8 kg",
    "Normal",
    "Unassigned",
    "Tomorrow, 09:00 AM",
    "Requested",
  ],
  [
    "REQ-24088",
    "Narayana Health",
    "Blue",
    "3.1 kg",
    "Normal",
    "Arjun Mehta",
    "Today, 08:45 AM",
    "Picked Up",
  ],
  [
    "REQ-24087",
    "Cloudnine Hospital",
    "Yellow",
    "18.6 kg",
    "Emergency",
    "Kavya Singh",
    "Today, 07:30 AM",
    "In Transit",
  ],
  [
    "REQ-24086",
    "Sakra World Hospital",
    "Red",
    "9.4 kg",
    "High",
    "Vikram Shah",
    "Yesterday, 04:20 PM",
    "Delivered",
  ],
  [
    "REQ-24085",
    "Aster CMI Hospital",
    "White",
    "6.7 kg",
    "Normal",
    "Priya Nair",
    "Yesterday, 01:00 PM",
    "Processed",
  ],
  [
    "REQ-24084",
    "Columbia Asia Hebbal",
    "Yellow",
    "14.1 kg",
    "Normal",
    "Arjun Mehta",
    "Yesterday, 11:10 AM",
    "Processed",
  ],
  [
    "REQ-24083",
    "St. Martha's Hospital",
    "Blue",
    "4.2 kg",
    "High",
    "Unassigned",
    "Tomorrow, 10:00 AM",
    "Requested",
  ],
  [
    "REQ-24082",
    "BGS Gleneagles",
    "Red",
    "11.8 kg",
    "Normal",
    "Kavya Singh",
    "Today, 02:30 PM",
    "Assigned",
  ],
  [
    "REQ-24081",
    "HOSMAT Hospital",
    "Yellow",
    "7.5 kg",
    "Normal",
    "Vikram Shah",
    "Today, 03:00 PM",
    "Collector En Route",
  ],
  [
    "REQ-24080",
    "Bangalore Baptist",
    "White",
    "2.8 kg",
    "Normal",
    "Priya Nair",
    "Mon, 09:30 AM",
    "Processed",
  ],
  [
    "REQ-24079",
    "Rajarajeshwari Medical",
    "Blue",
    "5.4 kg",
    "High",
    "Arjun Mehta",
    "Mon, 12:00 PM",
    "In Transit",
  ],
  [
    "REQ-24078",
    "Vikram Hospital",
    "Yellow",
    "16.2 kg",
    "Emergency",
    "Kavya Singh",
    "Mon, 08:10 AM",
    "Picked Up",
  ],
  [
    "REQ-24077",
    "People Tree Hospital",
    "Red",
    "6.3 kg",
    "Normal",
    "Unassigned",
    "Tue, 10:00 AM",
    "Requested",
  ],
].map(
  ([
    id,
    facility,
    category,
    quantity,
    priority,
    collector,
    pickup,
    status,
  ]) => ({
    id,
    facility,
    category,
    quantity,
    priority,
    collector,
    pickup,
    status,
  }),
);

const wasteTrend = [
  { day: "Mon", value: 31 },
  { day: "Tue", value: 42 },
  { day: "Wed", value: 35 },
  { day: "Thu", value: 48 },
  { day: "Fri", value: 45 },
  { day: "Sat", value: 52 },
  { day: "Sun", value: 46 },
];

const categoryData = [
  { name: "Yellow", value: 42, color: "#e7b94a" },
  { name: "Red", value: 26, color: "#e5766c" },
  { name: "Blue", value: 18, color: "#6aa8d7" },
  { name: "White", value: 14, color: "#b6c4d5" },
];

type Request = (typeof requestSeed)[number];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 px-2">
      <span className="brand-mark">
        <Activity size={20} strokeWidth={2.8} />
      </span>
      <span className="text-[17px] font-bold tracking-[-0.03em] text-white">
        SmartMed<span className="text-mint">Waste</span>
      </span>
    </Link>
  );
}

function LogoPanel() {
  return (
    <div className="auth-visual">
      <Brand />

      <div className="auth-visual-content">
        <div className="health-orbit">
          <Hospital size={34} />
          <span className="orbit-dot orbit-one" />
          <span className="orbit-dot orbit-two" />
          <span className="orbit-dot orbit-three" />
        </div>

        <p className="eyebrow text-mint">Connected healthcare operations</p>

        <h1>
          Smarter segregation.
          <br />
          <span>Safer healthcare.</span>
        </h1>

        <p>
          Bring every waste decision, pickup and compliance signal into one
          calm operational workspace.
        </p>

        <div className="auth-feature">
          <Check size={14} /> Trace every collection from bin to destination
        </div>

        <div className="auth-feature">
          <Check size={14} /> Turn better segregation into measurable impact
        </div>
      </div>

      <p className="text-[10px] text-slate-500">
        Secure demo workspace · SmartMedWaste
      </p>
    </div>
  );
}

function AuthPage({
  onAuthenticated,
}: {
  onAuthenticated: (user: SessionUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UserRole>("facility");
  const [email, setEmail] = useState(demoAccounts.facility.email);
  const [password, setPassword] = useState("demo123");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirm) {
      return setError("Passwords do not match.");
    }

    if (mode === "signup" && !terms) {
      return setError("Please accept the terms to create an account.");
    }

    setLoading(true);

    try {
      const user =
        mode === "login"
          ? await signIn(email, password)
          : await signUp({
              name,
              email,
              role,
              organization,
            });

      onAuthenticated(user);

      navigate(
        user.role === "collector"
          ? "/collector"
          : user.role === "admin"
            ? "/admin"
            : "/",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const demo = (nextRole: UserRole) => {
    const account = demoAccounts[nextRole];

    setRole(nextRole);
    setEmail(account.email);
    setPassword(account.password);
    setMode("login");
    setError("");
  };

  return (
    <div className="auth-page">
      <LogoPanel />

      <div className="auth-form-wrap">
        <div className="auth-mobile-brand">
          <Brand />
        </div>

        <div className="auth-form-box">
          <div className="mb-7">
            <p className="eyebrow text-teal">
              {mode === "login"
                ? "Facility workspace"
                : "Create workspace access"}
            </p>

            <h2 className="mt-2 text-[28px] font-bold tracking-[-.04em] text-navy">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>

            <p className="mt-1.5 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to manage your healthcare waste operations."
                : "Set up a secure account for your operations team."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <Field
                  label="Full name"
                  value={name}
                  onChange={setName}
                  placeholder="Riya Kapoor"
                  required
                />

                <Field
                  label="Organization / facility"
                  value={organization}
                  onChange={setOrganization}
                  placeholder="Apollo Hospitals"
                  required
                />
              </>
            )}

            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@facility.com"
              required
            />

            <div>
              <label className="form-label">Password</label>

              <div className="relative">
                <input
                  className="form-input pr-10"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {mode === "signup" && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        password.length >= level * 3
                          ? "bg-teal"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {mode === "signup" && (
              <Field
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat password"
                required
              />
            )}

            {mode === "signup" && (
              <div>
                <label className="form-label">Role</label>

                <select
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="facility">Healthcare Facility</option>
                  <option value="collector">Waste Collector</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            {mode === "login" ? (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-500">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-teal"
                  />
                  Remember me
                </label>

                <button type="button" className="font-bold text-teal">
                  Forgot password?
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="accent-teal"
                />
                I agree to the workspace terms.
              </label>
            )}

            {error && (
              <div className="form-error">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button
              disabled={loading}
              className="primary-button w-full py-3"
            >
              {loading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {mode === "login" && (
            <>
              <div className="divider">
                <span>OR</span>
              </div>

              <div>
                <p className="mb-2 text-center text-[11px] font-semibold text-slate-500">
                  Try a demo workspace
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {(["facility", "collector", "admin"] as UserRole[]).map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => demo(item)}
                        className="demo-button"
                      >
                        <span className={`demo-dot demo-${item}`} />
                        {item === "facility"
                          ? "Facility"
                          : item === "collector"
                            ? "Collector"
                            : "Admin"}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </>
          )}

          <p className="mt-7 text-center text-xs text-slate-500">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              className="font-bold text-teal"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>

      <input
        className="form-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function Sidebar({
  user,
  open,
  onClose,
}: {
  user: SessionUser;
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();

  const roleItems =
    user.role === "collector"
      ? [
          { label: "Dashboard", icon: Gauge, path: "/collector" },
          {
            label: "Today's Pickups",
            icon: ClipboardCheck,
            path: "/requests",
          },
          { label: "Route", icon: Truck, path: "/route" },
          { label: "Scan Waste", icon: ScanLine, path: "/scanner" },
          {
            label: "Emergency Alerts",
            icon: Bell,
            path: "/alerts",
          },
          { label: "History", icon: FileBarChart, path: "/reports" },
          { label: "Profile", icon: Settings, path: "/settings" },
        ]
      : user.role === "admin"
        ? [
            { label: "Overview", icon: Gauge, path: "/admin" },
            { label: "Facilities", icon: Hospital, path: "/facilities" },
            { label: "Collectors", icon: Users, path: "/collectors" },
            {
              label: "Waste Tracking",
              icon: QrCode,
              path: "/tracking",
            },
            {
              label: "Compliance",
              icon: ShieldCheck,
              path: "/compliance",
            },
            { label: "Heatmap", icon: Activity, path: "/heatmap" },
            { label: "Routes", icon: Truck, path: "/route" },
            { label: "Alerts", icon: Bell, path: "/alerts" },
            {
              label: "Reports",
              icon: FileBarChart,
              path: "/reports",
            },
          ]
        : navItems;

  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="flex items-center justify-between px-5 py-5">
        <Brand />

        <button className="mobile-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="mx-5 mb-6 mt-3 rounded-xl border border-white/10 bg-white/[.06] p-3">
        <div className="flex items-center gap-3">
          <div className="facility-avatar">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {user.organization}
            </p>

            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {user.role === "facility"
                ? "Facility workspace"
                : user.role === "collector"
                  ? "Collector workspace"
                  : "Operations workspace"}
            </p>
          </div>

          <ChevronDown size={14} className="ml-auto text-slate-500" />
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="px-4">
          <p className="eyebrow px-3 pb-2 text-slate-500">Workspace</p>

          {roleItems
            .slice(0, 6)
            .map((item) => (
              <NavItem
                key={item.label}
                item={item}
                active={location.pathname === item.path}
              />
            ))}
        </div>

        <div className="mt-7 px-4">
          <p className="eyebrow px-3 pb-2 text-slate-500">Manage</p>

          {roleItems
            .slice(6)
            .map((item) => (
              <NavItem
                key={item.label}
                item={item}
                active={location.pathname === item.path}
              />
            ))}

          {user.role !== "admin" && (
            <NavItem
              item={{
                label: "Settings",
                icon: Settings,
                path: "/settings",
              }}
              active={location.pathname === "/settings"}
            />
          )}
        </div>
      </div>

      <div className="mt-auto px-5 pb-5">
        <div className="support-card">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/15 text-mint">
              <CircleHelp size={16} />
            </span>

            <span className="text-[10px] font-semibold uppercase tracking-wider text-mint">
              Support
            </span>
          </div>

          <p className="mt-3 text-xs font-semibold text-white">
            Need help with a pickup?
          </p>

          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            Our operations team is online.
          </p>

          <Link
            to="/support"
            className="mt-3 inline-block text-xs font-semibold text-mint hover:text-white"
          >
            Contact support →
          </Link>
        </div>

        <p className="mt-5 text-center text-[10px] text-slate-600">
          SmartMedWaste v1.0 · Demo workspace
        </p>
      </div>
    </aside>
  );
}

function NavItem({ item, active }: { item: any; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className={`nav-item ${active ? "nav-item-active" : ""}`}
    >
      <Icon size={17} />

      <span>{item.label}</span>

      {item.badge && (
        <span className="ml-auto rounded bg-mint/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-mint">
          {item.badge}
        </span>
      )}

      {item.count && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
          {item.count}
        </span>
      )}
    </Link>
  );
}

function Header({
  user,
  onMenu,
}: {
  user: SessionUser;
  onMenu: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu}>
        <Menu size={21} />
      </button>

      <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
        <span>
          {user.role === "admin"
            ? "Operations"
            : user.role === "collector"
              ? "Collections"
              : "Facilities"}
        </span>

        <span className="text-slate-300">/</span>

        <span className="font-medium text-navy">
          {user.organization}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          className="icon-button relative"
          onClick={() => navigate("/alerts")}
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5"
          >
            <div className="profile-avatar">
              {user.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-xs font-bold text-navy">{user.name}</p>

              <p className="text-[10px] text-slate-500">
                {user.role === "facility"
                  ? "Facility admin"
                  : user.role === "collector"
                    ? "Waste collector"
                    : "Administrator"}
              </p>
            </div>

            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {open && (
            <div className="profile-menu">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-bold text-navy">
                  {user.email}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  Demo session
                </p>
              </div>

              <button onClick={() => navigate("/settings")}>
                <Settings size={14} /> Profile settings
              </button>

              <button
                onClick={() => {
                  signOut();
                  navigate("/login");
                }}
                className="text-rose-600"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  tone,
  note,
}: {
  icon: any;
  label: string;
  value: string;
  change?: string;
  tone: string;
  note?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <span className={`stat-icon ${tone}`}>
          <Icon size={18} />
        </span>

        {change && (
          <span
            className={`trend ${
              change.startsWith("+") ? "trend-up" : "trend-down"
            }`}
          >
            {change.startsWith("+") ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {change}
          </span>
        )}
      </div>

      <p className="mt-4 text-[12px] font-medium text-slate-500">
        {label}
      </p>

      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-[25px] font-bold tracking-[-.04em] text-navy">
          {value}
        </p>

        {note && (
          <span className="text-[11px] text-slate-400">{note}</span>
        )}
      </div>
    </div>
  );
}

function CardTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <div>
        <h3 className="text-[14px] font-bold text-navy">{title}</h3>

        {subtitle && (
          <p className="mt-1 text-[11px] text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <button className="text-[11px] font-bold text-teal hover:text-navy">
          {action}
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();

  const style =
    key.includes("emergency") || key.includes("critical")
      ? "status-red"
      : key.includes("requested") || key.includes("pending")
        ? "status-amber"
        : key.includes("transit") || key.includes("assigned")
          ? "status-blue"
          : key.includes("processed") ||
              key.includes("delivered") ||
              key.includes("picked")
            ? "status-green"
            : "status-slate";

  return (
    <span className={`status-badge ${style}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function Overview({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeading
        eyebrow="Tuesday, 18 June 2024"
        title={`Good morning, ${user.name.split(" ")[0]} ✦`}
        subtitle={`Here’s what’s happening across ${user.organization} today.`}
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
          value="46.2 kg"
          change="+8.4%"
          tone="tone-teal"
          note="vs yesterday"
        />

        <StatCard
          icon={Truck}
          label="Pending collections"
          value="07"
          change="-12.5%"
          tone="tone-blue"
          note="2 urgent"
        />

        <StatCard
          icon={Sparkles}
          label="Segregation accuracy"
          value="96.4%"
          change="+2.1%"
          tone="tone-purple"
          note="this week"
        />

        <StatCard
          icon={ShieldCheck}
          label="Compliance score"
          value="92 / 100"
          change="+4.6%"
          tone="tone-green"
        />

        <StatCard
          icon={Leaf}
          label="Green credits"
          value="2,840"
          change="+180"
          tone="tone-amber"
          note="this month"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="panel">
          <CardTitle
            title="Waste generated"
            subtitle="Total volume across all categories · Last 7 days"
            action="View report"
          />

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={wasteTrend}
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
                  46.2
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
                You’re above the 85% compliance benchmark.
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

function QuickAction({
  icon: Icon,
  label,
  to,
}: {
  icon: any;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs font-bold text-navy hover:border-mint hover:bg-mint-pale"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal shadow-sm">
        <Icon size={15} />
      </span>

      {label}
    </Link>
  );
}

function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow text-teal">{eyebrow}</p>

        <h1 className="mt-1 text-[26px] font-bold tracking-[-.04em] text-navy sm:text-[30px]">
          {title}
        </h1>

        <p className="mt-1.5 text-sm text-slate-500">
          {subtitle}
        </p>
      </div>

      <div className="flex gap-2">{action}</div>
    </div>
  );
}

/* =========================================================
   REAL-TIME AI WASTE SCANNER
   ========================================================= */

function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectInFlight = useRef(false);

  const apiBase = (
    import.meta.env.VITE_API_URL || "http://localhost:8000"
  ).replace(/\/$/, "");

  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("Starting camera...");
  const [cameraError, setCameraError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const normalizeBox = (
    box: any,
    width: number,
    height: number,
  ) => {
    if (!box || typeof box !== "object") return null;

    const x = Number(box.x);
    const y = Number(box.y);
    const w = Number(box.width);
    const h = Number(box.height);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(w) ||
      !Number.isFinite(h)
    ) {
      return null;
    }

    const isPercentFormat =
      x >= 0 &&
      y >= 0 &&
      w >= 0 &&
      h >= 0 &&
      x <= 100 &&
      y <= 100 &&
      w <= 100 &&
      h <= 100;

    if (isPercentFormat) {
      return {
        x: Math.min(Math.max(x, 0), 100),
        y: Math.min(Math.max(y, 0), 100),
        width: Math.min(Math.max(w, 0), 100),
        height: Math.min(Math.max(h, 0), 100),
      };
    }

    return {
      x: Math.min(
        Math.max((x / Math.max(width, 1)) * 100, 0),
        100,
      ),
      y: Math.min(
        Math.max((y / Math.max(height, 1)) * 100, 0),
        100,
      ),
      width: Math.min(
        Math.max((w / Math.max(width, 1)) * 100, 0),
        100,
      ),
      height: Math.min(
        Math.max((h / Math.max(height, 1)) * 100, 0),
        100,
      ),
    };
  };

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "Camera is not supported in this browser.",
        );
        setStatus("Camera unavailable");
        return;
      }

      try {
        setStatus("Requesting camera access...");

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsRunning(true);
        setCameraError("");
        setStatus("Live detection starting...");
      } catch (error) {
        setCameraError(
          error instanceof Error
            ? error.message
            : "Camera permission is required to scan live medical waste.",
        );

        setStatus("Camera unavailable");
      }
    }

    startCamera();

    return () => {
      cancelled = true;

      const stream = streamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const runDetection = async () => {
    if (!isRunning || detectInFlight.current) return;

    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    detectInFlight.current = true;
    setLoading(true);

    try {
      const width = video.videoWidth;
      const height = video.videoHeight;

      /*
       * Create an invisible canvas.
       * The current camera frame is drawn into it.
       * The frame is converted to a JPEG Blob.
       * The Blob is sent to FastAPI.
       *
       * Nothing is saved permanently by the frontend.
       */

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas could not be initialized");
      }

      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.85,
          );
        },
      );

      if (!blob) {
        throw new Error("Camera frame could not be captured");
      }

      const formData = new FormData();

      formData.append(
        "file",
        blob,
        "camera-frame.jpg",
      );

      const response = await fetch(
        `${apiBase}/detect`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Detection API returned ${response.status}`,
        );
      }

      const payload = await response.json();

      const box = normalizeBox(
        payload.box,
        width,
        height,
      );

      const normalizedPayload = {
        ...payload,
        box,
      };

      setResult(normalizedPayload);

      if (!payload.object) {
        setStatus("No medical waste detected");
      } else if (
        Number(payload.confidence || 0) < 0.7
      ) {
        setStatus("Uncertain detection");
      } else {
        setStatus("Live detection active");
      }

      setCameraError("");
    } catch (error) {
      console.error("Detection error:", error);

      setStatus(
        error instanceof Error
          ? error.message
          : "Backend unavailable",
      );

      setCameraError(
        `Backend unavailable. Make sure FastAPI is running at ${apiBase}.`,
      );
    } finally {
      detectInFlight.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isRunning) return undefined;

    /*
     * Process approximately two camera frames per second.
     *
     * The detectInFlight guard prevents multiple requests
     * from running at the same time.
     */

    const id = window.setInterval(() => {
      if (!detectInFlight.current) {
        void runDetection();
      }
    }, 500);

    return () => {
      window.clearInterval(id);
    };
  }, [apiBase, isRunning]);

  return (
    <>
      <PageHeading
        eyebrow="Real-time medical waste scanner"
        title="AI Waste Scanner"
        subtitle="Live camera scanning with automatic medical-waste object detection."
        action={
          <span className="flex items-center gap-2 rounded-full border border-mint/30 bg-mint-pale px-3 py-2 text-[11px] font-semibold text-teal">
            <span className="pulse-dot" />

            {loading
              ? "Scanning"
              : isRunning
                ? "Live camera"
                : "Starting camera"}
          </span>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-amber-600"
        />

        <div>
          <p className="text-xs font-bold">
            Live camera prototype
          </p>

          <p className="mt-0.5 text-[11px] leading-4 text-amber-800/80">
            No capture, upload, or manual classification is
            required. The scanner continuously processes the
            live camera feed.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <div className="panel">
          <CardTitle
            title="Live scanner"
            subtitle="Continuous camera feed"
          />

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner">
            <video
              ref={videoRef}
              className="h-[360px] w-full object-cover md:h-[440px]"
              autoPlay
              muted
              playsInline
            />

            <div className="pointer-events-none absolute inset-0">
              <span className="absolute left-4 top-4 h-10 w-10 rounded-tl-xl border-l-2 border-t-2 border-mint" />

              <span className="absolute right-4 top-4 h-10 w-10 rounded-tr-xl border-r-2 border-t-2 border-mint" />

              <span className="absolute bottom-4 left-4 h-10 w-10 rounded-bl-xl border-b-2 border-l-2 border-mint" />

              <span className="absolute bottom-4 right-4 h-10 w-10 rounded-br-xl border-b-2 border-r-2 border-mint" />
            </div>

            {result?.box && (
              <div
                className="absolute border-2 border-mint bg-mint/10"
                style={{
                  left: `${result.box.x}%`,
                  top: `${result.box.y}%`,
                  width: `${result.box.width}%`,
                  height: `${result.box.height}%`,
                }}
              >
                {result?.object && (
                  <span className="absolute -top-7 left-0 whitespace-nowrap rounded bg-mint px-2 py-1 text-[10px] font-bold text-slate-950">
                    {result.object}
                  </span>
                )}
              </div>
            )}

            <div className="absolute bottom-4 left-4 rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-[11px] text-white">
              <span className="font-semibold text-mint">
                {status}
              </span>
            </div>
          </div>

          {cameraError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {cameraError}
            </div>
          )}
        </div>

        <div className="panel">
          <CardTitle
            title="Detection results"
            subtitle="Automatic medical-waste object detection"
          />

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Detected Object
              </span>

              <span
                className={`status-badge ${
                  result?.object
                    ? "status-green"
                    : "status-slate"
                }`}
              >
                <span className="status-dot" />

                {result?.object
                  ? "Detected"
                  : "No object"}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Object
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.object ||
                    "No medical waste detected"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Category
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.category || "--"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sub-category
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.subcategory || "--"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Recommended bin
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.bin || result?.recommended_bin || "--"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Confidence
                </p>

                <p className="mt-2 text-lg font-bold text-teal">
                  {result
                    ? `${Math.round(
                        Number(result.confidence || 0) * 100,
                      )}%`
                    : "--"}
                </p>

                {result &&
                  Number(result.confidence || 0) < 0.7 && (
                    <p className="mt-2 text-[11px] font-bold text-amber-700">
                      Uncertain detection
                    </p>
                  )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-teal/10 bg-mint-pale p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal">
                <Zap size={15} />
              </span>

              <div>
                <p className="text-xs font-bold text-teal">
                  Automatic AI segregation
                </p>

                <p className="mt-1 text-[11px] leading-4 text-teal/80">
                  The system continuously analyzes the camera
                  feed and identifies waste without requiring
                  the user to capture, upload or manually
                  classify an item.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Requests() {
  const [requests, setRequests] =
    useState<Request[]>(requestSeed);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] =
    useState("All priorities");

  const [selected, setSelected] =
    useState<Request | null>(null);

  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");

  const filtered = requests.filter(
    (item) =>
      (!query ||
        `${item.id} ${item.facility}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (status === "All statuses" ||
        item.status === status) &&
      (priority === "All priorities" ||
        item.priority === priority),
  );

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);

    const next = {
      id: `REQ-${24100 + requests.length}`,
      facility: "Apollo Hospitals",
      category: String(data.get("category")),
      quantity: `${data.get("quantity")} kg`,
      priority: String(data.get("priority")),
      collector: "Unassigned",
      pickup: `${data.get("date")}, ${data.get("time")}`,
      status: "Requested",
    } as Request;

    setRequests((current) => [next, ...current]);
    setModal(false);
    setToast(`${next.id} created successfully`);

    setTimeout(() => setToast(""), 2800);
  };

  return (
    <>
      <PageHeading
        eyebrow="Collection operations"
        title="Waste Requests"
        subtitle="Manage and track medical-waste collection requests."
        action={
          <button
            className="primary-button"
            onClick={() => setModal(true)}
          >
            <Plus size={15} /> New collection request
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={Clock3}
          label="Pending requests"
          value={String(
            requests.filter(
              (r) => r.status === "Requested",
            ).length,
          ).padStart(2, "0")}
          tone="tone-amber"
        />

        <StatCard
          icon={Users}
          label="Assigned"
          value={String(
            requests.filter(
              (r) => r.status === "Assigned",
            ).length,
          ).padStart(2, "0")}
          tone="tone-blue"
        />

        <StatCard
          icon={Truck}
          label="Collector en route"
          value={String(
            requests.filter(
              (r) => r.status === "Collector En Route",
            ).length,
          ).padStart(2, "0")}
          tone="tone-teal"
        />

        <StatCard
          icon={Check}
          label="Completed"
          value={String(
            requests.filter((r) =>
              ["Processed", "Delivered"].includes(
                r.status,
              ),
            ).length,
          ).padStart(2, "0")}
          tone="tone-green"
        />

        <StatCard
          icon={AlertTriangle}
          label="Emergency"
          value={String(
            requests.filter(
              (r) => r.priority === "Emergency",
            ).length,
          ).padStart(2, "0")}
          tone="tone-purple"
        />
      </div>

      <div className="panel mt-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="search-box">
            <Search size={15} />

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Search request ID or facility"
            />
          </div>

          <select
            className="filter-select"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          >
            <option>All statuses</option>

            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value)
            }
          >
            <option>All priorities</option>
            <option>Normal</option>
            <option>High</option>
            <option>Emergency</option>
          </select>

          <button className="secondary-button ml-auto">
            <CalendarDays size={14} /> Date filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table request-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Facility</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Priority</th>
                <th>Assigned collector</th>
                <th>Pickup time</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="font-bold text-navy">
                    {item.id}
                  </td>

                  <td>{item.facility}</td>

                  <td>
                    <span
                      className={`category-dot category-${item.category.toLowerCase()}`}
                    />
                    {item.category}
                  </td>

                  <td className="font-semibold">
                    {item.quantity}
                  </td>

                  <td>
                    <span
                      className={`priority-${item.priority.toLowerCase()}`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  <td>{item.collector}</td>
                  <td>{item.pickup}</td>

                  <td>
                    <StatusBadge status={item.status} />
                  </td>

                  <td>
                    <MoreHorizontal
                      size={16}
                      className="text-slate-400"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <EmptyState
              icon={Search}
              title="No requests found"
              copy="Try changing your search or filters."
            />
          )}
        </div>
      </div>

      {selected && (
        <RequestDrawer
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {modal && (
        <RequestModal
          onClose={() => setModal(false)}
          onSubmit={submit}
        />
      )}

      {toast && (
        <div className="toast">
          <Check size={16} /> {toast}
        </div>
      )}
    </>
  );
}

function RequestDrawer({
  item,
  onClose,
}: {
  item: Request;
  onClose: () => void;
}) {
  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
    >
      <aside
        className="details-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="eyebrow text-teal">
              Request detail
            </p>

            <h2 className="mt-1 text-xl font-bold text-navy">
              {item.id}
            </h2>
          </div>

          <button
            className="icon-action"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 py-5">
          <Detail
            label="Facility"
            value={item.facility}
          />

          <Detail
            label="Category"
            value={`${item.category} bin`}
          />

          <Detail
            label="Quantity"
            value={item.quantity}
          />

          <Detail
            label="Priority"
            value={item.priority}
          />

          <Detail
            label="Pickup location"
            value="Apollo Main Campus, Bengaluru"
          />

          <Detail
            label="Collector"
            value={item.collector}
          />

          <Detail
            label="Destination"
            value="GreenCycle Treatment Centre"
          />

          <Detail
            label="Created"
            value="18 Jun 2024 · 09:12 AM"
          />
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-bold text-navy">
            Tracking timeline
          </p>

          <div className="timeline">
            {[
              "Waste Generated",
              "Collection Requested",
              "Collector Assigned",
              "Collector En Route",
              "Picked Up",
              "In Transit",
              "Delivered",
              "Processed",
            ].map((step, index) => {
              const active =
                index <=
                Math.max(
                  1,
                  statuses.indexOf(item.status) + 1,
                );

              return (
                <div
                  className={`timeline-item ${
                    active ? "timeline-active" : ""
                  }`}
                  key={step}
                >
                  <span className="timeline-node">
                    {active ? <Check size={11} /> : index + 1}
                  </span>

                  <div>
                    <p>{step}</p>

                    {active && (
                      <span>
                        {index === 0
                          ? "Today, 08:40 AM"
                          : index === 1
                            ? "Today, 09:12 AM"
                            : "Recorded"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-navy">
        {value}
      </p>
    </div>
  );
}

function RequestModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow text-teal">
              New workflow
            </p>

            <h2 className="mt-1 text-xl font-bold text-navy">
              Create collection request
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              A collector will be assigned after submission.
            </p>
          </div>

          <button
            className="icon-action"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={onSubmit}
        >
          <div>
            <label className="form-label">
              Waste category
            </label>

            <select
              name="category"
              className="form-input"
              defaultValue="Yellow"
              required
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Estimated quantity (kg)
            </label>

            <input
              name="quantity"
              type="number"
              min="0.1"
              step="0.1"
              className="form-input"
              placeholder="12.5"
              required
            />
          </div>

          <div>
            <label className="form-label">
              Pickup date
            </label>

            <input
              name="date"
              type="date"
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">
              Preferred pickup time
            </label>

            <input
              name="time"
              type="time"
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">
              Priority
            </label>

            <select
              name="priority"
              className="form-input"
            >
              <option>Normal</option>
              <option>High</option>
              <option>Emergency</option>
            </select>
          </div>

          <div>
            <label className="form-label">
              Special handling
            </label>

            <select
              name="handling"
              className="form-input"
            >
              <option>None</option>
              <option>Sharps container</option>
              <option>Cold-chain material</option>
              <option>Highly infectious</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="form-label">
              Pickup location & notes
            </label>

            <textarea
              name="notes"
              className="form-input min-h-20"
              placeholder="Building, floor, access notes..."
            />
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button className="primary-button">
              <ClipboardCheck size={15} /> Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Tracking() {
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);

  const match =
    requestSeed.find(
      (item) =>
        item.id
          .replace("REQ", "WM")
          .includes(search.toUpperCase()) ||
        item.id.includes(search.toUpperCase()),
    ) || requestSeed[0];

  return (
    <>
      <PageHeading
        eyebrow="Chain of custody"
        title="Waste Tracking"
        subtitle="Search records, scan QR codes and view event history."
        action={
          <button
            className="primary-button"
            onClick={() => setScanning(!scanning)}
          >
            <QrCode size={15} />

            {scanning
              ? "Close scanner"
              : "Scan QR code"}
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <div className="panel">
          <CardTitle
            title="Find a waste record"
            subtitle="Use a Waste ID or scan the record label."
          />

          <div className="search-box w-full">
            <Search size={15} />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search WM-240184"
            />
          </div>

          {scanning && (
            <div className="scanner-box mt-4">
              <div className="scan-corner" />

              <QrCode
                size={54}
                className="text-mint"
              />

              <p className="mt-3 text-xs font-bold text-white">
                Point camera at QR code
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Scanner placeholder · camera integration ready
              </p>
            </div>
          )}

          <div className="mt-5 flex items-start gap-4 border-t border-slate-100 pt-5">
            <div className="qr-placeholder">
              <QrCode size={61} />
            </div>

            <div>
              <p className="eyebrow text-teal">
                Active record
              </p>

              <h3 className="mt-1 text-lg font-bold text-navy">
                WM-{match.id.slice(4)}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {match.facility} · {match.quantity} ·{" "}
                {match.category} bin
              </p>

              <StatusBadge status={match.status} />
            </div>
          </div>
        </div>

        <div className="panel">
          <CardTitle
            title="Event history"
            subtitle="Complete chain of custody for this record"
          />

          <div className="timeline large-timeline">
            {[
              "Waste Generated",
              "Segregated",
              "Collection Requested",
              "Collector Assigned",
              "Picked Up",
              "In Transit",
              "Received",
              "Processed",
            ].map((step, index) => (
              <div
                className={`timeline-item ${
                  index < 6 ? "timeline-active" : ""
                }`}
                key={step}
              >
                <span className="timeline-node">
                  {index < 6 ? (
                    <Check size={11} />
                  ) : (
                    index + 1
                  )}
                </span>

                <div>
                  <p>{step}</p>

                  <span>
                    {index < 6
                      ? `18 Jun 2024 · ${
                          [
                            "08:40",
                            "08:48",
                            "09:12",
                            "09:20",
                            "10:35",
                            "11:10",
                          ][index]
                        } AM`
                      : "Awaiting event"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function RouteMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const currentMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);

  const currentLocationRef = useRef<[number, number] | null>(null);
  const destinationLocationRef = useRef<[number, number] | null>(null);

  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState("");
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,

      style: {
        version: 8,

        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },

        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },

      center: [73.8567, 18.5204],
      zoom: 12,
    });

    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right",
    );

    mapRef.current = map;

    map.on("load", () => {
      console.log("MAP LOADED");

      requestAnimationFrame(() => {
        map.resize();

        setTimeout(() => {
          map.resize();
        }, 300);
      });
    });

    map.on("error", (event) => {
      console.error("MAP ERROR:", event);
    });

    window.addEventListener("resize", () => {
      map.resize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const drawRoute = async () => {
    const map = mapRef.current;

    const start = currentLocationRef.current;
    const end = destinationLocationRef.current;

    if (!map || !start || !end) {
      return;
    }

    setStatus("Calculating best driving route...");

    try {
      const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      );

      if (!response.ok) {
        throw new Error(`OSRM request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        setStatus("No driving route found.");
        return;
      }

      const route = data.routes[0];

      const routeGeoJSON = {
        type: "Feature",
        properties: {},
        geometry: route.geometry,
      };

      const existingSource = map.getSource("route");

      if (existingSource) {
        (
          existingSource as maplibregl.GeoJSONSource
        ).setData(routeGeoJSON as any);
      } else {
        map.addSource("route", {
          type: "geojson",
          data: routeGeoJSON as any,
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#0f766e",
            "line-width": 6,
            "line-opacity": 0.9,
          },
        });
      }

      const distanceKm = route.distance / 1000;
      const durationMinutes = Math.round(route.duration / 60);

      setDistance(`${distanceKm.toFixed(1)} km`);

      if (durationMinutes < 60) {
        setDuration(`${durationMinutes} min`);
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        setDuration(
          minutes === 0
            ? `${hours}h`
            : `${hours}h ${minutes}m`,
        );
      }

      setStatus("Route calculated.");

      const bounds = new maplibregl.LngLatBounds();

      bounds.extend(start);
      bounds.extend(end);

      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 15,
      });
    } catch (error) {
      console.error("Routing error:", error);
      setStatus("Unable to calculate route.");
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus(
        "Location is not supported by this browser.",
      );
      return;
    }

    setStatus("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const coordinates: [number, number] = [
          longitude,
          latitude,
        ];

        currentLocationRef.current = coordinates;

        const map = mapRef.current;

        if (!map) return;

        currentMarkerRef.current?.remove();

        currentMarkerRef.current =
          new maplibregl.Marker()
            .setLngLat(coordinates)
            .addTo(map);

        map.flyTo({
          center: coordinates,
          zoom: 14,
        });

        setStatus("Current location detected.");

        if (destinationLocationRef.current) {
          drawRoute();
        }
      },

      (error) => {
        console.error(
          "Geolocation error:",
          error,
        );

        setStatus(
          "Unable to access your location. Please allow location access.",
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  };

  const findDestination = async () => {
    if (!destination.trim()) {
      setStatus("Enter a destination first.");
      return;
    }

    setStatus("Finding destination...");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          destination,
        )}`,
      );

      const results = await response.json();

      if (!results.length) {
        setStatus("Destination not found.");
        return;
      }

      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);

      const coordinates: [number, number] = [
        longitude,
        latitude,
      ];

      destinationLocationRef.current = coordinates;

      const map = mapRef.current;

      if (!map) return;

      destinationMarkerRef.current?.remove();

      destinationMarkerRef.current =
        new maplibregl.Marker()
          .setLngLat(coordinates)
          .addTo(map);

      map.flyTo({
        center: coordinates,
        zoom: 14,
      });

      setStatus("Destination found.");

      setDistance(null);
      setDuration(null);

      if (currentLocationRef.current) {
        drawRoute();
      }
    } catch (error) {
      console.error(
        "Destination search error:",
        error,
      );

      setStatus(
        "Unable to find destination.",
      );
    }
  };

  return (
    <div className="relative z-0 h-[420px] w-full overflow-hidden rounded-xl">
      <div
        ref={mapContainer}
        className="absolute inset-0 z-0 h-full w-full"
      />

      <div className="absolute left-4 top-4 z-10 w-[390px] rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-900">
            Route planning
          </p>

          <p className="text-xs text-slate-500">
            Set your current location and destination
          </p>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          className="mb-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          📍 Use my current location
        </button>

        <div className="flex gap-2">
          <input
            value={destination}
            onChange={(event) =>
              setDestination(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                findDestination();
              }
            }}
            placeholder="Enter destination"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
          />

          <button
            type="button"
            onClick={findDestination}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
          >
            Go
          </button>
        </div>

        {status && (
          <p className="mt-2 text-xs text-slate-500">
            {status}
          </p>
        )}

        {(distance || duration) && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <div>
              <p className="text-[11px] text-slate-500">
                Distance
              </p>

              <p className="text-sm font-bold text-slate-900">
                {distance}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-slate-500">
                Estimated time
              </p>

              <p className="text-sm font-bold text-slate-900">
                {duration}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GenericModule({
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
            subtitle="Demo data · updated a few minutes ago"
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

function EmptyState({
  icon: Icon,
  title,
  copy,
}: {
  icon: any;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon size={22} />
      </div>

      <p className="mt-4 text-sm font-bold text-slate-600">
        {title}
      </p>

      <p className="mt-1 max-w-[230px] text-[11px] leading-4 text-slate-400">
        {copy}
      </p>
    </div>
  );
}

function Dashboard({ user }: { user: SessionUser }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] =
    useState(false);

  let content: React.ReactNode;

  if (
    location.pathname === "/" ||
    location.pathname === "/admin" ||
    location.pathname === "/collector"
  ) {
    content = <Overview user={user} />;
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

export default function Index() {
  const [user, setUser] =
    useState<SessionUser | null>(() =>
      getSession(),
    );

  const location = useLocation();

  if (
    !user ||
    location.pathname === "/login" ||
    location.pathname === "/signup"
  ) {
    return (
      <AuthPage
        onAuthenticated={setUser}
      />
    );
  }

  return <Dashboard user={user} />;
}