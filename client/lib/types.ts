export type WasteCategory = "YELLOW" | "RED" | "WHITE" | "BLUE";
export type RequestStatus = "Requested" | "Assigned" | "Collector En Route" | "Picked Up" | "In Transit" | "Delivered" | "Processed";

export type CollectionRequest = {
  id: string;
  request_id: string;
  facility_id?: string | null;
  waste_record_id?: string | null;
  category: WasteCategory;
  quantity_kg: number;
  priority: "Normal" | "High" | "Emergency";
  special_handling?: string | null;
  pickup_location?: string | null;
  pickup_notes?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  collector_id?: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
};

export type TrackingEvent = {
  id: string;
  event_type: string;
  status: string;
  description?: string | null;
  event_at: string;
  metadata?: Record<string, unknown>;
};

export type TrackingRecord = {
  tracking_id: string;
  facility?: string | null;
  category: WasteCategory;
  quantity_kg: number;
  status: string;
  events: TrackingEvent[];
};
