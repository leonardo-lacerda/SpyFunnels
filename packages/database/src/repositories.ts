import { randomUUID } from "node:crypto";
import type { CompetitorInput, FunnelNodeType } from "@funnel/types";
import { sourceTypeSchema } from "@funnel/types";
import { DatabaseClient } from "./client.js";

export class Repository {
  constructor(private readonly db: DatabaseClient) {}

  async findUserByEmail(email: string): Promise<{ id: string; email: string; password_hash: string } | null> {
    const rows = await this.db.query<{ id: string; email: string; password_hash: string }>(
      "select id, email, password_hash from users where email = $1 limit 1",
      [email.toLowerCase()]
    );
    return rows[0] ?? null;
  }

  async findPrimaryMembership(userId: string): Promise<{ org_id: string; role: string } | null> {
    const rows = await this.db.query<{ org_id: string; role: string }>(
      "select org_id, role from memberships where user_id = $1 order by created_at asc limit 1",
      [userId]
    );
    return rows[0] ?? null;
  }

  async findOrganizationById(orgId: string): Promise<{ id: string; name: string } | null> {
    const rows = await this.db.query<{ id: string; name: string }>(
      "select id, name from organizations where id = $1 limit 1",
      [orgId]
    );
    return rows[0] ?? null;
  }

  async createOrganization(name: string): Promise<{ id: string; name: string }> {
    const id = randomUUID();
    await this.db.query(
      "insert into organizations (id, name, plan, status) values ($1, $2, $3, $4)",
      [id, name, "pro", "active"]
    );
    return { id, name };
  }

  async createUser(email: string, passwordHash: string): Promise<{ id: string; email: string }> {
    const id = randomUUID();
    await this.db.query(
      "insert into users (id, email, password_hash, status) values ($1, $2, $3, $4)",
      [id, email.toLowerCase(), passwordHash, "active"]
    );
    return { id, email };
  }

  async addMembership(orgId: string, userId: string, role: string): Promise<void> {
    await this.db.query(
      "insert into memberships (org_id, user_id, role) values ($1, $2, $3) on conflict do nothing",
      [orgId, userId, role]
    );
  }

  async createCompetitor(orgId: string, input: CompetitorInput): Promise<{ id: string }> {
    const id = randomUUID();
    await this.db.query(
      "insert into competitors (id, org_id, display_name, primary_domain, status) values ($1, $2, $3, $4, $5)",
      [id, orgId, input.name, input.primaryDomain, "active"]
    );
    for (const source of input.sources) {
      sourceTypeSchema.parse(source.sourceType);
      await this.db.query(
        "insert into sources (id, competitor_id, source_type, normalized_url, platform, active) values ($1, $2, $3, $4, $5, $6)",
        [randomUUID(), id, source.sourceType, source.url, source.sourceType, true]
      );
    }
    return { id };
  }

  async getCompetitorById(
    competitorId: string
  ): Promise<{ id: string; org_id: string; display_name: string; primary_domain: string; created_at: string } | null> {
    const rows = await this.db.query<{
      id: string;
      org_id: string;
      display_name: string;
      primary_domain: string;
      created_at: string;
    }>(
      "select id, org_id, display_name, primary_domain, created_at from competitors where id = $1 limit 1",
      [competitorId]
    );
    return rows[0] ?? null;
  }

  async listCompetitors(orgId: string): Promise<
    Array<{
      id: string;
      display_name: string;
      primary_domain: string;
      status: string;
      created_at: string;
    }>
  > {
    return this.db.query(
      "select id, display_name, primary_domain, status, created_at from competitors where org_id = $1 order by created_at desc",
      [orgId]
    );
  }

  async getCompetitorStats(competitorId: string): Promise<{
    funnel_nodes: number;
    ads: number;
    emails: number;
    technologies: number;
    pages: number;
    changes: number;
  }> {
    const [rows] = await Promise.all([
      this.db.query<{
        funnel_nodes: number;
        ads: number;
        emails: number;
        technologies: number;
        pages: number;
        changes: number;
      }>(
        `select
          (select count(*)::int from funnel_nodes fn join funnel_versions fv on fv.id = fn.funnel_version_id where fv.competitor_id = $1) as funnel_nodes,
          (select count(*)::int from ads where competitor_id = $1) as ads,
          (select count(*)::int from email_messages where competitor_id = $1) as emails,
          (select count(*)::int from technology_detections td
             join page_snapshots ps on ps.id = td.snapshot_id
             join pages p on p.id = ps.page_id
           where p.competitor_id = $1) as technologies,
          (select count(*)::int from pages where competitor_id = $1) as pages,
          (select count(*)::int from change_events where competitor_id = $1) as changes`,
        [competitorId]
      )
    ]);

    return rows[0] ?? {
      funnel_nodes: 0,
      ads: 0,
      emails: 0,
      technologies: 0,
      pages: 0,
      changes: 0
    };
  }

