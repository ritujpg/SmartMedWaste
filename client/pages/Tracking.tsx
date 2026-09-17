import { useState } from "react";
import { Check, QrCode, Search } from "lucide-react";
import { CardTitle, PageHeading, StatusBadge } from "@/components/dashboard/primitives";
import { requestSeed } from "@/components/dashboard/data";
export function Tracking() {
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

              <h3 className="mt-1 text-lg font-bold text-navy">
                WM-{match.id.slice(4)}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {match.facility} - {match.quantity} -{" "}
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
                      ? `18 Jun 2024 - ${
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
export default Tracking;
