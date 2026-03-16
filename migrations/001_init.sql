create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key,
  name text not null,
  plan text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists competitors (
  id uuid primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  display_name text not null,
  primary_domain text not null,
  status text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_competitors_org_id on competitors(org_id);

create table if not exists sources (
  id uuid primary key,
  competitor_id uuid not null references competitors(id) on delete cascade,
  source_type text not null,
  normalized_url text not null,
  platform text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_sources_competitor_id on sources(competitor_id);

create table if not exists crawl_runs (
  id uuid primary key,
  competitor_id uuid not null references competitors(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  run_type text not null,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_crawl_runs_competitor_id on crawl_runs(competitor_id);

create table if not exists pages (
  id uuid primary key,
  competitor_id uuid not null references competitors(id) on delete cascade,
  canonical_url text not null,
  url_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(competitor_id, url_hash)
);
create index if not exists idx_pages_competitor_id on pages(competitor_id);

create table if not exists page_snapshots (
  id uuid primary key,
  page_id uuid not null references pages(id) on delete cascade,
  crawl_run_id uuid not null references crawl_runs(id) on delete cascade,
  content_hash text not null,
  html_content text not null,
  page_title text,
  status_code integer not null,
  captured_at timestamptz not null default now()
);
create index if not exists idx_page_snapshots_page_id on page_snapshots(page_id);
create index if not exists idx_page_snapshots_run_id on page_snapshots(crawl_run_id);

create table if not exists page_links (
  id uuid primary key default gen_random_uuid(),
  from_snapshot_id uuid not null references page_snapshots(id) on delete cascade,
  to_url_hash text not null,
  anchor_text text,
  rel text,
  discovered_at timestamptz not null default now()
);

create table if not exists funnel_versions (
  id uuid primary key,
  competitor_id uuid not null references competitors(id) on delete cascade,
  version_no integer not null,
  valid_from timestamptz not null,
  valid_to timestamptz,
  confidence_score numeric(5,4) not null,
  created_at timestamptz not null default now(),
  unique(competitor_id, version_no)
);
create index if not exists idx_funnel_versions_competitor_id on funnel_versions(competitor_id);

create table if not exists funnel_nodes (
  id uuid primary key,
  funnel_version_id uuid not null references funnel_versions(id) on delete cascade,
  page_id uuid references pages(id) on delete set null,
  node_type text not null,
  label text not null,
  price_value numeric(12,2),
  currency text,
  confidence_score numeric(5,4) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_funnel_nodes_version_id on funnel_nodes(funnel_version_id);

create table if not exists funnel_edges (
  id uuid primary key,
  funnel_version_id uuid not null references funnel_versions(id) on delete cascade,
  from_node_id uuid not null references funnel_nodes(id) on delete cascade,
  to_node_id uuid not null references funnel_nodes(id) on delete cascade,
  edge_type text not null,
  confidence_score numeric(5,4) not null,
  created_at timestamptz not null default now()
);

create table if not exists technology_catalog (
  id uuid primary key,
  vendor text not null,
  product text not null,
  category text not null,
  signature_version text not null,
  created_at timestamptz not null default now(),
  unique(vendor, product)
);

create table if not exists technology_detections (
  id uuid primary key,
  snapshot_id uuid not null references page_snapshots(id) on delete cascade,
  technology_id uuid not null references technology_catalog(id) on delete cascade,
  confidence_score numeric(5,4) not null,
  detection_method text not null,
  detected_at timestamptz not null
);

create table if not exists tracking_scripts (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references page_snapshots(id) on delete cascade,
  script_url text not null,
  vendor_guess text,
  script_hash text,
  detected_at timestamptz not null default now()
);

create table if not exists inboxes (
  id uuid primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  address text not null unique,
  provider text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists email_messages (
  id uuid primary key,
  inbox_id uuid not null references inboxes(id) on delete cascade,
  competitor_id uuid not null references competitors(id) on delete cascade,
  subject text not null,
  from_domain text not null,
  body_text text not null,
  body_html text not null,
  received_at timestamptz not null
);
create index if not exists idx_email_messages_competitor_id on email_messages(competitor_id);

create table if not exists email_links (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references email_messages(id) on delete cascade,
  url text not null,
  normalized_url text not null,
  utm_json jsonb,
  linked_page_id uuid references pages(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists email_sequences (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,
  identity_id uuid,
  first_message_at timestamptz not null,
  last_message_at timestamptz not null,
  message_count integer not null,
  pattern_signature text,
  created_at timestamptz not null default now()
);

create table if not exists ads (
  id uuid primary key,
  competitor_id uuid not null references competitors(id) on delete cascade,
  platform text not null,
  ad_external_id text not null,
  status text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  unique(platform, ad_external_id)
);

create table if not exists ad_creatives (
  id uuid primary key,
  ad_id uuid not null references ads(id) on delete cascade,
  creative_type text not null,
  headline text,
  body_text text,
  media_s3_key text,
  cta text,
  landing_url text,
  created_at timestamptz not null default now()
);

create table if not exists ad_observations (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ads(id) on delete cascade,
  observed_at timestamptz not null,
  region text,
  language text,
  spend_range text,
  impression_range text
);

create table if not exists simulation_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  device_type text not null,
  locale text not null,
  risk_profile text not null,
  created_at timestamptz not null default now()
);

create table if not exists sim_identities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid references simulation_profiles(id) on delete set null,
  email_alias text,
  phone_alias text,
  proxy_pool_id text,
  created_at timestamptz not null default now()
);

create table if not exists simulation_runs (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,
  profile_id uuid references simulation_profiles(id) on delete set null,
  identity_id uuid references sim_identities(id) on delete set null,
  scenario_type text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null
);

create table if not exists simulation_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references simulation_runs(id) on delete cascade,
  step_order integer not null,
  action_type text not null,
  target_url text,
  result text not null,
  latency_ms integer not null,
  artifact_ref text,
  created_at timestamptz not null default now()
);

create table if not exists change_events (
  id uuid primary key,
  competitor_id uuid not null references competitors(id) on delete cascade,
  change_type text not null,
  severity text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  detected_at timestamptz not null
);

create table if not exists alerts (
  id uuid primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  competitor_id uuid not null references competitors(id) on delete cascade,
  change_event_id uuid not null references change_events(id) on delete cascade,
  severity text not null,
  status text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_alerts_org_id on alerts(org_id);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  report_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null,
  generated_at timestamptz,
  artifact_json jsonb
);

create table if not exists report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  section_key text not null,
  content_json jsonb not null,
  confidence_score numeric(5,4) not null
);

