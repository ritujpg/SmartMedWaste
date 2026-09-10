import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileBarChart,
  FileText,
  Gauge,
  ImagePlus,
  Leaf,
  Menu,
  MoreHorizontal,
  PackageCheck,
  QrCode,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  UploadCloud,
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
  { label: "AI Waste Scanner", icon: ScanLine, path: "/scanner", badge: "New" },
  { label: "Waste Requests", icon: ClipboardCheck, path: "/requests" },
  { label: "Tracking", icon: QrCode, path: "/tracking" },
  { label: "Compliance", icon: ShieldCheck, path: "/compliance" },
  { label: "Green Credits", icon: Leaf, path: "/credits" },
  { label: "Alerts", icon: Bell, path: "/alerts", count: 3 },
  { label: "Reports", icon: FileBarChart, path: "/reports" },
];

const wasteTrend = [
  { day: "Mon", value: 31 }, { day: "Tue", value: 42 }, { day: "Wed", value: 35 },
  { day: "Thu", value: 48 }, { day: "Fri", value: 45 }, { day: "Sat", value: 52 }, { day: "Sun", value: 46 },
];
const accuracyTrend = [
  { day: "Mon", value: 91 }, { day: "Tue", value: 94 }, { day: "Wed", value: 92 },
  { day: "Thu", value: 96 }, { day: "Fri", value: 95 }, { day: "Sat", value: 97 }, { day: "Sun", value: 96 },
];
const categoryData = [
  { name: "Yellow", value: 42, color: "#e7b94a" },
  { name: "Red", value: 26, color: "#e5766c" },
  { name: "Blue", value: 18, color: "#6aa8d7" },
  { name: "White", value: 14, color: "#b6c4d5" },
];
const activity = [
  { id: "WM-240184", category: "Yellow", qty: "12.4 kg", status: "In transit", time: "Today, 10:30 AM", collector: "Arjun Mehta", color: "yellow" },
  { id: "WM-240183", category: "Red", qty: "8.2 kg", status: "Collected", time: "Today, 08:45 AM", collector: "Priya Nair", color: "red" },
  { id: "WM-240182", category: "White", qty: "5.8 kg", status: "Pending", time: "Tomorrow, 09:00 AM", collector: "Unassigned", color: "slate" },
  { id: "WM-240181", category: "Blue", qty: "3.1 kg", status: "Processed", time: "Yesterday, 04:20 PM", collector: "Arjun Mehta", color: "blue" },
];

function Brand() {
  return <Link to="/" className="flex items-center gap-3 px-2"><span className="brand-mark"><Activity size={20} strokeWidth={2.8} /></span><span className="text-[17px] font-bold tracking-[-0.03em] text-white">SmartMed<span className="text-mint">Waste</span></span></Link>;
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  return <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
    <div className="flex items-center justify-between px-5 py-5"><Brand /><button className="mobile-close" onClick={onClose}><X size={20} /></button></div>
    <div className="mx-5 mb-6 mt-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
      <div className="flex items-center gap-3"><div className="facility-avatar">AI</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">Apollo Hospitals</p><p className="mt-0.5 truncate text-[11px] text-slate-400">Facility workspace</p></div><ChevronDown size={14} className="ml-auto text-slate-500" /></div>
    </div>
    <div className="px-4"><p className="eyebrow px-3 pb-2 text-slate-500">Workspace</p>{navItems.slice(0, 6).map((item) => <NavItem key={item.label} item={item} active={location.pathname === item.path} />)}</div>
    <div className="mt-7 px-4"><p className="eyebrow px-3 pb-2 text-slate-500">Manage</p>{navItems.slice(6).map((item) => <NavItem key={item.label} item={item} active={location.pathname === item.path} />)}<NavItem item={{ label: "Settings", icon: Settings, path: "/settings" }} active={location.pathname === "/settings"} /></div>
    <div className="mt-auto px-5 pb-5"><div className="support-card"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/15 text-mint"><CircleHelp size={16} /></span><span className="text-[10px] font-semibold uppercase tracking-wider text-mint">Support</span></div><p className="mt-3 text-xs font-semibold text-white">Need help with a pickup?</p><p className="mt-1 text-[11px] leading-4 text-slate-400">Our operations team is online.</p><button className="mt-3 text-xs font-semibold text-mint hover:text-white">Contact support →</button></div><p className="mt-5 text-center text-[10px] text-slate-600">SmartMedWaste v1.0 · Demo workspace</p></div>
  </aside>;
}
function NavItem({ item, active }: { item: any; active: boolean }) { const Icon = item.icon; return <Link to={item.path} className={`nav-item ${active ? "nav-item-active" : ""}`}><Icon size={17} /><span>{item.label}</span>{item.badge && <span className="ml-auto rounded bg-mint/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-mint">{item.badge}</span>}{item.count && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{item.count}</span>}</Link>; }

