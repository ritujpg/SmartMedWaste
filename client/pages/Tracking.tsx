import { useState } from "react";
import { Check, QrCode, Search } from "lucide-react";
import { CardTitle, PageHeading, StatusBadge } from "@/components/dashboard/primitives";
import { apiGet } from "@/lib/api";
import type { TrackingRecord } from "@/lib/types";
export function Tracking() {
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    const trackingId = search.trim().toUpperCase().replace(/^WM-/, "WM-");
    if (!trackingId) return;
    setLoading(true);
    try {
      setRecord(await apiGet<TrackingRecord>(`/api/tracking/${encodeURIComponent(trackingId)}`));
      setError("");
    } catch (err) {
      setRecord(null);
      setError(err instanceof Error ? err.message : "Tracking record could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

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
              onKeyDown={(e) => { if (e.key === "Enter") void lookup(); }}
              placeholder="Search WM-240184"
            />
          </div>

          <button className="secondary-button mt-2" onClick={() => void lookup()} disabled={loading}>
            {loading ? "Loading..." : "Find record"}
          </button>

          {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}

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
                Scanner placeholder - camera integration ready
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

              <h3 className="mt-1 text-lg font-bold text-navy">{record?.tracking_id || "No record selected"}</h3>

              <p className="mt-1 text-xs text-slate-500">
                {record ? `${record.category} bin - ${record.quantity_kg} kg` : "Search for a persistent tracking ID"}
              </p>

              {record && <StatusBadge status={record.status} />}
            </div>
          </div>
        </div>

        <div className="panel">
          <CardTitle
            title="Event history"
            subtitle="Complete chain of custody for this record"
          />

          <div className="timeline large-timeline">
            {(record?.events || []).map((event) => (
              <div className="timeline-item timeline-active" key={event.id}>
                <span className="timeline-node"><Check size={11} /></span>
                <div><p>{event.event_type}</p><span>{new Date(event.event_at).toLocaleString()}</span></div>
              </div>
            ))}
            {!record?.events?.length && (
              <p className="text-xs text-slate-500">No tracking events found.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
export default Tracking;
