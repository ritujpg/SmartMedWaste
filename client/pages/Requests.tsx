import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Check, ClipboardCheck, Clock3, MoreHorizontal, Plus, Search, Truck, Users, X, AlertTriangle } from "lucide-react";
import { CardTitle, EmptyState, PageHeading, StatCard, StatusBadge } from "@/components/dashboard/primitives";
import { categories, statuses } from "@/components/dashboard/data";
import { apiGet, apiPost } from "@/lib/api";
import type { CollectionRequest, WasteCategory } from "@/lib/types";

const categoryLabels: Record<WasteCategory, string> = { YELLOW: "Yellow", RED: "Red", WHITE: "White", BLUE: "Blue" };
type Request = CollectionRequest;
export function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] =
    useState("All priorities");

  const [selected, setSelected] =
    useState<Request | null>(null);

  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    apiGet<{ items: Request[] }>("/api/collection-requests")
      .then((response) => setRequests(response.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Requests could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter(
    (item) =>
      (!query ||
        `${item.request_id} ${item.facility_id || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (status === "All statuses" ||
        item.status === status) &&
      (priority === "All priorities" ||
        item.priority === priority),
  );

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);

    try {
      const next = await apiPost<Request>("/api/collection-requests", {
        category: String(data.get("category")).toUpperCase(),
        quantity_kg: Number(data.get("quantity")),
        priority: String(data.get("priority")),
        special_handling: String(data.get("handling") || ""),
        pickup_date: String(data.get("date")),
        pickup_time: String(data.get("time")),
        pickup_notes: String(data.get("notes") || ""),
      });
      setRequests((current) => [next, ...current]);
      setModal(false);
      setToast(`${next.request_id} created successfully`);
      setTimeout(() => setToast(""), 2800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request could not be created.");
    }
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
        {error && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</div>}
        {loading && <div className="mb-4 text-xs text-slate-500">Loading requests...</div>}
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
                  key={item.request_id}
                  onClick={() => setSelected(item)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="font-bold text-navy">
                    {item.request_id}
                  </td>

                  <td>{item.facility_id || "Assigned facility"}</td>

                  <td>
                    <span
                      className={`category-dot category-${item.category.toLowerCase()}`}
                    />
                    {categoryLabels[item.category] || item.category}
                  </td>

                  <td className="font-semibold">
                    {item.quantity_kg} kg
                  </td>

                  <td>
                    <span
                      className={`priority-${item.priority.toLowerCase()}`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  <td>{item.collector_id || "Unassigned"}</td>
                  <td>{item.pickup_date || "-"}{item.pickup_time ? `, ${item.pickup_time}` : ""}</td>

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

export default Requests;

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
              {item.request_id}
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
            value={item.facility_id || "Assigned facility"}
          />

          <Detail
            label="Category"
            value={`${categoryLabels[item.category] || item.category} bin`}
          />

          <Detail
            label="Quantity"
            value={`${item.quantity_kg} kg`}
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
            value={item.collector_id || "Unassigned"}
          />

          <Detail
            label="Destination"
            value="GreenCycle Treatment Centre"
          />

          <Detail
            label="Created"
            value="18 Jun 2024 - 09:12 AM"
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
