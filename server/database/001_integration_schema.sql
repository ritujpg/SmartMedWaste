-- Apply this migration to the target Supabase project before enabling optional fields.
-- It is intentionally idempotent and does not delete or rewrite existing rows.

alter table public.waste_records add column if not exists priority text not null default 'Normal';
alter table public.waste_records add column if not exists quantity_kg numeric(8,2) not null default 0;
alter table public.waste_records add column if not exists bin_recommended text;
alter table public.waste_records add column if not exists reason text;
alter table public.waste_records add column if not exists assessment_confidence numeric(5,4) default 0;
alter table public.waste_records add column if not exists requires_human_verification boolean not null default false;
alter table public.waste_records add column if not exists image_url text;

alter table public.tracking_events add column if not exists tracking_id text;
create index if not exists idx_tracking_events_tracking_id on public.tracking_events(tracking_id);

alter table public.collection_requests add column if not exists updated_at timestamptz not null default now();
alter table public.routes add column if not exists updated_at timestamptz not null default now();
