alter table graph_nodes
  add column if not exists first_seen timestamptz,
  add column if not exists last_seen timestamptz,
  add column if not exists change_type text;

update graph_nodes
set
  first_seen = coalesce(first_seen, created_at),
  last_seen = coalesce(last_seen, created_at),
  change_type = coalesce(change_type, 'detected');

alter table graph_nodes
  alter column first_seen set not null,
  alter column last_seen set not null,
  alter column change_type set not null;

alter table graph_nodes
  alter column first_seen set default now(),
  alter column last_seen set default now(),
  alter column change_type set default 'detected';

create index if not exists idx_graph_nodes_change_type on graph_nodes(change_type);
create index if not exists idx_graph_nodes_first_seen on graph_nodes(first_seen);
create index if not exists idx_graph_nodes_last_seen on graph_nodes(last_seen);

alter table graph_edges
  add column if not exists first_seen timestamptz,
  add column if not exists last_seen timestamptz,
  add column if not exists change_type text;

update graph_edges
set
  first_seen = coalesce(first_seen, created_at),
  last_seen = coalesce(last_seen, created_at),
  change_type = coalesce(change_type, 'detected');

alter table graph_edges
  alter column first_seen set not null,
  alter column last_seen set not null,
  alter column change_type set not null;

alter table graph_edges
  alter column first_seen set default now(),
  alter column last_seen set default now(),
  alter column change_type set default 'detected';

create index if not exists idx_graph_edges_change_type on graph_edges(change_type);
create index if not exists idx_graph_edges_first_seen on graph_edges(first_seen);
create index if not exists idx_graph_edges_last_seen on graph_edges(last_seen);

alter table change_events
  add column if not exists change_fingerprint text,
  add column if not exists source_graph_version_id uuid references graph_versions(id) on delete set null;

create index if not exists idx_change_events_source_graph_version_id on change_events(source_graph_version_id);
create unique index if not exists idx_change_events_competitor_fingerprint
  on change_events(competitor_id, change_fingerprint)
  where change_fingerprint is not null;

delete from alerts a
using alerts b
where a.ctid < b.ctid
  and a.org_id = b.org_id
  and a.change_event_id = b.change_event_id;

create unique index if not exists idx_alerts_org_change_event
  on alerts(org_id, change_event_id);
