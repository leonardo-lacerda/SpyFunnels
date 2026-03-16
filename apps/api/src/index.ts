import { createHash } from "node:crypto";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { loadConfig } from "@funnel/config";
import { DatabaseClient, Repository } from "@funnel/database";
import { createLogger } from "@funnel/logger";
import {
  createTraceContext,
  deriveChildTrace,
  emitTraceEvent,
  generateInsights,
  incrementCounter,
  KafkaEventBus,
  observeHistogram,
  readCounter,
  renderPrometheusMetrics,
  TOPICS,
  type TraceContext
} from "@funnel/shared";
import { competitorInputSchema } from "@funnel/types";
import { mapGraphEdge, mapGraphNode } from "./graph-contract.js";

const config = loadConfig({
  ...process.env,
  SERVICE_NAME: "api"
});
const logger = createLogger("api", config.LOG_LEVEL);
const db = new DatabaseClient(config.DATABASE_URL, logger);
const repository = new Repository(db);
const bus = new KafkaEventBus(logger, {
  clientId: `${config.KAFKA_CLIENT_ID}-api`,
  brokers: config.kafkaBrokers
});

const app = Fastify({ loggerInstance: logger });
await app.register(cors, { origin: true, credentials: true });
await app.register(jwt, {
  secret: config.JWT_SECRET
});

function nextTrace(parent: TraceContext | null | undefined): TraceContext {
  return deriveChildTrace(parent, "api");
}

async function publishWithTrace(topic: string, key: string, payload: unknown, traceContext: TraceContext | null | undefined) {
  await bus.publish(topic, key, payload, { traceContext: nextTrace(traceContext) });
}

const nodeTypeMap: Record<string, string> = {
  ad_entry: "ad",
  landing: "landing",
  lead_magnet: "lead-magnet",
  webinar: "webinar",
  product: "offer",
  checkout: "checkout",
  upsell: "upsell",
  thank_you: "thank-you",
  retention: "email",
  unknown: "landing"
};

const changeTypeMap: Record<string, string> = {
  price_change: "pricing",
  new_page: "funnel",
  new_offer: "offer",
  new_ad: "ads",
  new_email_sequence: "email",
  tech_stack_change: "stack",
  funnel_structure_change: "funnel"
};

function toConfidenceLabel(score?: number | string | null) {
  const numeric = typeof score === "string" ? Number(score) : score ?? 0;
  if (numeric >= 0.8) return "high";
  if (numeric >= 0.5) return "medium";
  return "low";
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildNotes(name: string, domain: string) {
  return `Monitoring ${name} (${domain}) across web pages, funnel nodes, ads and lifecycle signals.`;
}

function derivePriority(alertCount: number): "tier-1" | "tier-2" | "tier-3" {
  if (alertCount >= 5) return "tier-1";
  if (alertCount >= 1) return "tier-2";
  return "tier-3";
}

function deriveCoverageTags(stats: { funnel_nodes: number; ads: number; emails: number; technologies: number }) {
  const tags: string[] = [];
  if (stats.funnel_nodes > 0) tags.push("funnel");
  if (stats.ads > 0) tags.push("ads");
  if (stats.emails > 0) tags.push("email");
  if (stats.technologies > 0) tags.push("stack");
  return tags.length ? tags : ["monitoring"];
}

function deriveConfidenceScore(stats: {
  funnel_nodes: number;
  ads: number;
  emails: number;
  technologies: number;
  pages: number;
  changes: number;
}) {
  const raw =
    40 +
    Math.min(20, stats.pages * 2) +
    Math.min(20, stats.funnel_nodes * 1.5) +
    Math.min(10, stats.ads * 1.5) +
    Math.min(10, stats.emails * 1.5) +
    Math.min(5, stats.technologies) +
    Math.min(5, stats.changes);
  return Math.max(20, Math.min(99, Math.round(raw)));
}

function deriveRegion(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  const suffix = parts[parts.length - 1] ?? "";
  if (suffix.length === 2) return suffix.toUpperCase();
  return "Global";
}

function formatDayLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (error) {
    reply.status(401).send({ message: "Unauthorized", error });
  }
});

