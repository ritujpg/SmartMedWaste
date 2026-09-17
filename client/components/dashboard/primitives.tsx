import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  tone,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  tone: string;
  note?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <span className={`stat-icon ${tone}`}><Icon size={18} /></span>
        {change && (
          <span className={`trend ${change.startsWith("+") ? "trend-up" : "trend-down"}`}>
            {change.startsWith("+") ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {change}
          </span>
        )}
      </div>
      <p className="mt-4 text-[12px] font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-[25px] font-bold tracking-[-.04em] text-navy">{value}</p>
        {note && <span className="text-[11px] text-slate-400">{note}</span>}
      </div>
    </div>
  );
}

export function CardTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: string }) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <div>
        <h3 className="text-[14px] font-bold text-navy">{title}</h3>
        {subtitle && <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {action && <button className="text-[11px] font-bold text-teal hover:text-navy">{action}</button>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const style = key.includes("emergency") || key.includes("critical")
    ? "status-red"
    : key.includes("requested") || key.includes("pending")
      ? "status-amber"
      : key.includes("transit") || key.includes("assigned")
        ? "status-blue"
        : key.includes("processed") || key.includes("delivered") || key.includes("picked")
          ? "status-green"
          : "status-slate";
  return <span className={`status-badge ${style}`}><span className="status-dot" />{status}</span>;
}

export function QuickAction({ icon: Icon, label, to }: { icon: LucideIcon; label: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs font-bold text-navy hover:border-mint hover:bg-mint-pale">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal shadow-sm"><Icon size={15} /></span>
      {label}
    </Link>
  );
}

export function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow text-teal">{eyebrow}</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-[-.04em] text-navy sm:text-[30px]">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex gap-2">{action}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, copy }: { icon: LucideIcon; title: string; copy: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Icon size={22} /></div>
      <p className="mt-4 text-sm font-bold text-slate-600">{title}</p>
      <p className="mt-1 max-w-[230px] text-[11px] leading-4 text-slate-400">{copy}</p>
    </div>
  );
}