  async getCompetitorLastActivity(competitorId: string): Promise<string | null> {
    const rows = await this.db.query<{ last_activity_at: string | null }>(
      `select greatest(
         coalesce((select max(ps.captured_at) from pages p join page_snapshots ps on ps.page_id = p.id where p.competitor_id = $1), '-infinity'::timestamptz),
         coalesce((select max(ce.detected_at) from change_events ce where ce.competitor_id = $1), '-infinity'::timestamptz),
         coalesce((select max(a.last_seen_at) from ads a where a.competitor_id = $1), '-infinity'::timestamptz),
         coalesce((select max(em.received_at) from email_messages em where em.competitor_id = $1), '-infinity'::timestamptz),
         coalesce((select max(gv.generated_at) from graph_versions gv where gv.competitor_id = $1), '-infinity'::timestamptz),
         coalesce((select max(c.created_at) from competitors c where c.id = $1), '-infinity'::timestamptz)
       )::timestamptz as last_activity_at`,
      [competitorId]
    );
    return rows[0]?.last_activity_at ?? null;
  }

  async listOrgDailyMonitoringActivity(
    orgId: string,
    days = 7
  ): Promise<Array<{ day: string; signals: number; alerts: number }>> {
    return this.db.query(
      `with buckets as (
         select generate_series(
           (current_date - (($2::int - 1) * interval '1 day'))::date,
           current_date::date,
           interval '1 day'
         )::date as day
       ),
       signal_counts as (
         select
           date_trunc('day', ce.detected_at)::date as day,
           count(*)::int as signals
         from change_events ce
         join competitors c on c.id = ce.competitor_id
         where c.org_id = $1
           and ce.detected_at >= (current_date - (($2::int - 1) * interval '1 day'))
         group by 1
       ),
       alert_counts as (
         select
           date_trunc('day', a.created_at)::date as day,
           count(*)::int as alerts
         from alerts a
         where a.org_id = $1
           and a.created_at >= (current_date - (($2::int - 1) * interval '1 day'))
         group by 1
       )
       select
         b.day::text as day,
         coalesce(s.signals, 0)::int as signals,
         coalesce(a.alerts, 0)::int as alerts
       from buckets b
       left join signal_counts s on s.day = b.day
       left join alert_counts a on a.day = b.day
       order by b.day asc`,
      [orgId, days]
    );
  }

  async getCompetitorSources(competitorId: string): Promise<Array<{ id: string; source_type: string; normalized_url: string }>> {
    return this.db.query("select id, source_type, normalized_url from sources where competitor_id = $1 and active = true", [
      competitorId
    ]);
  }

  async upsertPage(competitorId: string, canonicalUrl: string, urlHash: string): Promise<{ id: string }> {
    const existing = await this.db.query<{ id: string }>(
      "select id from pages where competitor_id = $1 and url_hash = $2 limit 1",
      [competitorId, urlHash]
    );
    if (existing[0]) {
      await this.db.query("update pages set last_seen_at = now(), canonical_url = $1 where id = $2", [canonicalUrl, existing[0].id]);
      return { id: existing[0].id };
    }
    const id = randomUUID();
    await this.db.query(
      "insert into pages (id, competitor_id, canonical_url, url_hash) values ($1, $2, $3, $4)",
      [id, competitorId, canonicalUrl, urlHash]
    );
    return { id };
  }

  async createCrawlRun(competitorId: string, sourceId: string, runType: string): Promise<{ id: string }> {
    const id = randomUUID();
    await this.db.query(
      "insert into crawl_runs (id, competitor_id, source_id, run_type, status, started_at) values ($1, $2, $3, $4, $5, now())",
      [id, competitorId, sourceId, runType, "running"]
    );
    return { id };
  }

  async completeCrawlRun(crawlRunId: string, status = "completed"): Promise<void> {
    await this.db.query("update crawl_runs set status = $1, completed_at = now() where id = $2", [status, crawlRunId]);
  }

  async savePageSnapshot(params: {
    pageId: string;
    crawlRunId: string;
    contentHash: string;
    html: string;
    title?: string;
    statusCode: number;
  }): Promise<{ id: string }> {
    const id = randomUUID();
    await this.db.query(
      "insert into page_snapshots (id, page_id, crawl_run_id, content_hash, html_content, page_title, status_code, captured_at) values ($1, $2, $3, $4, $5, $6, $7, now())",
      [id, params.pageId, params.crawlRunId, params.contentHash, params.html, params.title ?? null, params.statusCode]
    );
    return { id };
  }

  async savePageLink(fromSnapshotId: string, toUrlHash: string, anchorText: string | null, rel: string | null): Promise<void> {
    await this.db.query(
      "insert into page_links (from_snapshot_id, to_url_hash, anchor_text, rel) values ($1, $2, $3, $4)",
      [fromSnapshotId, toUrlHash, anchorText, rel]
    );
  }

  async getSnapshotById(snapshotId: string): Promise<{ id: string; html_content: string; page_id: string } | null> {
    const rows = await this.db.query<{ id: string; html_content: string; page_id: string }>(
      "select id, html_content, page_id from page_snapshots where id = $1 limit 1",
      [snapshotId]
    );
    return rows[0] ?? null;
  }

  async listLatestSnapshotsByCompetitor(
    competitorId: string,
    limit = 200
  ): Promise<Array<{ snapshot_id: string; page_id: string; canonical_url: string; html_content: string; page_title: string | null; captured_at: string; content_hash: string }>> {
    return this.db.query(
      `with latest as (
        select distinct on (ps.page_id)
          ps.id as snapshot_id,
          ps.page_id,
          p.canonical_url,
          ps.html_content,
          ps.page_title,
          ps.captured_at,
          ps.content_hash
        from page_snapshots ps
        join pages p on p.id = ps.page_id
        where p.competitor_id = $1
        order by ps.page_id, ps.captured_at desc
      )
      select * from latest order by captured_at desc limit $2`,
      [competitorId, limit]
    );
  }