app.addHook("onRequest", async (request, reply) => {
  const incomingTraceHeader = request.headers["x-trace-id"];
  const incomingTraceId = Array.isArray(incomingTraceHeader) ? incomingTraceHeader[0] : incomingTraceHeader;
  request.traceContext = createTraceContext({
    ...(typeof incomingTraceId === "string" ? { traceId: incomingTraceId } : {}),
    origin: "api"
  });
  reply.header("x-trace-id", request.traceContext.traceId);
});

app.addHook("onResponse", async (request, reply) => {
  if (!config.METRICS_ENABLED) return;
  const durationMs = Math.max(0, Number(reply.elapsedTime ?? 0));
  const statusGroup = `${Math.floor(reply.statusCode / 100)}xx`;
  const route = request.routeOptions.url ?? request.url;

  incrementCounter("http_requests_total", 1, {
    service: "api",
    route,
    status: reply.statusCode,
    status_group: statusGroup
  });
  if (reply.statusCode >= 500) {
    incrementCounter("http_requests_errors_total", 1, {
      service: "api",
      route,
      status: reply.statusCode
    });
  }
  observeHistogram("http_request_duration_ms", durationMs, {
    service: "api",
    route,
    method: request.method
  });

  emitTraceEvent({
    service: "api",
    operation: "http.request",
    traceContext: request.traceContext,
    durationMs,
    status: reply.statusCode >= 500 ? "error" : "ok",
    attributes: {
      method: request.method,
      route,
      statusCode: reply.statusCode
    }
  });
});

app.get("/health", async () => ({ status: "ok", service: "api" }));

app.get("/ready", async (_request, reply) => {
  try {
    await db.query<{ ok: number }>("select 1 as ok");
    return { status: "ready", service: "api" };
  } catch (error) {
    reply.status(503);
    return {
      status: "not_ready",
      service: "api",
      reason: error instanceof Error ? error.message : "database_unavailable"
    };
  }
});

app.get("/metrics", async (_request, reply) => {
  if (!config.METRICS_ENABLED) {
    return reply.status(404).send({ message: "Metrics disabled" });
  }
  reply.header("content-type", "text/plain; version=0.0.4; charset=utf-8");
  return renderPrometheusMetrics();
});

app.get("/ops/slo", async (_request) => {
  const totalRequests = readCounter("http_requests_total", { service: "api" });
  const totalErrors = readCounter("http_requests_errors_total", { service: "api" });
  const errorRatePercent = totalRequests > 0 ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0;
  const kafkaPublishErrors = readCounter("kafka_publish_errors_total");
  const kafkaDlqTotal = readCounter("kafka_dlq_total");

  await Promise.allSettled([
    repository.saveServiceMetricSnapshot("api", "http_error_rate_percent", "gauge", errorRatePercent, { window: "process_lifetime" }),
    repository.saveServiceMetricSnapshot("api", "kafka_publish_errors_total", "counter", kafkaPublishErrors, null),
    repository.saveServiceMetricSnapshot("api", "kafka_dlq_total", "counter", kafkaDlqTotal, null)
  ]);

  return {
    generatedAt: new Date().toISOString(),
    service: "api",
    metricsEnabled: config.METRICS_ENABLED,
    slo: {
      httpErrorRatePercent: errorRatePercent,
      kafkaPublishErrors,
      kafkaDlqTotal
    }
  };
});

app.get("/ops/slo/history", async (request) => {
  const query = request.query as { hours?: string };
  const lookbackHours = query.hours ? Number(query.hours) : 24;
  const rows = await repository.listServiceMetricSnapshots("api", Number.isFinite(lookbackHours) ? lookbackHours : 24);
  return rows.map((row) => ({
    id: row.id,
    service: row.service_name,
    metric: row.metric_name,
    type: row.metric_type,
    value: Number(row.metric_value),
    labels: row.metric_labels_json,
    observedAt: row.observed_at
  }));
});

