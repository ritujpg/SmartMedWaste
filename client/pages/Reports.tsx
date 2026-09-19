import { FormEvent, useEffect, useState } from "react";
import { ClipboardList, FileBarChart, ShieldCheck, Sparkles, Weight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { SessionUser } from "@/lib/auth";
import { CardTitle, PageHeading, StatCard } from "@/components/dashboard/primitives";

type ReportResponse = {
  start_date: string;
  end_date: string;
  waste_generation: { total_kg: number; record_count: number; daily: { date: string; quantity_kg: number }[] };
  waste_categories: { category: string; quantity_kg: number; record_count: number }[];
  collection_requests: { record_count: number; by_status: Record<string, number>; records: Record<string, unknown>[] };
  ai_classifications: { record_count: number; records: Record<string, unknown>[] };
  compliance: { record_count: number; records: Record<string, unknown>[] };
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
}

function emptyState(label: string) {
  return <p className="py-8 text-center text-sm text-slate-500">No {label} records in this date range.</p>;
}

export default function ReportsPage({ user: _user }: { user: SessionUser }) {
  const [startDate, setStartDate] = useState(daysAgo(29));
  const [endDate, setEndDate] = useState(today());
  const [appliedDates, setAppliedDates] = useState({ start: daysAgo(29), end: today() });
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ start_date: appliedDates.start, end_date: appliedDates.end });
    apiGet<ReportResponse>(`/api/reports?${query.toString()}`)
      .then(setReport)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Reports could not be loaded."))
      .finally(() => setLoading(false));
  }, [appliedDates]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startDate <= endDate) setAppliedDates({ start: startDate, end: endDate });
  };

  return (
    <>
      <PageHeading
        eyebrow="Operational intelligence"
        title="Waste Reports"
        subtitle="Review persisted waste, collection, classification, and compliance records."
        action={<FileBarChart size={20} className="text-teal" />}
      />

      <form onSubmit={applyFilters} className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          From
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          To
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700" type="date" value={endDate} min={startDate} max={today()} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <button type="submit" className="primary-button" disabled={loading}>Apply filters</button>
        <span className="text-xs text-slate-500">Showing {appliedDates.start} to {appliedDates.end}</span>
      </form>

      {error && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</div>}
      {loading && <div className="panel text-sm text-slate-500">Loading persisted reports...</div>}
      {!loading && report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={Weight} label="Waste generated" value={`${report.waste_generation.total_kg.toFixed(1)} kg`} tone="tone-teal" />
            <StatCard icon={FileBarChart} label="Waste records" value={String(report.waste_generation.record_count)} tone="tone-blue" />
            <StatCard icon={ClipboardList} label="Collection requests" value={String(report.collection_requests.record_count)} tone="tone-amber" />
            <StatCard icon={Sparkles} label="AI classifications" value={String(report.ai_classifications.record_count)} tone="tone-purple" />
            <StatCard icon={ShieldCheck} label="Compliance records" value={String(report.compliance.record_count)} tone="tone-green" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <section className="panel">
              <CardTitle title="Waste generation" subtitle="Persisted waste quantities by day" />
              {report.waste_generation.daily.length ? <div className="divide-y divide-slate-100">{report.waste_generation.daily.map((item) => <div key={item.date} className="flex justify-between py-3 text-sm"><span className="text-slate-600">{item.date}</span><strong className="text-navy">{item.quantity_kg.toFixed(2)} kg</strong></div>)}</div> : emptyState("waste generation")}
            </section>

            <section className="panel">
              <CardTitle title="Waste categories" subtitle="Persisted quantity by category" />
              {report.waste_categories.length ? <div className="divide-y divide-slate-100">{report.waste_categories.map((item) => <div key={item.category} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="font-semibold text-slate-700">{item.category}</span><span className="text-slate-500">{item.record_count} records</span><strong className="text-navy">{item.quantity_kg.toFixed(2)} kg</strong></div>)}</div> : emptyState("waste category")}
            </section>

            <section className="panel">
              <CardTitle title="Collection requests" subtitle="Persisted requests grouped by status" />
              {Object.keys(report.collection_requests.by_status).length ? <div className="divide-y divide-slate-100">{Object.entries(report.collection_requests.by_status).map(([status, count]) => <div key={status} className="flex justify-between py-3 text-sm"><span className="text-slate-600">{status}</span><strong className="text-navy">{count}</strong></div>)}</div> : emptyState("collection request")}
            </section>

            <section className="panel">
              <CardTitle title="AI classification records" subtitle="Persisted classification decisions and confidence" />
              {report.ai_classifications.records.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-400"><th className="py-2 pr-3">Category</th><th className="py-2 pr-3">Provider</th><th className="py-2 pr-3">Confidence</th><th className="py-2">Review</th></tr></thead><tbody>{report.ai_classifications.records.map((item, index) => <tr key={String(item.id || index)} className="border-b border-slate-100"><td className="py-3 pr-3 font-semibold text-navy">{String(item.predicted_category || "--")}</td><td className="py-3 pr-3 text-slate-600">{String(item.provider || "--")}</td><td className="py-3 pr-3 text-slate-600">{item.assessment_confidence == null ? "--" : `${(Number(item.assessment_confidence) * 100).toFixed(0)}%`}</td><td className="py-3 text-slate-600">{item.requires_human_verification ? "Required" : "Not flagged"}</td></tr>)}</tbody></table></div> : emptyState("AI classification")}
            </section>

            <section className="panel xl:col-span-2">
              <CardTitle title="Compliance records" subtitle="Persisted compliance assessments only" />
              {report.compliance.records.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-400"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Score</th><th className="py-2 pr-3">Status</th><th className="py-2">Issues</th></tr></thead><tbody>{report.compliance.records.map((item, index) => <tr key={String(item.id || index)} className="border-b border-slate-100"><td className="py-3 pr-3 text-slate-600">{String(item.created_at || "--").slice(0, 10)}</td><td className="py-3 pr-3 font-semibold text-navy">{item.score == null ? "--" : String(item.score)}</td><td className="py-3 pr-3 text-slate-600">{String(item.status || "--")}</td><td className="py-3 text-slate-600">{Array.isArray(item.issues) ? item.issues.length : "--"}</td></tr>)}</tbody></table></div> : emptyState("compliance")}
            </section>
          </div>
        </>
      )}
    </>
  );
}