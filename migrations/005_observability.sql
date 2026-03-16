create table if not exists kpi_benchmark_runs (
  id uuid primary key,
  dataset_version text not null,
  total_cases integer not null,
  metrics_json jsonb not null,
  checks_json jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_kpi_benchmark_runs_generated_at
  on kpi_benchmark_runs(generated_at desc);

create table if not exists service_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  metric_name text not null,
  metric_type text not null,
  metric_labels_json jsonb,
  metric_value numeric(18,6) not null,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_service_metrics_snapshots_service
  on service_metrics_snapshots(service_name, observed_at desc);
create index if not exists idx_service_metrics_snapshots_metric
  on service_metrics_snapshots(metric_name, observed_at desc);
