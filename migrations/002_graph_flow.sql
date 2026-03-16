create table if not exists graph_versions (
  id uuid primary key,
  competitor_id uuid not null references competitors(id) on delete cascade,
  based_on_funnel_version_id uuid references funnel_versions(id) on delete set null,
  version_no integer not null,
  source text not null,
  status text not null,
  confidence_score numeric(5,4) not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (competitor_id, version_no)
);
create index if not exists idx_graph_versions_competitor_id on graph_versions(competitor_id);

create table if not exists graph_nodes (
  id uuid primary key,
  graph_version_id uuid not null references graph_versions(id) on delete cascade,
  funnel_node_id uuid references funnel_nodes(id) on delete set null,
  page_id uuid references pages(id) on delete set null,
  node_type text not null,
  label text not null,
  canonical_url text,
  price_value numeric(12,2),
  currency text,
  confidence_score numeric(5,4) not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_graph_nodes_graph_version_id on graph_nodes(graph_version_id);
create index if not exists idx_graph_nodes_node_type on graph_nodes(node_type);

create table if not exists graph_edges (
  id uuid primary key,
  graph_version_id uuid not null references graph_versions(id) on delete cascade,
  from_node_id uuid not null references graph_nodes(id) on delete cascade,
  to_node_id uuid not null references graph_nodes(id) on delete cascade,
  edge_type text not null,
  confidence_score numeric(5,4) not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_graph_edges_graph_version_id on graph_edges(graph_version_id);

create table if not exists graph_evidence (
  id uuid primary key default gen_random_uuid(),
  graph_version_id uuid not null references graph_versions(id) on delete cascade,
  node_id uuid references graph_nodes(id) on delete cascade,
  edge_id uuid references graph_edges(id) on delete cascade,
  source_type text not null,
  source_ref_id text,
  source_url text,
  snippet text,
  payload_json jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (node_id is not null or edge_id is not null)
);
create index if not exists idx_graph_evidence_graph_version_id on graph_evidence(graph_version_id);
create index if not exists idx_graph_evidence_node_id on graph_evidence(node_id);
create index if not exists idx_graph_evidence_edge_id on graph_evidence(edge_id);