function Header({ onMenu }: { onMenu: () => void }) { return <header className="topbar"><button className="mobile-menu" onClick={onMenu}><Menu size={21} /></button><div className="hidden items-center gap-2 text-sm text-slate-500 md:flex"><span>Facilities</span><span className="text-slate-300">/</span><span className="font-medium text-navy">Apollo Hospitals</span></div><div className="ml-auto flex items-center gap-3"><button className="icon-button relative"><Bell size={19} /><span className="notification-dot" /></button><div className="hidden h-6 w-px bg-slate-200 sm:block" /><div className="flex items-center gap-2.5"><div className="profile-avatar">RK</div><div className="hidden text-left sm:block"><p className="text-xs font-bold text-navy">Riya Kapoor</p><p className="text-[10px] text-slate-500">Facility admin</p></div><ChevronDown size={14} className="text-slate-400" /></div></div></header>; }

function StatCard({ icon: Icon, label, value, change, tone, note }: { icon: any; label: string; value: string; change?: string; tone: string; note?: string }) { return <div className="stat-card"><div className="flex items-start justify-between"><span className={`stat-icon ${tone}`}><Icon size={18} /></span>{change && <span className={`trend ${change.startsWith("+") ? "trend-up" : "trend-down"}`}>{change.startsWith("+") ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{change}</span>}</div><p className="mt-4 text-[12px] font-medium text-slate-500">{label}</p><div className="mt-1 flex items-baseline gap-2"><p className="text-[25px] font-bold tracking-[-0.04em] text-navy">{value}</p>{note && <span className="text-[11px] text-slate-400">{note}</span>}</div></div>; }
function StatusBadge({ status }: { status: string }) { const styles: Record<string, string> = { "In transit": "status-blue", Collected: "status-green", Pending: "status-amber", Processed: "status-slate" }; return <span className={`status-badge ${styles[status] || "status-slate"}`}><span className="status-dot" />{status}</span>; }
function CardTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: string }) { return <div className="mb-5 flex items-start justify-between"><div><h3 className="text-[14px] font-bold text-navy">{title}</h3>{subtitle && <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>}</div>{action && <button className="text-[11px] font-bold text-teal hover:text-navy">{action}</button>}</div>; }