app.post("/auth/login", async (request, reply) => {
  const body = request.body as { email: string; password: string };
  const user = await repository.findUserByEmail(body.email);
  if (!user) {
    return reply.status(401).send({ message: "Invalid credentials" });
  }
  const computed = createHash("sha256").update(body.password).digest("hex");
  if (computed !== user.password_hash) {
    return reply.status(401).send({ message: "Invalid credentials" });
  }
  const membership = await repository.findPrimaryMembership(user.id);
  if (!membership) {
    return reply.status(403).send({ message: "No organization membership found" });
  }
  const token = await reply.jwtSign({
    userId: user.id,
    orgId: membership.org_id,
    role: membership.role
  });
  return { token };
});

app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
  return request.user;
});

app.get("/dashboard", { preHandler: [app.authenticate] }, async (request) => {
  const [organization, competitors, alerts, reports, recentChanges, marketActivityRows] = await Promise.all([
    repository.findOrganizationById(request.user.orgId),
    repository.listCompetitors(request.user.orgId),
    repository.listAlerts(request.user.orgId),
    repository.listReports(request.user.orgId),
    repository.listOrgChangeEvents(request.user.orgId),
    repository.listOrgDailyMonitoringActivity(request.user.orgId, 7)
  ]);

  const enriched = await Promise.all(
    competitors.map(async (competitor) => {
      const [stats, lastActivityAt] = await Promise.all([
        repository.getCompetitorStats(competitor.id),
        repository.getCompetitorLastActivity(competitor.id)
      ]);
      const competitorAlerts = alerts.filter((alert) => alert.competitor_name === competitor.display_name);
      const alertCount = competitorAlerts.length;
      return {
        id: competitor.id,
        name: competitor.display_name,
        domain: competitor.primary_domain,
        websiteUrl: `https://${competitor.primary_domain}`,
        category: "Tracked Competitor",
        status: competitor.status,
        priority: derivePriority(alertCount),
        region: deriveRegion(competitor.primary_domain),
        lastSyncAt: lastActivityAt ?? competitor.created_at,
        confidenceScore: deriveConfidenceScore(stats),
        funnelNodeCount: stats.funnel_nodes,
        alertCount,
        activeAds: stats.ads,
        capturedEmails: stats.emails,
        technologiesCount: stats.technologies,
        notes: buildNotes(competitor.display_name, competitor.primary_domain),
        tags: deriveCoverageTags(stats)
      };
    })
  );

  return {
    workspace: {
      id: request.user.orgId,
      name: organization?.name ?? "Workspace",
      activeCompetitors: competitors.length,
      monitoringCadence: "Event-driven"
    },
    kpis: [
      {
        id: "tracked-competitors",
        label: "Tracked competitors",
        value: String(competitors.length),
        delta: `${alerts.length} open alerts`,
        trend: "up",
        context: `${reports.length} reports generated`
      },
      {
        id: "funnel-nodes",
        label: "Funnel nodes mapped",
        value: String(enriched.reduce((sum, competitor) => sum + competitor.funnelNodeCount, 0)),
        delta: "Live from API",
        trend: "up",
        context: "Latest stored funnel versions"
      },
      {
        id: "emails-captured",
        label: "Captured lifecycle emails",
        value: String(enriched.reduce((sum, competitor) => sum + competitor.capturedEmails, 0)),
        delta: "Live from API",
        trend: "up",
        context: "Inbound intelligence coverage"
      },
      {
        id: "reports",
        label: "Generated reports",
        value: String(reports.length),
        delta: "Live from API",
        trend: "up",
        context: "Historical report archive"
      }
    ],
    marketActivity: marketActivityRows.map((row) => ({
      date: formatDayLabel(row.day),
      signals: row.signals,
      alerts: row.alerts
    })),
    alertBursts: [
      { label: "Pricing", value: alerts.filter((entry) => entry.change_type === "price_change").length },
      { label: "Funnels", value: alerts.filter((entry) => entry.change_type === "funnel_structure_change").length },
      { label: "Ads", value: alerts.filter((entry) => entry.change_type === "new_ad").length },
      { label: "Stack", value: alerts.filter((entry) => entry.change_type === "tech_stack_change").length }
    ],
    priorityAlerts: alerts.slice(0, 5).map((alert) => ({
      id: String(alert.id),
      competitorId: enriched.find((entry) => entry.name === alert.competitor_name)?.id ?? "",
      title: `${String(alert.competitor_name)}: ${String(alert.change_type)}`,
      description: `Severity ${String(alert.severity)} change detected for ${String(alert.competitor_name)}.`,
      severity: String(alert.severity),
      createdAt: String(alert.created_at),
      status: String(alert.status),
      rule: String(alert.change_type)
    })),
    competitors: enriched,
    recentChanges: recentChanges.slice(0, 6).map((event) => ({
      id: event.id,
      competitorId: event.competitor_id,
      title: `${event.competitor_name}: ${String(event.change_type).replace(/_/g, " ")}`,
      type: changeTypeMap[event.change_type] ?? "funnel",
      severity: event.severity,
      observedAt: event.detected_at,
      summary: `Detected ${String(event.change_type).replace(/_/g, " ")} for ${event.competitor_name}.`,
      before: event.old_value_json,
      after: event.new_value_json
    }))
  };
});