  async listSnapshotHistoryForMonitoring(
    competitorId: string
  ): Promise<Array<{ page_id: string; snapshot_id: string; content_hash: string; captured_at: string }>> {
    return this.db.query(
      `select p.id as page_id, ps.id as snapshot_id, ps.content_hash, ps.captured_at
       from pages p
       join page_snapshots ps on ps.page_id = p.id
       where p.competitor_id = $1
       order by p.id asc, ps.captured_at desc`,
      [competitorId]
    );
  }

  async createFunnelVersion(competitorId: string, confidence: number): Promise<{ id: string; versionNo: number }> {
    await this.db.query(
      "update funnel_versions set valid_to = now() where competitor_id = $1 and valid_to is null",
      [competitorId]
    );
    const current = await this.db.query<{ max: number | null }>(
      "select max(version_no) as max from funnel_versions where competitor_id = $1",
      [competitorId]
    );
    const versionNo = (current[0]?.max ?? 0) + 1;
    const id = randomUUID();
    await this.db.query(
      "insert into funnel_versions (id, competitor_id, version_no, valid_from, confidence_score) values ($1, $2, $3, now(), $4)",
      [id, competitorId, versionNo, confidence]
    );
    return { id, versionNo };
  }

  async createGraphVersion(params: {
    competitorId: string;
    source: string;
    status?: string;
    confidenceScore: number;
    basedOnFunnelVersionId?: string | null;
  }): Promise<{ id: string; versionNo: number }> {
    await this.db.query(
      "update graph_versions set valid_to = now() where competitor_id = $1 and valid_to is null",
      [params.competitorId]
    );
    const current = await this.db.query<{ max: number | null }>(
      "select max(version_no) as max from graph_versions where competitor_id = $1",
      [params.competitorId]
    );
    const versionNo = (current[0]?.max ?? 0) + 1;
    const id = randomUUID();
    await this.db.query(
      `insert into graph_versions
       (id, competitor_id, based_on_funnel_version_id, version_no, source, status, confidence_score, valid_from, generated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [
        id,
        params.competitorId,
        params.basedOnFunnelVersionId ?? null,
        versionNo,
        params.source,
        params.status ?? "generated",
        params.confidenceScore
      ]
    );
    return { id, versionNo };
  }

  async addGraphNode(params: {
    graphVersionId: string;
    funnelNodeId?: string | null;
    pageId?: string | null;
    nodeType: string;
    label: string;
    canonicalUrl?: string | null;
    priceValue?: number | null;
    currency?: string | null;
    confidenceScore: number;
    firstSeen?: string | null;
    lastSeen?: string | null;
    changeType?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<{ id: string }> {
    const id = randomUUID();
    await this.db.query(
      `insert into graph_nodes
       (id, graph_version_id, funnel_node_id, page_id, node_type, label, canonical_url, price_value, currency, confidence_score, first_seen, last_seen, change_type, metadata_json)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, coalesce($11::timestamptz, now()), coalesce($12::timestamptz, now()), coalesce($13, 'detected'), $14::jsonb)`,
      [
        id,
        params.graphVersionId,
        params.funnelNodeId ?? null,
        params.pageId ?? null,
        params.nodeType,
        params.label,
        params.canonicalUrl ?? null,
        params.priceValue ?? null,
        params.currency ?? null,
        params.confidenceScore,
        params.firstSeen ?? null,
        params.lastSeen ?? null,
        params.changeType ?? null,
        JSON.stringify(params.metadata ?? null)
      ]
    );
    return { id };
  }

  async addGraphEdge(params: {
    graphVersionId: string;
    fromNodeId: string;
    toNodeId: string;
    edgeType: string;
    confidenceScore: number;
    firstSeen?: string | null;
    lastSeen?: string | null;
    changeType?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<{ id: string }> {
    const id = randomUUID();
    await this.db.query(
      `insert into graph_edges
       (id, graph_version_id, from_node_id, to_node_id, edge_type, confidence_score, first_seen, last_seen, change_type, metadata_json)
       values ($1, $2, $3, $4, $5, $6, coalesce($7::timestamptz, now()), coalesce($8::timestamptz, now()), coalesce($9, 'detected'), $10::jsonb)`,
      [
        id,
        params.graphVersionId,
        params.fromNodeId,
        params.toNodeId,
        params.edgeType,
        params.confidenceScore,
        params.firstSeen ?? null,
        params.lastSeen ?? null,
        params.changeType ?? null,
        JSON.stringify(params.metadata ?? null)
      ]
    );
    return { id };
  }

  async addGraphEvidence(params: {
    graphVersionId: string;
    nodeId?: string | null;
    edgeId?: string | null;
    sourceType: string;
    sourceRefId?: string | null;
    sourceUrl?: string | null;
    snippet?: string | null;
    capturedAt?: string | null;
    payload?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.db.query(
      `insert into graph_evidence
       (graph_version_id, node_id, edge_id, source_type, source_ref_id, source_url, snippet, payload_json, captured_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, coalesce($9::timestamptz, now()))`,
      [
        params.graphVersionId,
        params.nodeId ?? null,
        params.edgeId ?? null,
        params.sourceType,
        params.sourceRefId ?? null,
        params.sourceUrl ?? null,
        params.snippet ?? null,
        JSON.stringify(params.payload ?? null),
        params.capturedAt ?? null
      ]
    );
  }

  async listGraphVersions(
    competitorId: string
  ): Promise<
    Array<{
      id: string;
      version_no: number;
      source: string;
      status: string;
      confidence_score: number;
      based_on_funnel_version_id: string | null;
      valid_from: string;
      valid_to: string | null;
      generated_at: string;
      nodes_count: number;
      edges_count: number;
      evidences_count: number;
    }>
  > {
    return this.db.query(
      `select
         gv.id,
         gv.version_no,
         gv.source,
         gv.status,
         gv.confidence_score,
         gv.based_on_funnel_version_id,
         gv.valid_from,
         gv.valid_to,
         gv.generated_at,
         (select count(*)::int from graph_nodes gn where gn.graph_version_id = gv.id) as nodes_count,
         (select count(*)::int from graph_edges ge where ge.graph_version_id = gv.id) as edges_count,
         (select count(*)::int from graph_evidence gev where gev.graph_version_id = gv.id) as evidences_count
       from graph_versions gv
       where gv.competitor_id = $1
       order by gv.version_no desc`,
      [competitorId]
    );
  }

  async getLatestGraphVersion(
    competitorId: string
  ): Promise<{
    id: string;
    version_no: number;
    source: string;
    status: string;
    confidence_score: number;
    based_on_funnel_version_id: string | null;
    valid_from: string;
    valid_to: string | null;
    generated_at: string;
  } | null> {
    const rows = await this.db.query<{
      id: string;
      version_no: number;
      source: string;
      status: string;
      confidence_score: number;
      based_on_funnel_version_id: string | null;
      valid_from: string;
      valid_to: string | null;
      generated_at: string;
    }>(
      `select
         id,
         version_no,
         source,
         status,
         confidence_score,
         based_on_funnel_version_id,
         valid_from,
         valid_to,
         generated_at
       from graph_versions
       where competitor_id = $1
       order by version_no desc
       limit 1`,
      [competitorId]
    );
    return rows[0] ?? null;
  }

  async getGraphVersionById(
    competitorId: string,
    graphVersionId: string
  ): Promise<{
    id: string;
    version_no: number;
    source: string;
    status: string;
    confidence_score: number;
    based_on_funnel_version_id: string | null;
    valid_from: string;
    valid_to: string | null;
    generated_at: string;
  } | null> {
    const rows = await this.db.query<{
      id: string;
      version_no: number;
      source: string;
      status: string;
      confidence_score: number;
      based_on_funnel_version_id: string | null;
      valid_from: string;
      valid_to: string | null;
      generated_at: string;
    }>(
      `select
         id,
         version_no,
         source,
         status,
         confidence_score,
         based_on_funnel_version_id,
         valid_from,
         valid_to,
         generated_at
       from graph_versions
       where competitor_id = $1 and id = $2
       limit 1`,
      [competitorId, graphVersionId]
    );
    return rows[0] ?? null;
  }

  async listGraphNodes(
    graphVersionId: string
  ): Promise<
    Array<{
      id: string;
      funnel_node_id: string | null;
      page_id: string | null;
      node_type: string;
      label: string;
      canonical_url: string | null;
      price_value: string | null;
      currency: string | null;
      confidence_score: number;
      first_seen: string;
      last_seen: string;
      change_type: string;
      metadata_json: Record<string, unknown> | null;
      created_at: string;
    }>
  > {
    return this.db.query(
      `select
         id,
         funnel_node_id,
         page_id,
         node_type,
         label,
         canonical_url,
         price_value,
         currency,
         confidence_score,
         first_seen,
         last_seen,
         change_type,
         metadata_json,
         created_at
       from graph_nodes
       where graph_version_id = $1
       order by created_at asc`,
      [graphVersionId]
    );
  }

  async listGraphEdges(
    graphVersionId: string
  ): Promise<
    Array<{
      id: string;
      from_node_id: string;
      to_node_id: string;
      edge_type: string;
      confidence_score: number;
      first_seen: string;
      last_seen: string;
      change_type: string;
      metadata_json: Record<string, unknown> | null;
      created_at: string;
    }>
  > {
    return this.db.query(
      `select
         id,
         from_node_id,
         to_node_id,
         edge_type,
         confidence_score,
         first_seen,
         last_seen,
         change_type,
         metadata_json,
         created_at
       from graph_edges
       where graph_version_id = $1
       order by created_at asc`,
      [graphVersionId]
    );
  }

  async listGraphEvidence(
    graphVersionId: string
  ): Promise<
    Array<{
      id: string;
      node_id: string | null;
      edge_id: string | null;
      source_type: string;
      source_ref_id: string | null;
      source_url: string | null;
      snippet: string | null;
      payload_json: Record<string, unknown> | null;
      captured_at: string;
      created_at: string;
    }>
  > {
    return this.db.query(
      `select
         id,
         node_id,
         edge_id,
         source_type,
         source_ref_id,
         source_url,
         snippet,
         payload_json,
         captured_at,
         created_at
       from graph_evidence
       where graph_version_id = $1
       order by created_at asc`,
      [graphVersionId]
    );
  }

  async addFunnelNode(
    funnelVersionId: string,
    pageId: string | null,
    nodeType: FunnelNodeType,
    label: string,
    confidenceScore: number,
    priceValue?: number | null,
    currency?: string | null
  ): Promise<{ id: string }> {
    const id = randomUUID();
    await this.db.query(
      "insert into funnel_nodes (id, funnel_version_id, page_id, node_type, label, price_value, currency, confidence_score) values ($1, $2, $3, $4, $5, $6, $7, $8)",
      [id, funnelVersionId, pageId, nodeType, label, priceValue ?? null, currency ?? null, confidenceScore]
    );
    return { id };
  }

  async addFunnelEdge(
    funnelVersionId: string,
    fromNodeId: string,
    toNodeId: string,
    edgeType: string,
    confidenceScore: number
  ): Promise<void> {
    await this.db.query(
      "insert into funnel_edges (id, funnel_version_id, from_node_id, to_node_id, edge_type, confidence_score) values ($1, $2, $3, $4, $5, $6)",
      [randomUUID(), funnelVersionId, fromNodeId, toNodeId, edgeType, confidenceScore]
    );
  }

  async createSimulationRun(competitorId: string, scenarioType: string): Promise<{ id: string }> {
    const rows = await this.db.query<{ id: string }>(
      "insert into simulation_runs (competitor_id, scenario_type, status) values ($1, $2, $3) returning id",
      [competitorId, scenarioType, "running"]
    );
    if (!rows[0]) {
      throw new Error("Failed to create simulation run");
    }
    return { id: rows[0].id };
  }

  async completeSimulationRun(runId: string, status: string): Promise<void> {
    await this.db.query("update simulation_runs set status = $1, ended_at = now() where id = $2", [status, runId]);
  }

  async addSimulationStep(
    runId: string,
    stepOrder: number,
    actionType: string,
    targetUrl: string | null,
    result: string,
    latencyMs: number
  ): Promise<{ id: string; created_at: string }> {
    const rows = await this.db.query<{ id: string; created_at: string }>(
      `insert into simulation_steps
       (run_id, step_order, action_type, target_url, result, latency_ms)
       values ($1, $2, $3, $4, $5, $6)
       returning id, created_at`,
      [runId, stepOrder, actionType, targetUrl, result, latencyMs]
    );
    if (!rows[0]) {
      throw new Error("Failed to create simulation step");
    }
    return rows[0];
  }

  async recordJourneyEvent(params: {
    competitorId: string;
    runId?: string | null;
    stepId?: string | null;
    eventType: string;
    sourceChannel?: string | null;
    sourceRef?: string | null;
    fromUrl?: string | null;
    toUrl?: string | null;
    payload?: Record<string, unknown> | null;
    observedAt?: string | null;
  }): Promise<{ id: string; created: boolean }> {
    const generatedId = randomUUID();
    const inserted = await this.db.query<{ id: string }>(
      `insert into journey_events
       (id, competitor_id, run_id, step_id, event_type, source_channel, source_ref, from_url, to_url, payload_json, observed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, coalesce($11::timestamptz, now()))
       on conflict (run_id, step_id, event_type) do nothing
       returning id`,
      [
        generatedId,
        params.competitorId,
        params.runId ?? null,
        params.stepId ?? null,
        params.eventType,
        params.sourceChannel ?? null,
        params.sourceRef ?? null,
        params.fromUrl ?? null,
        params.toUrl ?? null,
        JSON.stringify(params.payload ?? null),
        params.observedAt ?? null
      ]
    );
    if (inserted[0]) {
      return { id: inserted[0].id, created: true };
    }

    const existing = await this.db.query<{ id: string }>(
      `select id
       from journey_events
       where run_id = $1 and step_id = $2 and event_type = $3
       limit 1`,
      [params.runId ?? null, params.stepId ?? null, params.eventType]
    );
    if (existing[0]) {
      return { id: existing[0].id, created: false };
    }

    return { id: generatedId, created: false };
  }

  async listJourneyEvents(
    competitorId: string,
    lookbackHours = 168
  ): Promise<
    Array<{
      id: string;
      run_id: string | null;
      step_id: string | null;
      event_type: string;
      source_channel: string | null;
      source_ref: string | null;
      from_url: string | null;
      to_url: string | null;
      payload_json: Record<string, unknown> | null;
      observed_at: string;
    }>
  > {
    return this.db.query(
      `select
         id,
         run_id,
         step_id,
         event_type,
         source_channel,
         source_ref,
         from_url,
         to_url,
         payload_json,
         observed_at
       from journey_events
       where competitor_id = $1
         and observed_at >= now() - ($2::text || ' hours')::interval
       order by observed_at desc`,
      [competitorId, lookbackHours]
    );
  }

  async listObservedNavigationTransitions(
    competitorId: string,
    lookbackHours = 168
  ): Promise<
    Array<{
      run_id: string;
      from_step_id: string;
      to_step_id: string;
      from_step_order: number;
      to_step_order: number;
      from_action_type: string;
      to_action_type: string;
      from_target_url: string | null;
      to_target_url: string | null;
      from_result: string;
      to_result: string;
      from_created_at: string;
      to_created_at: string;
    }>
  > {
    return this.db.query(
      `with sequenced as (
         select
           sr.id as run_id,
           ss.id as step_id,
           ss.step_order,
           ss.action_type,
           ss.target_url,
           ss.result,
           ss.created_at,
           lead(ss.id) over (partition by ss.run_id order by ss.step_order asc, ss.created_at asc) as next_step_id,
           lead(ss.step_order) over (partition by ss.run_id order by ss.step_order asc, ss.created_at asc) as next_step_order,
           lead(ss.action_type) over (partition by ss.run_id order by ss.step_order asc, ss.created_at asc) as next_action_type,
           lead(ss.target_url) over (partition by ss.run_id order by ss.step_order asc, ss.created_at asc) as next_target_url,
           lead(ss.result) over (partition by ss.run_id order by ss.step_order asc, ss.created_at asc) as next_result,
           lead(ss.created_at) over (partition by ss.run_id order by ss.step_order asc, ss.created_at asc) as next_created_at
         from simulation_steps ss
         join simulation_runs sr on sr.id = ss.run_id
         where sr.competitor_id = $1
           and ss.created_at >= now() - ($2::text || ' hours')::interval
       )
       select
         run_id,
         step_id as from_step_id,
         next_step_id as to_step_id,
         step_order as from_step_order,
         next_step_order as to_step_order,
         action_type as from_action_type,
         next_action_type as to_action_type,
         target_url as from_target_url,
         next_target_url as to_target_url,
         result as from_result,
         next_result as to_result,
         created_at as from_created_at,
         next_created_at as to_created_at
       from sequenced
       where next_step_id is not null
       order by run_id desc, from_step_order asc`,
      [competitorId, lookbackHours]
    );
  }

  async ensureInbox(orgId: string, address: string): Promise<{ id: string }> {
    const existing = await this.db.query<{ id: string }>("select id from inboxes where address = $1 limit 1", [address]);
    if (existing[0]) {
      return { id: existing[0].id };
    }
    const id = randomUUID();
    await this.db.query("insert into inboxes (id, org_id, address, provider, status) values ($1, $2, $3, $4, $5)", [
      id,
      orgId,
      address,
      "mailpit",
      "active"
    ]);
    return { id };
  }

  async saveTechnologyDetection(snapshotId: string, vendor: string, product: string, category: string, confidence: number): Promise<void> {
    const technologyId = randomUUID();
    await this.db.query(
      "insert into technology_catalog (id, vendor, product, category, signature_version) values ($1, $2, $3, $4, $5) on conflict (vendor, product) do update set category = excluded.category returning id",
      [technologyId, vendor, product, category, "1.0"]
    );
    const tech = await this.db.query<{ id: string }>(
      "select id from technology_catalog where vendor = $1 and product = $2 limit 1",
      [vendor, product]
    );
    if (!tech[0]) {
      return;
    }
    await this.db.query(
      "insert into technology_detections (id, snapshot_id, technology_id, confidence_score, detection_method, detected_at) values ($1, $2, $3, $4, $5, now())",
      [randomUUID(), snapshotId, tech[0].id, confidence, "signature"]
    );
  }

  async saveTrackingScript(snapshotId: string, scriptUrl: string, vendorGuess: string, scriptHash: string): Promise<void> {
    await this.db.query(
      "insert into tracking_scripts (snapshot_id, script_url, vendor_guess, script_hash) values ($1, $2, $3, $4)",
      [snapshotId, scriptUrl, vendorGuess, scriptHash]
    );
  }

  async saveEmailMessage(params: {
    inboxId: string;
    competitorId: string;
    subject: string;
    fromDomain: string;
    bodyText: string;
    bodyHtml: string;
  }): Promise<{ id: string }> {
    const id = randomUUID();
    await this.db.query(
      "insert into email_messages (id, inbox_id, competitor_id, subject, from_domain, body_text, body_html, received_at) values ($1, $2, $3, $4, $5, $6, $7, now())",
      [id, params.inboxId, params.competitorId, params.subject, params.fromDomain, params.bodyText, params.bodyHtml]
    );
    return { id };
  }

  async saveEmailLink(messageId: string, url: string, normalizedUrl: string, utm: Record<string, string>): Promise<void> {
    await this.db.query(
      "insert into email_links (message_id, url, normalized_url, utm_json) values ($1, $2, $3, $4::jsonb)",
      [messageId, url, normalizedUrl, JSON.stringify(utm)]
    );
  }

  async saveAd(params: {
    competitorId: string;
    platform: string;
    externalId: string;
    headline: string;
    bodyText: string;
    cta: string;
    landingUrl: string;
  }): Promise<void> {
    const adId = randomUUID();
    await this.db.query(
      "insert into ads (id, competitor_id, platform, ad_external_id, status, first_seen_at, last_seen_at) values ($1, $2, $3, $4, $5, now(), now()) on conflict (platform, ad_external_id) do update set last_seen_at = excluded.last_seen_at returning id",
      [adId, params.competitorId, params.platform, params.externalId, "active"]
    );
    const existing = await this.db.query<{ id: string }>("select id from ads where platform = $1 and ad_external_id = $2", [
      params.platform,
      params.externalId
    ]);
    const refAdId = existing[0]?.id ?? adId;
    await this.db.query(
      "insert into ad_creatives (id, ad_id, creative_type, headline, body_text, cta, landing_url) values ($1, $2, $3, $4, $5, $6, $7)",
      [randomUUID(), refAdId, "image_or_text", params.headline, params.bodyText, params.cta, params.landingUrl]
    );
  }

  async recordChangeEventDetailed(
    competitorId: string,
    changeType: string,
    severity: string,
    oldValue: unknown,
    newValue: unknown,
    options?: {
      changeFingerprint?: string | null;
      sourceGraphVersionId?: string | null;
      dedupeWindowHours?: number;
    }
  ): Promise<{ id: string; created: boolean }> {
    const fingerprint = options?.changeFingerprint?.trim() || null;
    const dedupeWindowHours = options?.dedupeWindowHours ?? 72;

    if (fingerprint) {
      const existing = await this.db.query<{ id: string }>(
        `select id
         from change_events
         where competitor_id = $1
           and change_fingerprint = $2
           and detected_at >= now() - ($3::text || ' hours')::interval
         order by detected_at desc
         limit 1`,
        [competitorId, fingerprint, dedupeWindowHours]
      );
      if (existing[0]) {
        return { id: existing[0].id, created: false };
      }
    }

    const id = randomUUID();
    await this.db.query(
      `insert into change_events
       (id, competitor_id, change_type, severity, old_value_json, new_value_json, detected_at, change_fingerprint, source_graph_version_id)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, now(), $7, $8)`,
      [
        id,
        competitorId,
        changeType,
        severity,
        JSON.stringify(oldValue),
        JSON.stringify(newValue),
        fingerprint,
        options?.sourceGraphVersionId ?? null
      ]
    );
    return { id, created: true };
  }

  async recordChangeEvent(
    competitorId: string,
    changeType: string,
    severity: string,
    oldValue: unknown,
    newValue: unknown,
    options?: {
      changeFingerprint?: string | null;
      sourceGraphVersionId?: string | null;
      dedupeWindowHours?: number;
    }
  ): Promise<string> {
    const result = await this.recordChangeEventDetailed(competitorId, changeType, severity, oldValue, newValue, options);
    return result.id;
  }

  async createAlert(orgId: string, competitorId: string, changeEventId: string, severity: string): Promise<void> {
    await this.db.query(
      "insert into alerts (id, org_id, competitor_id, change_event_id, severity, status) values ($1, $2, $3, $4, $5, $6) on conflict (org_id, change_event_id) do nothing",
      [randomUUID(), orgId, competitorId, changeEventId, severity, "open"]
    );
  }

  async listAlerts(orgId: string): Promise<Array<Record<string, unknown>>> {
    return this.db.query(
      "select a.id, a.severity, a.status, a.created_at, c.display_name as competitor_name, ce.change_type from alerts a join competitors c on c.id = a.competitor_id join change_events ce on ce.id = a.change_event_id where a.org_id = $1 order by a.created_at desc limit 200",
      [orgId]
    );
  }

  async listLatestFunnel(competitorId: string): Promise<Array<Record<string, unknown>>> {
    return this.db.query(
      `select fn.id, fn.node_type, fn.label, fn.confidence_score, fe.to_node_id, fe.edge_type
       from funnel_versions fv
       join funnel_nodes fn on fn.funnel_version_id = fv.id
       left join funnel_edges fe on fe.funnel_version_id = fv.id and fe.from_node_id = fn.id
       where fv.competitor_id = $1
       and fv.version_no = (select max(version_no) from funnel_versions where competitor_id = $1)`,
      [competitorId]
    );
  }

  async listFunnelVersions(
    competitorId: string
  ): Promise<
    Array<{
      version_id: string;
      version_no: number;
      confidence_score: number;
      created_at: string;
      valid_from: string;
      valid_to: string | null;
      node_id: string;
      node_type: string;
      label: string;
      node_confidence_score: number;
      price_value: string | null;
      currency: string | null;
      page_id: string | null;
      canonical_url: string | null;
      edge_id: string | null;
      from_node_id: string | null;
      to_node_id: string | null;
      edge_type: string | null;
      edge_confidence_score: number | null;
    }>
  > {
    return this.db.query(
      `select
         fv.id as version_id,
         fv.version_no,
         fv.confidence_score,
         fv.created_at,
         fv.valid_from,
         fv.valid_to,
         fn.id as node_id,
         fn.node_type,
         fn.label,
         fn.confidence_score as node_confidence_score,
         fn.price_value,
         fn.currency,
         fn.page_id,
         p.canonical_url,
         fe.id as edge_id,
         fe.from_node_id,
         fe.to_node_id,
         fe.edge_type,
         fe.confidence_score as edge_confidence_score
       from funnel_versions fv
       join funnel_nodes fn on fn.funnel_version_id = fv.id
       left join pages p on p.id = fn.page_id
       left join funnel_edges fe on fe.funnel_version_id = fv.id and fe.from_node_id = fn.id
       where fv.competitor_id = $1
       order by fv.version_no desc, fn.created_at asc`,
      [competitorId]
    );
  }

  async listAds(competitorId: string): Promise<Array<Record<string, unknown>>> {
    return this.db.query(
      `select a.id, a.platform, a.ad_external_id, a.status, a.last_seen_at, ac.headline, ac.body_text, ac.cta, ac.landing_url
       from ads a
       left join lateral (
         select headline, body_text, cta, landing_url
         from ad_creatives
         where ad_id = a.id
         order by created_at desc
         limit 1
       ) ac on true
       where a.competitor_id = $1
       order by a.last_seen_at desc`,
      [competitorId]
    );
  }

  async listEmails(competitorId: string): Promise<Array<Record<string, unknown>>> {
    return this.db.query(
      "select id, subject, from_domain, received_at, body_text from email_messages where competitor_id = $1 order by received_at desc limit 200",
      [competitorId]
    );
  }

  async listPages(competitorId: string): Promise<
    Array<{
      page_id: string;
      canonical_url: string;
      first_seen_at: string;
      last_seen_at: string;
      latest_snapshot_id: string | null;
      page_title: string | null;
      status_code: number | null;
    }>
  > {
    return this.db.query(
      `select
         p.id as page_id,
         p.canonical_url,
         p.first_seen_at,
         p.last_seen_at,
         ps.id as latest_snapshot_id,
         ps.page_title,
         ps.status_code
       from pages p
       left join lateral (
         select id, page_title, status_code
         from page_snapshots
         where page_id = p.id
         order by captured_at desc
         limit 1
       ) ps on true
       where p.competitor_id = $1
       order by p.last_seen_at desc`,
      [competitorId]
    );
  }

  async listTechnologies(competitorId: string): Promise<
    Array<{
      detection_id: string;
      vendor: string;
      product: string;
      category: string;
      confidence_score: number;
      detected_at: string;
      canonical_url: string | null;
    }>
  > {
    return this.db.query(
      `select
         td.id as detection_id,
         tc.vendor,
         tc.product,
         tc.category,
         td.confidence_score,
         td.detected_at,
         p.canonical_url
       from technology_detections td
       join technology_catalog tc on tc.id = td.technology_id
       join page_snapshots ps on ps.id = td.snapshot_id
       join pages p on p.id = ps.page_id
       where p.competitor_id = $1
       order by td.detected_at desc`,
      [competitorId]
    );
  }

  async listChangeEvents(competitorId: string): Promise<
    Array<{
      id: string;
      change_type: string;
      severity: string;
      old_value_json: unknown;
      new_value_json: unknown;
      detected_at: string;
    }>
  > {
    return this.db.query(
      `select id, change_type, severity, old_value_json, new_value_json, detected_at
       from change_events
       where competitor_id = $1
       order by detected_at desc
       limit 200`,
      [competitorId]
    );
  }

  async listOrgChangeEvents(orgId: string): Promise<
    Array<{
      id: string;
      competitor_id: string;
      competitor_name: string;
      change_type: string;
      severity: string;
      old_value_json: unknown;
      new_value_json: unknown;
      detected_at: string;
    }>
  > {
    return this.db.query(
      `select
         ce.id,
         ce.competitor_id,
         c.display_name as competitor_name,
         ce.change_type,
         ce.severity,
         ce.old_value_json,
         ce.new_value_json,
         ce.detected_at
       from change_events ce
       join competitors c on c.id = ce.competitor_id
       where c.org_id = $1
       order by ce.detected_at desc
       limit 200`,
      [orgId]
    );
  }

  async updateAlertStatus(orgId: string, alertId: string, status: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      "update alerts set status = $1 where id = $2 and org_id = $3 returning id",
      [status, alertId, orgId]
    );
    return Boolean(rows[0]);
  }

  async saveServiceMetricSnapshot(
    serviceName: string,
    metricName: string,
    metricType: string,
    metricValue: number,
    labels?: Record<string, unknown> | null
  ): Promise<void> {
    await this.db.query(
      `insert into service_metrics_snapshots
       (service_name, metric_name, metric_type, metric_labels_json, metric_value, observed_at)
       values ($1, $2, $3, $4::jsonb, $5, now())`,
      [serviceName, metricName, metricType, JSON.stringify(labels ?? null), metricValue]
    );
  }

  async listServiceMetricSnapshots(
    serviceName: string,
    lookbackHours = 24
  ): Promise<
    Array<{
      id: string;
      service_name: string;
      metric_name: string;
      metric_type: string;
      metric_labels_json: Record<string, unknown> | null;
      metric_value: string;
      observed_at: string;
    }>
  > {
    return this.db.query(
      `select
         id,
         service_name,
         metric_name,
         metric_type,
         metric_labels_json,
         metric_value,
         observed_at
       from service_metrics_snapshots
       where service_name = $1
         and observed_at >= now() - ($2::text || ' hours')::interval
       order by observed_at desc`,
      [serviceName, lookbackHours]
    );
  }

  async saveReport(orgId: string, reportType: string, periodStart: string, periodEnd: string, artifact: unknown): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      "insert into reports (org_id, report_type, period_start, period_end, status, generated_at, artifact_json) values ($1, $2, $3, $4, $5, now(), $6::jsonb) returning id",
      [orgId, reportType, periodStart, periodEnd, "generated", JSON.stringify(artifact)]
    );
    if (!rows[0]) {
      throw new Error("Failed to save report");
    }
    return rows[0].id;
  }

  async listReports(orgId: string): Promise<Array<Record<string, unknown>>> {
    return this.db.query(
      "select id, report_type, period_start, period_end, generated_at, artifact_json from reports where org_id = $1 order by generated_at desc limit 100",
      [orgId]
    );
  }

  async getReportById(orgId: string, reportId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      "select id, report_type, period_start, period_end, generated_at, artifact_json from reports where org_id = $1 and id = $2 limit 1",
      [orgId, reportId]
    );
    return rows[0] ?? null;
  }
}