function Overview() {
  const [showToast, setShowToast] = useState(false);
  return <>
    <div className="page-heading"><div><p className="eyebrow text-teal">Tuesday, 18 June 2024</p><h1 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-navy sm:text-[30px]">Good morning, Riya <span className="wave">✦</span></h1><p className="mt-1.5 text-sm text-slate-500">Here’s what’s happening across Apollo Hospitals today.</p></div><div className="flex gap-2"><button className="secondary-button hidden sm:flex"><FileText size={15} /> Export report</button><Link to="/scanner" className="primary-button"><ScanLine size={16} /> <span className="hidden sm:inline">Scan waste</span><span className="sm:hidden">Scan</span></Link></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard icon={PackageCheck} label="Waste generated today" value="46.2 kg" change="+8.4%" tone="tone-teal" note="vs yesterday" /><StatCard icon={Truck} label="Pending collections" value="07" change="-12.5%" tone="tone-blue" note="2 urgent" /><StatCard icon={Sparkles} label="Segregation accuracy" value="96.4%" change="+2.1%" tone="tone-purple" note="this week" /><StatCard icon={ShieldCheck} label="Compliance score" value="92 / 100" change="+4.6%" tone="tone-green" /><StatCard icon={Leaf} label="Green credits" value="2,840" change="+180" tone="tone-amber" note="this month" /></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]"><div className="panel"><CardTitle title="Waste generated" subtitle="Total volume across all categories · Last 7 days" action="View report" /><div className="h-[220px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={wasteTrend} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}><defs><linearGradient id="wasteFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#23a58a" stopOpacity={0.22} /><stop offset="100%" stopColor="#23a58a" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf1f4" /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#8b9aaa", fontSize: 11 }} dy={10} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#9aa7b5", fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5ebef", boxShadow: "0 8px 20px rgba(12,43,70,.08)", fontSize: 12 }} /><Area type="monotone" dataKey="value" stroke="#159b83" strokeWidth={2.5} fill="url(#wasteFill)" /></AreaChart></ResponsiveContainer></div><div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500"><span className="inline-block h-2 w-2 rounded-full bg-teal" /> <span>Average daily volume</span><strong className="ml-auto text-navy">42.7 kg</strong><span className="text-emerald-600">+6.8%</span></div></div>
      <div className="panel"><CardTitle title="Waste by category" subtitle="Distribution by bin type" action="Details" /><div className="flex items-center gap-4"><div className="relative h-[160px] w-[160px] shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={51} outerRadius={72} paddingAngle={3} stroke="none">{categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[24px] font-bold text-navy">46.2</span><span className="text-[10px] text-slate-500">total kg</span></div></div><div className="flex-1 space-y-3">{categoryData.map((item) => <div key={item.name} className="flex items-center gap-2 text-[11px]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-slate-500">{item.name} bin</span><strong className="ml-auto text-navy">{item.value}%</strong></div>)}</div></div><div className="mt-4 rounded-lg bg-mint-pale px-3 py-2.5 text-[11px] text-teal"><span className="font-bold">Good sorting habits.</span> Yellow waste is your highest category this week.</div></div></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]"><div className="panel"><CardTitle title="Recent waste activity" subtitle="Latest records from your facility" action="View all records" /><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Waste ID</th><th>Category</th><th>Quantity</th><th>Status</th><th className="hidden lg:table-cell">Collection time</th><th className="hidden md:table-cell">Collector</th><th /></tr></thead><tbody>{activity.map((row) => <tr key={row.id}><td><span className="font-bold text-navy">{row.id}</span><span className="mt-0.5 block text-[10px] text-slate-400">Generated today</span></td><td><span className={`category-dot category-${row.color}`} />{row.category}</td><td className="font-semibold text-slate-700">{row.qty}</td><td><StatusBadge status={row.status} /></td><td className="hidden text-slate-500 lg:table-cell">{row.time}</td><td className="hidden text-slate-500 md:table-cell">{row.collector}</td><td><button className="text-slate-400 hover:text-navy"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div></div>
      <div className="panel"><CardTitle title="Compliance health" subtitle="Your facility performance" action="Audit details" /><div className="flex items-center gap-5"><div className="score-ring"><div><span>92</span><small>/ 100</small></div></div><div><p className="text-sm font-bold text-navy">Excellent standing</p><p className="mt-1 text-[11px] leading-4 text-slate-500">You’re above the 85% compliance benchmark.</p><div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><ArrowUpRight size={13} /> 4.6% from last month</div></div></div><div className="mt-6 border-t border-slate-100 pt-4"><div className="mb-2 flex justify-between text-[11px]"><span className="text-slate-500">Segregation accuracy</span><strong className="text-navy">96.4%</strong></div><div className="progress-track"><div className="progress-fill w-[96.4%]" /></div><div className="mt-3 mb-2 flex justify-between text-[11px]"><span className="text-slate-500">Collection timeliness</span><strong className="text-navy">88.1%</strong></div><div className="progress-track"><div className="progress-fill progress-blue w-[88.1%]" /></div></div></div></div>
    {showToast && <div className="toast"><Check size={16} /> Report export prepared <button onClick={() => setShowToast(false)}><X size={14} /></button></div>}
  </>;
}