app.get("/competitors", { preHandler: [app.authenticate] }, async (request) => {
  const competitors = await repository.listCompetitors(request.user.orgId);
  const [stats, lastActivity] = await Promise.all([
    Promise.all(competitors.map((competitor) => repository.getCompetitorStats(competitor.id))),
    Promise.all(competitors.map((competitor) => repository.getCompetitorLastActivity(competitor.id)))
  ]);

  return competitors.map((competitor, index) => ({
    id: competitor.id,
    display_name: competitor.display_name,
    primary_domain: competitor.primary_domain,
    status: competitor.status,
    created_at: competitor.created_at,
    last_activity_at: lastActivity[index] ?? competitor.created_at,
    stats: stats[index]
  }));
});

app.post("/competitors", { preHandler: [app.authenticate] }, async (request, reply) => {
  const parsed = competitorInputSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: "Invalid payload", issues: parsed.error.flatten() });
  }
  const result = await repository.createCompetitor(request.user.orgId, parsed.data);
  await publishWithTrace(TOPICS.TARGET_CREATED, result.id, {
    orgId: request.user.orgId,
    competitorId: result.id,
    createdAt: new Date().toISOString()
  }, request.traceContext);
  await publishWithTrace(TOPICS.CRAWL_REQUESTED, result.id, {
    orgId: request.user.orgId,
    competitorId: result.id,
    trigger: "competitor_created"
  }, request.traceContext);
  return reply.status(201).send(result);
});

app.get("/competitors/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
  const params = request.params as { id: string };
  const competitor = await repository.getCompetitorById(params.id);
  if (!competitor || competitor.org_id !== request.user.orgId) {
    return reply.status(404).send({ message: "Competitor not found" });
  }
  const [sources, stats, lastActivityAt] = await Promise.all([
    repository.getCompetitorSources(params.id),
    repository.getCompetitorStats(params.id),
    repository.getCompetitorLastActivity(params.id)
  ]);

  return {
    id: competitor.id,
    display_name: competitor.display_name,
    primary_domain: competitor.primary_domain,
    status: "active",
    last_activity_at: lastActivityAt ?? competitor.created_at,
    sources,
    stats
  };
});

app.post("/competitors/:id/run", { preHandler: [app.authenticate] }, async (request) => {
  const params = request.params as { id: string };
  const competitorId = params.id;
  await publishWithTrace(TOPICS.CRAWL_REQUESTED, competitorId, {
    orgId: request.user.orgId,
    competitorId,
    trigger: "manual"
  }, request.traceContext);
  await publishWithTrace(TOPICS.SIMULATION_REQUESTED, competitorId, {
    orgId: request.user.orgId,
    competitorId,
    scenario: "engage"
  }, request.traceContext);
  await publishWithTrace(TOPICS.AD_SYNC_REQUESTED, competitorId, {
    orgId: request.user.orgId,
    competitorId
  }, request.traceContext);
  await publishWithTrace(TOPICS.EMAIL_SYNC_REQUESTED, competitorId, {
    orgId: request.user.orgId,
    competitorId
  }, request.traceContext);
  return { scheduled: true };
});

