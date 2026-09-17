import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, Bell, ChevronDown, CircleHelp, ClipboardCheck, FileBarChart, Gauge, Hospital, Leaf, LogOut, Menu, QrCode, ScanLine, Settings, ShieldCheck, Truck, Users, X } from "lucide-react";
import { signOut, SessionUser } from "@/lib/auth";

const navItems = [
  { label: "Overview", icon: Gauge, path: "/" },
  { label: "AI Waste Scanner", icon: ScanLine, path: "/scanner", badge: "New" },
  { label: "Waste Requests", icon: ClipboardCheck, path: "/requests" },
  { label: "Tracking", icon: QrCode, path: "/tracking" },
  { label: "Compliance", icon: ShieldCheck, path: "/compliance" },
  { label: "Green Credits", icon: Leaf, path: "/credits" },
  { label: "Alerts", icon: Bell, path: "/alerts" },
  { label: "Reports", icon: FileBarChart, path: "/reports" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

type NavItem = typeof navItems[number];

export function Brand() {
  return <Link to="/" className="flex items-center gap-3 px-2"><span className="brand-mark"><Activity size={20} strokeWidth={2.8} /></span><span className="text-[17px] font-bold tracking-[-0.03em] text-white">SmartMed<span className="text-mint">Waste</span></span></Link>;
}

function NavigationItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return <Link to={item.path} className={`nav-item ${active ? "nav-item-active" : ""}`}><Icon size={17} /><span>{item.label}</span>{item.badge && <span className="ml-auto rounded bg-mint/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-mint">{item.badge}</span>}</Link>;
}

export function Sidebar({ user, open, onClose }: { user: SessionUser; open: boolean; onClose: () => void }) {
  const location = useLocation();
  const roleItems: NavItem[] = user.role === "collector"
    ? [{ label: "Dashboard", icon: Gauge, path: "/collector" }, { label: "Today's Pickups", icon: ClipboardCheck, path: "/requests" }, { label: "Route", icon: Truck, path: "/route" }, { label: "Scan Waste", icon: ScanLine, path: "/scanner" }, { label: "Emergency Alerts", icon: Bell, path: "/alerts" }, { label: "History", icon: FileBarChart, path: "/reports" }, { label: "Profile", icon: Settings, path: "/settings" }]
    : user.role === "admin"
      ? [{ label: "Overview", icon: Gauge, path: "/admin" }, { label: "Facilities", icon: Hospital, path: "/facilities" }, { label: "Collectors", icon: Users, path: "/collectors" }, { label: "Waste Tracking", icon: QrCode, path: "/tracking" }, { label: "Compliance", icon: ShieldCheck, path: "/compliance" }, { label: "Heatmap", icon: Activity, path: "/heatmap" }, { label: "Routes", icon: Truck, path: "/route" }, { label: "Alerts", icon: Bell, path: "/alerts" }, { label: "Reports", icon: FileBarChart, path: "/reports" }]
      : navItems;
  return <aside className={`sidebar ${open ? "sidebar-open" : ""}`}><div className="flex items-center justify-between px-5 py-5"><Brand /><button className="mobile-close" onClick={onClose}><X size={20} /></button></div><div className="mx-5 mb-6 mt-3 rounded-xl border border-white/10 bg-white/[.06] p-3"><div className="flex items-center gap-3"><div className="facility-avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{user.organization}</p><p className="mt-0.5 truncate text-[11px] text-slate-400">{user.role === "facility" ? "Facility workspace" : user.role === "collector" ? "Collector workspace" : "Operations workspace"}</p></div><ChevronDown size={14} className="ml-auto text-slate-500" /></div></div><div className="sidebar-scroll"><div className="px-4"><p className="eyebrow px-3 pb-2 text-slate-500">Workspace</p>{roleItems.slice(0, 6).map((item) => <NavigationItem key={item.label} item={item} active={location.pathname === item.path} />)}</div><div className="mt-7 px-4"><p className="eyebrow px-3 pb-2 text-slate-500">Manage</p>{roleItems.slice(6).map((item) => <NavigationItem key={item.label} item={item} active={location.pathname === item.path} />)}{user.role !== "admin" && <NavigationItem item={{ label: "Settings", icon: Settings, path: "/settings" }} active={location.pathname === "/settings"} />}</div></div><div className="mt-auto px-5 pb-5"><div className="support-card"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/15 text-mint"><CircleHelp size={16} /></span><span className="text-[10px] font-semibold uppercase tracking-wider text-mint">Support</span></div><p className="mt-3 text-xs font-semibold text-white">Need help with a pickup?</p><p className="mt-1 text-[11px] leading-4 text-slate-400">Our operations team is online.</p><Link to="/support" className="mt-3 inline-block text-xs font-semibold text-mint hover:text-white">Contact support</Link></div><p className="mt-5 text-center text-[10px] text-slate-600">SmartMedWaste v1.0</p></div></aside>;
}

export function Header({ user, onMenu }: { user: SessionUser; onMenu: () => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return <header className="topbar"><button className="mobile-menu" onClick={onMenu}><Menu size={21} /></button><div className="hidden items-center gap-2 text-sm text-slate-500 md:flex"><span>{user.role === "admin" ? "Operations" : user.role === "collector" ? "Collections" : "Facilities"}</span><span className="text-slate-300">/</span><span className="font-medium text-navy">{user.organization}</span></div><div className="ml-auto flex items-center gap-3"><button className="icon-button relative" onClick={() => navigate("/alerts")}><Bell size={19} /><span className="notification-dot" /></button><div className="hidden h-6 w-px bg-slate-200 sm:block" /><div className="relative"><button onClick={() => setOpen(!open)} className="flex items-center gap-2.5"><div className="profile-avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="hidden text-left sm:block"><p className="text-xs font-bold text-navy">{user.name}</p><p className="text-[10px] text-slate-500">{user.role === "facility" ? "Facility admin" : user.role === "collector" ? "Waste collector" : "Administrator"}</p></div><ChevronDown size={14} className="text-slate-400" /></button>{open && <div className="profile-menu"><div className="border-b border-slate-100 px-3 py-2"><p className="text-xs font-bold text-navy">{user.email}</p><p className="mt-0.5 text-[10px] text-slate-400">Authenticated session</p></div><button onClick={() => navigate("/settings")}><Settings size={14} /> Profile settings</button><button onClick={() => { signOut(); navigate("/login"); }} className="text-rose-600"><LogOut size={14} /> Log out</button></div>}</div></div></header>;
}