function Scanner() {
  const [classified, setClassified] = useState(false); const [confirmed, setConfirmed] = useState(false); const [fileName, setFileName] = useState("");
  const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files?.[0]) { setFileName(event.target.files[0].name); setClassified(false); setConfirmed(false); } };
  return <><div className="page-heading"><div><p className="eyebrow text-teal">AI-assisted workflow</p><h1 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-navy sm:text-[30px]">AI Waste Scanner</h1><p className="mt-1.5 text-sm text-slate-500">Identify waste categories faster with an assistive visual classification.</p></div><div className="flex items-center gap-2 rounded-full border border-mint/30 bg-mint-pale px-3 py-2 text-[11px] font-semibold text-teal"><span className="pulse-dot" /> Model ready · v2.4</div></div><div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" /><div><p className="text-xs font-bold">Verification required</p><p className="mt-0.5 text-[11px] leading-4 text-amber-800/80">AI recommendations are assistive only. Always verify classifications against your facility’s biomedical-waste rules before disposal.</p></div></div><div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]"><div className="panel"><CardTitle title="Upload waste image" subtitle="Use a clear image of the waste item and its container." /><label className={`upload-zone ${fileName ? "upload-zone-filled" : ""}`}><input type="file" accept="image/*" onChange={onUpload} className="hidden" />{fileName ? <><div className="upload-icon bg-mint-pale text-teal"><Check size={22} /></div><p className="mt-3 text-sm font-bold text-navy">{fileName}</p><p className="mt-1 text-[11px] text-slate-500">Ready for classification</p></> : <><div className="upload-icon"><UploadCloud size={22} /></div><p className="mt-3 text-sm font-bold text-navy">Drop an image here or browse</p><p className="mt-1 text-[11px] text-slate-500">JPG, PNG or HEIC · Max 10 MB</p></>}<span className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-navy"><ImagePlus size={14} /> Choose image</span></label><div className="mt-4 flex gap-3"><button className="secondary-button flex-1"><ScanLine size={15} /> Use camera</button><button className="primary-button flex-1" disabled={!fileName} onClick={() => setClassified(true)}><Sparkles size={15} /> Classify waste</button></div><p className="mt-4 text-center text-[10px] text-slate-400">Images are processed locally in this demo workspace.</p></div><div className="panel"><CardTitle title="Classification result" subtitle="Review the recommendation before creating a record." />{!classified ? <div className="flex min-h-[292px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Sparkles size={22} /></div><p className="mt-4 text-sm font-bold text-slate-600">No classification yet</p><p className="mt-1 max-w-[210px] text-[11px] leading-4 text-slate-400">Upload an image to see the predicted category, confidence and handling guidance.</p></div> : <div className="result-wrap"><div className="flex items-start justify-between"><div><span className="result-label">Predicted category</span><div className="mt-1 flex items-center gap-2"><span className="category-dot category-yellow" /><span className="text-[22px] font-bold text-navy">Yellow bin</span></div></div><span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700">AI suggestion</span></div><div className="mt-5 flex items-center gap-4 rounded-xl bg-slate-50 p-3"><div className="confidence-ring"><span>94%</span></div><div><p className="text-xs font-bold text-navy">High confidence</p><p className="mt-1 text-[11px] leading-4 text-slate-500">The model detected contaminated recyclable medical waste.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="result-detail"><span>Recommended bin</span><strong>Yellow</strong></div><div className="result-detail"><span>Waste ID</span><strong>WM-240185</strong></div><div className="result-detail col-span-2"><span>Safety instruction</span><strong>Seal securely · Do not compact</strong></div></div>{confirmed ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-mint-pale p-3 text-xs font-bold text-teal"><Check size={16} /> Classification confirmed. Waste record created.</div> : <div className="mt-4 flex gap-2"><button className="primary-button flex-1" onClick={() => setConfirmed(true)}><Check size={15} /> Confirm classification</button><button className="icon-action" title="Report incorrect classification"><AlertTriangle size={15} /></button><button className="icon-action" title="Re-scan" onClick={() => { setClassified(false); setFileName(""); }}><ScanLine size={15} /></button></div>}<p className="mt-3 text-[10px] text-slate-400">Classified 18 Jun 2024 · 11:42 AM · Review before disposal</p></div>}</div></div><div className="mt-4 grid gap-4 md:grid-cols-3"><div className="mini-info"><ShieldCheck size={17} className="text-teal" /><div><p className="text-xs font-bold text-navy">Human-in-the-loop</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Low-confidence results are never auto-approved.</p></div></div><div className="mini-info"><QrCode size={17} className="text-blue-500" /><div><p className="text-xs font-bold text-navy">Traceable records</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Confirming creates a QR-ready waste record.</p></div></div><div className="mini-info"><Zap size={17} className="text-amber-500" /><div><p className="text-xs font-bold text-navy">Built for speed</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Reduce sorting decisions at the point of disposal.</p></div></div></div></>;
}

function Placeholder() { const location = useLocation(); const label = useMemo(() => navItems.find((item) => item.path === location.pathname)?.label || "Workspace" , [location.pathname]); return <div className="panel flex min-h-[500px] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-pale text-teal"><BarChart3 size={25} /></div><h1 className="mt-5 text-xl font-bold text-navy">{label}</h1><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">This workspace is ready for your operational data. Continue prompting to expand this module with full workflows and reports.</p><Link to="/" className="primary-button mt-5">Back to overview</Link></div>; }

export default function Index() { const location = useLocation(); const [menuOpen, setMenuOpen] = useState(false); const content = location.pathname === "/" ? <Overview /> : location.pathname === "/scanner" ? <Scanner /> : <Placeholder />; return <div className="app-shell"><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />{menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}<main className="main-area"><Header onMenu={() => setMenuOpen(true)} /><div className="content-area">{content}</div></main></div>; }