app.get("/competitors/:id/funnel", { preHandler: [app.authenticate] }, async (request) => {
  const params = request.params as { id: string };
  const rows = await repository.listFunnelVersions(params.id);
  const grouped = new Map<
    string,
    {
      id: string;
      version_no: number;
      confidence_score: number;
      created_at: string;
      valid_from: string;
      valid_to: string | null;
      nodes: Array<Record<string, unknown>>;
      edges: Array<Record<string, unknown>>;
    }
  >();

  for (const row of rows) {
    if (!grouped.has(row.version_id)) {
      grouped.set(row.version_id, {
        id: row.version_id,
        version_no: row.version_no,
        confidence_score: row.confidence_score,
        created_at: row.created_at,
        valid_from: row.valid_from,
        valid_to: row.valid_to,
        nodes: [],
        edges: []
      });
    }
    const version = grouped.get(row.version_id)!;
    if (!version.nodes.find((entry) => entry.id === row.node_id)) {
      version.nodes.push({
        id: row.node_id,
        type: nodeTypeMap[row.node_type] ?? "landing",
        label: row.label,
        confidence_score: row.node_confidence_score,
        canonical_url: row.canonical_url,
        price_value: toNumber(row.price_value),
        currency: row.currency
      });
    }
    if (row.edge_id && !version.edges.find((entry) => entry.id === row.edge_id)) {
      version.edges.push({
        id: row.edge_id,
        from_node_id: row.from_node_id,
        to_node_id: row.to_node_id,
        edge_type: row.edge_type,
        confidence_score: row.edge_confidence_score
      });
    }
  }

  return Array.from(grouped.values());
});

app.get("/competitors/:id/graph/versions", { preHandler: [app.authenticate] }, async (request, reply) => {
  const params = request.params as { id: string };
  const competitor = await repository.getCompetitorById(params.id);
  if (!competitor || competitor.org_id !== request.user.orgId) {
    return reply.status(404).send({ message: "Competitor not found" });
  }

  const versions = await repository.listGraphVersions(params.id);
  return versions.map((version) => ({
    id: version.id,
    version_no: version.version_no,
    source: version.source,
    status: version.status,
    confidence_score: version.confidence_score,
    based_on_funnel_version_id: version.based_on_funnel_version_id,
    valid_from: version.valid_from,
    valid_to: version.valid_to,
    generated_at: version.generated_at,
    nodes_count: version.nodes_count,
    edges_count: version.edges_count,
    evidences_count: version.evidences_count
  }));
});

app.get("/competitors/:id/graph/current", { preHandler: [app.authenticate] }, async (request, reply) => {
  const params = request.params as { id: string };
  const competitor = await repository.getCompetitorById(params.id);
  if (!competitor || competitor.org_id !== request.user.orgId) {
    return reply.status(404).send({ message: "Competitor not found" });
  }

  const version = await repository.getLatestGraphVersion(params.id);
  if (!version) {
    return reply.status(404).send({ message: "No graph version found" });
  }
  const [nodes, edges, evidence] = await Promise.all([
    repository.listGraphNodes(version.id),
    repository.listGraphEdges(version.id),
    repository.listGraphEvidence(version.id)
  ]);

  return {
    version,
    nodes: nodes.map(mapGraphNode),
    edges: edges.map(mapGraphEdge),
    evidence
  };
});

app.get("/competitors/:id/graph/:versionId", { preHandler: [app.authenticate] }, async (request, reply) => {
  const params = request.params as { id: string; versionId: string };
  const competitor = await repository.getCompetitorById(params.id);
  if (!competitor || competitor.org_id !== request.user.orgId) {
    return reply.status(404).send({ message: "Competitor not found" });
  }

  const version = await repository.getGraphVersionById(params.id, params.versionId);
  if (!version) {
    return reply.status(404).send({ message: "Graph version not found" });
  }
  const [nodes, edges, evidence] = await Promise.all([
    repository.listGraphNodes(version.id),
    repository.listGraphEdges(version.id),
    repository.listGraphEvidence(version.id)
  ]);

  return {
    version,
    nodes: nodes.map(mapGraphNode),
    edges: edges.map(mapGraphEdge),
    evidence
  };
});

