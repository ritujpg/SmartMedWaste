-- SmartMedWaste Supabase schema
-- Roles represented as lowercase strings: facility, collector, administrator

create extension if not exists pgcrypto;

create type public.user_role as enum ('facility', 'collector', 'administrator');
create type public.request_priority as enum ('Normal', 'High', 'Emergency');
create type public.request_status as enum ('Requested', 'Assigned', 'Collector En Route', 'Picked Up', 'In Transit', 'Delivered', 'Processed');
create type public.waste_category as enum ('YELLOW', 'RED', 'WHITE', 'BLUE');
create type public.emergency_priority as enum ('Low', 'Medium', 'High', 'Critical');
create type public.emergency_status as enum ('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed');

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  role public.user_role not null,
  organization text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_role on public.users(role);

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  address text,
  city text,
  state text,
  contact_name text,
  contact_phone text,
  compliance_score numeric(5,2) default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_facilities_name on public.facilities(name);
create index if not exists idx_facilities_user_id on public.facilities(user_id);

create table if not exists public.collectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  organization text,
  phone text,
  vehicle text,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_collectors_name on public.collectors(name);
create index if not exists idx_collectors_user_id on public.collectors(user_id);

create table if not exists public.waste_records (
  id uuid primary key default gen_random_uuid(),
  tracking_id text not null unique,
  facility_id uuid references public.facilities(id) on delete set null,
  collector_id uuid references public.collectors(id) on delete set null,
  category public.waste_category not null,
  quantity_kg numeric(8,2) not null default 0,
  priority text not null default 'Normal',
  bin_recommended text,
  reason text,
  assessment_confidence numeric(5,4) default 0,
  requires_human_verification boolean not null default false,
  image_url text,
  status text not null default 'Requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_waste_tracking_id on public.waste_records(tracking_id);
create index if not exists idx_waste_facility on public.waste_records(facility_id);
create index if not exists idx_waste_collector on public.waste_records(collector_id);
create index if not exists idx_waste_status on public.waste_records(status);

create table if not exists public.ai_classifications (
  id uuid primary key default gen_random_uuid(),
  waste_record_id uuid references public.waste_records(id) on delete cascade,
  provider text not null default 'gemini',
  provider_model text not null default 'gemini-3.6-flash',
  predicted_category public.waste_category not null,
  assessment_confidence numeric(5,4) not null,
  recommended_bin text not null,
  reason text not null,
  requires_human_verification boolean not null default true,
  image_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_waste_record on public.ai_classifications(waste_record_id);

create table if not exists public.collection_requests (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  waste_record_id uuid references public.waste_records(id) on delete set null,
  request_code varchar(100) not null unique,
  waste_category public.waste_category not null,
  estimated_quantity numeric not null default 0,
  quantity_unit varchar(50) not null default 'kg',
  priority public.request_priority not null default 'Normal',
  special_handling_requirement text,
  pickup_location text,
  notes text,
  preferred_pickup_date date,
  preferred_pickup_time time,
  assigned_collector_id uuid references public.collectors(id) on delete set null,
  destination text,
  estimated_arrival timestamptz,
  status public.request_status not null default 'Requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_collection_requests_facility on public.collection_requests(facility_id);
create index if not exists idx_collection_requests_collector on public.collection_requests(collector_id);
create index if not exists idx_collection_requests_status on public.collection_requests(status);

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  waste_record_id uuid references public.waste_records(id) on delete cascade,
  request_id uuid references public.collection_requests(id) on delete set null,
  event_type text not null,
  status text not null,
  description text,
  actor_user_id uuid references public.users(id) on delete set null,
  event_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_tracking_waste_record on public.tracking_events(waste_record_id);
create index if not exists idx_tracking_request on public.tracking_events(request_id);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  collector_id uuid references public.collectors(id) on delete set null,
  vehicle text,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.routes(id) on delete cascade,
  request_id uuid references public.collection_requests(id) on delete cascade,
  stop_order integer not null default 1,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_route_stops_route on public.route_stops(route_id);

create table if not exists public.emergency_requests (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  waste_record_id uuid references public.waste_records(id) on delete set null,
  request_id text not null unique,
  priority public.emergency_priority not null default 'High',
  description text not null,
  status public.emergency_status not null default 'Open',
  assigned_collector_id uuid references public.collectors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_emergency_facility on public.emergency_requests(facility_id);
create index if not exists idx_emergency_status on public.emergency_requests(status);

create table if not exists public.green_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  waste_record_id uuid references public.waste_records(id) on delete set null,
  type text not null default 'earned',
  points int not null default 0,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_green_user on public.green_credit_transactions(user_id);
create index if not exists idx_green_facility on public.green_credit_transactions(facility_id);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  severity text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_alerts_facility on public.alerts(facility_id);
create index if not exists idx_alerts_user on public.alerts(user_id);

create table if not exists public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  score numeric(5,2) not null default 0,
  status text not null default 'monitoring',
  issues jsonb default '[]'::jsonb,
  audit_information jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_compliance_facility on public.compliance_records(facility_id);

create table if not exists public.analytics_heatmap (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  lat numeric(9,6),
  lng numeric(9,6),
  waste_volume_kg numeric(10,2) default 0,
  category public.waste_category,
  created_at timestamptz not null default now()
);

create index if not exists idx_heatmap_facility on public.analytics_heatmap(facility_id);
