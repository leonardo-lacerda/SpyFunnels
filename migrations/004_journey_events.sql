create table if not exists journey_events (
  id uuid primary key,
  competitor_id uuid not null references competitors(id) on delete cascade,
  run_id uuid references simulation_runs(id) on delete set null,
  step_id uuid references simulation_steps(id) on delete set null,
  event_type text not null,
  source_channel text,
  source_ref text,
  from_url text,
  to_url text,
  payload_json jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_journey_events_competitor_id on journey_events(competitor_id);
create index if not exists idx_journey_events_run_id on journey_events(run_id);
create index if not exists idx_journey_events_step_id on journey_events(step_id);
create index if not exists idx_journey_events_event_type on journey_events(event_type);
create index if not exists idx_journey_events_observed_at on journey_events(observed_at desc);
create unique index if not exists idx_journey_events_unique_step_event
  on journey_events(run_id, step_id, event_type);