app.get("/competitors/:id/pages", { preHandler: [app.authenticate] }, async (request) => {
  const params = request.params as { id: string };
  return repository.listPages(params.id);
});

app.get("/competitors/:id/ads", { preHandler: [app.authenticate] }, async (request) => {
  const params = request.params as { id: string };
  return repository.listAds(params.id);
});

app.get("/competitors/:id/emails", { preHandler: [app.authenticate] }, async (request) => {
  const params = request.params as { id: string };
  return repository.listEmails(params.id);
});

app.get("/competitors/:id/technologies", { preHandler: [app.authenticate] }, async (request) => {
  const params = request.params as { id: string };
  return repository.listTechnologies(params.id);
});

app.get("/competitors/:id/changes", { preHandler: [app.authenticate] }, async (request) => {
  const params = request.params as { id: string };
  const events = await repository.listChangeEvents(params.id);
  return events.map((event) => ({
    id: event.id,
    type: changeTypeMap[event.change_type] ?? "funnel",
    severity: event.severity,
    old_value_json: event.old_value_json,
    new_value_json: event.new_value_json,
    detected_at: event.detected_at,
    change_type: event.change_type
  }));
});

app.get("/competitors/:id/insights", { preHandler: [app.authenticate] }, async (request, reply) => {
  const params = request.params as { id: string };
  const competitor = await repository.getCompetitorById(params.id);
  if (!competitor || competitor.org_id !== request.user.orgId) {
    return reply.status(404).send({ message: "Competitor not found" });
  }
  const [funnel, ads, emails, alerts] = await Promise.all([
    repository.listLatestFunnel(params.id),
    repository.listAds(params.id),
    repository.listEmails(params.id),
    repository.listAlerts(request.user.orgId)
  ]);
  const keyChanges = alerts
    .filter((entry) => entry.competitor_name === competitor.display_name)
    .slice(0, 5)
    .map((entry) => `${String(entry.change_type)} (${String(entry.severity)})`);
  const insights = await generateInsights(config.OPENAI_API_KEY, config.OPENAI_MODEL, {
    competitorName: competitor.display_name,
    funnelNodeCount: funnel.length,
    adCount: ads.length,
    emailCount: emails.length,
    keyChanges
  });
  return {
    competitor,
    metrics: {
      funnelNodes: funnel.length,
      ads: ads.length,
      emails: emails.length,
      keyChanges: keyChanges.length
    },
    insights
  };
});

app.get("/alerts", { preHandler: [app.authenticate] }, async (request) => {
  return repository.listAlerts(request.user.orgId);
});

app.patch("/alerts/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
  const params = request.params as { id: string };
  const body = request.body as { status?: string };
  const nextStatus = body.status;

  if (!nextStatus || !["open", "reviewed", "muted"].includes(nextStatus)) {
    return reply.status(400).send({ message: "Invalid alert status" });
  }

  const updated = await repository.updateAlertStatus(request.user.orgId, params.id, nextStatus);
  if (!updated) {
    return reply.status(404).send({ message: "Alert not found" });
  }

  return { id: params.id, status: nextStatus };
});

app.get("/reports", { preHandler: [app.authenticate] }, async (request) => {
  return repository.listReports(request.user.orgId);
});

app.get("/reports/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
  const params = request.params as { id: string };
  const report = await repository.getReportById(request.user.orgId, params.id);
  if (!report) {
    return reply.status(404).send({ message: "Report not found" });
  }
  return report;
});

app.post("/reports/generate", { preHandler: [app.authenticate] }, async (request, reply) => {
  const body = request.body as {
    competitorId: string;
    title?: string;
    scope?: string;
    audience?: string;
    primaryQuestion?: string;
    periodStart?: string;
    periodEnd?: string;
  };
  const competitors = await repository.listCompetitors(request.user.orgId);
  const target = competitors.find((entry) => entry.id === body.competitorId);
  if (!target) {
    return reply.status(404).send({ message: "Competitor not found" });
  }
  const [funnel, ads, emails, alerts, changes, stats] = await Promise.all([
    repository.listLatestFunnel(body.competitorId),
    repository.listAds(body.competitorId),
    repository.listEmails(body.competitorId),
    repository.listAlerts(request.user.orgId),
    repository.listChangeEvents(body.competitorId),
    repository.getCompetitorStats(body.competitorId)
  ]);
  const scopedAlerts = alerts.filter((entry) => entry.competitor_name === target.display_name);
  const periodStart = body.periodStart ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const periodEnd = body.periodEnd ?? new Date().toISOString();
  const reportTitle = body.title?.trim() || `${target.display_name} Funnel Intelligence`;
  const latestChange = changes[0];
  const artifact = {
    generatedAt: new Date().toISOString(),
    title: reportTitle,
    scope: body.scope?.trim() || target.primary_domain,
    audience: body.audience?.trim() || "Growth and executive team",
    primaryQuestion: body.primaryQuestion?.trim() || "What changed in the competitor funnel this period?",
    competitor: target,
    summary: {
      funnelNodes: stats.funnel_nodes,
      ads: stats.ads,
      emails: stats.emails,
      technologies: stats.technologies,
      openAlerts: scopedAlerts.length,
      changes: stats.changes
    },
    funnel,
    ads,
    emails,
    alerts: scopedAlerts,
    changes,
    sections: [
      {
        id: "executive-summary",
        title: "Executive Summary",
        body: `${target.display_name} shows ${stats.funnel_nodes} mapped funnel nodes, ${stats.ads} tracked ads and ${changes.length} monitored changes in the selected period.`,
        metrics: [
          { label: "Funnel nodes", value: String(stats.funnel_nodes) },
          { label: "Tracked ads", value: String(stats.ads) },
          { label: "Captured emails", value: String(stats.emails) },
          { label: "Open alerts", value: String(scopedAlerts.length) }
        ]
      },
      {
        id: "offer-pressure",
        title: "Offer and Funnel Pressure",
        body: latestChange
          ? `Recent detected changes skew toward ${String(latestChange.change_type).replace(/_/g, " ")}, indicating the competitor is actively iterating its conversion path.`
          : "No monitored changes were detected in the selected period.",
        metrics: [
          { label: "Changes detected", value: String(changes.length) },
          { label: "Latest change", value: latestChange ? String(latestChange.change_type).replace(/_/g, " ") : "None" },
          { label: "Primary domain", value: target.primary_domain },
          { label: "Period", value: `${new Date(periodStart).toLocaleDateString("en-US")} - ${new Date(periodEnd).toLocaleDateString("en-US")}` }
        ]
      }
    ],
    recommendations: [
      "Inspect the latest funnel map to validate where qualification has moved upstream.",
      "Compare active ads against captured lifecycle emails to verify narrative continuity.",
      "Prioritize alert review for pricing or structural funnel changes before copy-only shifts."
    ]
  };
  const reportId = await repository.saveReport(
    request.user.orgId,
    "competitor_intelligence",
    periodStart,
    periodEnd,
    artifact
  );
  await publishWithTrace(TOPICS.REPORT_GENERATED, reportId, {
    orgId: request.user.orgId,
    competitorId: body.competitorId,
    reportId,
    generatedAt: new Date().toISOString()
  }, request.traceContext);
  return { reportId };
});

async function main() {
  await bus.connectProducer();
  await app.listen({ port: config.API_PORT, host: "0.0.0.0" });
  logger.info({ port: config.API_PORT }, "API started");
}

main().catch((error) => {
  logger.error(error, "Failed to start API");
  process.exit(1);
});

process.on("SIGINT", async () => {
  await bus.disconnectProducer();
  await app.close();
  await db.close();
  process.exit(0);
});
