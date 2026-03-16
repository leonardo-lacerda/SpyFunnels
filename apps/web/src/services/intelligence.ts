import { ApiError, apiRequest } from "./api-client";
import type {
  AdCreative,
  AlertItem,
  Competitor,
  DashboardOverview,
  EmailMessage,
  FlowGraphVersion,
  FlowGraphVersionSummary,
  FunnelVersion,
  IntelligenceReport,
  LandingPageSnapshot,
  MonitoringEvent,
  TechnologyDetection
} from "../types/intelligence";
import { formatChangeType, formatSeverity, formatStage } from "../utils/labels";

export interface CreateCompetitorInput {
  name: string;
  primaryDomain: string;
  websiteUrl: string;
  instagramUrl?: string;
  facebookUrl?: string;
}

export interface GenerateReportInput {
  competitorId: string;
  title?: string;
  scope?: string;
  audience?: string;
  primaryQuestion?: string;
  periodStart?: string;
  periodEnd?: string;
}

type ApiCompetitor = {
  id: string;
  display_name: string;
  primary_domain: string;
  status: string;
  created_at: string;
  last_activity_at?: string;
  stats?: {
    funnel_nodes: number;
    ads: number;
    emails: number;
    technologies: number;
    pages: number;
    changes: number;
  };
};

type ApiCompetitorDetail = {
  id: string;
  display_name: string;
  primary_domain: string;
  status: string;
  last_activity_at?: string;
  sources?: Array<{ source_type: string; normalized_url: string }>;
  stats?: ApiCompetitor["stats"];
};

type ApiFunnelVersion = {
  id: string;
  version_no: number;
  confidence_score: number;
  created_at: string;
  valid_from: string;
  valid_to: string | null;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    confidence_score: number;
    canonical_url: string | null;
    price_value: number | null;
    currency: string | null;
  }>;
  edges: Array<{
    id: string;
    from_node_id: string;
    to_node_id: string;
    edge_type: string;
    confidence_score: number;
  }>;
};

type ApiPage = {
  page_id: string;
  canonical_url: string;
  first_seen_at: string;
  last_seen_at: string;
  latest_snapshot_id: string | null;
  page_title: string | null;
  status_code: number | null;
};

type ApiAd = {
  id: string;
  platform: string;
  status: string;
  last_seen_at: string;
  headline: string | null;
  body_text: string | null;
  cta: string | null;
  landing_url: string | null;
};

type ApiEmail = {
  id: string;
  subject: string;
  from_domain: string;
  received_at: string;
  body_text: string;
};

type ApiTechnology = {
  detection_id: string;
  vendor: string;
  product: string;
  category: string;
  confidence_score: number;
  detected_at: string;
  canonical_url: string | null;
};

type ApiChange = {
  id: string;
  type: string;
  severity: string;
  old_value_json: unknown;
  new_value_json: unknown;
  detected_at: string;
  change_type: string;
};

type ApiAlert = {
  id: string;
  severity: string;
  status: string;
  created_at: string;
  competitor_name: string;
  change_type: string;
};

type ApiReport = {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  artifact_json?: Record<string, unknown> | null;
};

type ApiGraphVersionSummary = {
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
};

type ApiGraphVersionPayload = {
  version: {
    id: string;
    version_no: number;
    source: string;
    status: string;
    confidence_score: number;
    based_on_funnel_version_id: string | null;
    valid_from: string;
    valid_to: string | null;
    generated_at: string;
  };
  nodes: Array<{
    id: string;
    funnel_node_id: string | null;
    page_id: string | null;
    node_type: string;
    raw_node_type: string;
    label: string;
    canonical_url: string | null;
    price_value: number | null;
    currency: string | null;
    confidence_score: number;
    first_seen: string;
    last_seen: string;
    change_type: string;
    metadata_json: Record<string, unknown> | null;
    created_at: string;
  }>;
  edges: Array<{
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
  }>;
  evidence: Array<{
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
  }>;
};

function toConfidence(score?: number | string | null): "high" | "medium" | "low" {
  const numeric = typeof score === "string" ? Number(score) : score ?? 0;
  if (numeric >= 0.8) return "high";
  if (numeric >= 0.5) return "medium";
  return "low";
}

function sentenceCase(input: string) {
  return input.replace(/[_-]/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

function titleFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? parsed.hostname : parsed.pathname;
    return sentenceCase(path.replace(/\//g, " ").trim() || parsed.hostname);
  } catch {
    return sentenceCase(url);
  }
}

function pathFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    return url;
  }
}

function derivePriorityFromStats(
  stats: ApiCompetitor["stats"] | undefined
): Competitor["priority"] {
  const changeCount = stats?.changes ?? 0;
  if (changeCount >= 5) return "tier-1";
  if (changeCount >= 1) return "tier-2";
  return "tier-3";
}

function deriveRegionFromDomain(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  const suffix = parts[parts.length - 1] ?? "";
  if (suffix.length === 2) return suffix.toUpperCase();
  return "Global";
}

function deriveConfidenceFromStats(stats: ApiCompetitor["stats"] | undefined): number {
  if (!stats) return 20;
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

function deriveCoverageTags(stats: ApiCompetitor["stats"] | undefined): string[] {
  if (!stats) return ["monitoring"];
  const tags: string[] = [];
  if (stats.funnel_nodes > 0) tags.push("funnel");
  if (stats.ads > 0) tags.push("ads");
  if (stats.emails > 0) tags.push("email");
  if (stats.technologies > 0) tags.push("stack");
  return tags.length > 0 ? tags : ["monitoring"];
}

function mapCompetitor(entry: ApiCompetitor | ApiCompetitorDetail): Competitor {
  const instagramUrl =
    "sources" in entry ? entry.sources?.find((source) => source.source_type === "instagram")?.normalized_url : undefined;
  const facebookUrl =
    "sources" in entry ? entry.sources?.find((source) => source.source_type === "facebook")?.normalized_url : undefined;

  return {
    id: entry.id,
    name: entry.display_name,
    domain: entry.primary_domain,
    websiteUrl: `https://${entry.primary_domain}`,
    ...(instagramUrl ? { instagramUrl } : {}),
    ...(facebookUrl ? { facebookUrl } : {}),
    category: "Concorrente monitorado",
    status: entry.status === "syncing" ? "syncing" : entry.status === "paused" ? "paused" : "active",
    priority: derivePriorityFromStats(entry.stats),
    region: deriveRegionFromDomain(entry.primary_domain),
    lastSyncAt:
      ("last_activity_at" in entry && entry.last_activity_at) ||
      ("created_at" in entry ? entry.created_at : new Date().toISOString()),
    confidenceScore: deriveConfidenceFromStats(entry.stats),
    funnelNodeCount: entry.stats?.funnel_nodes ?? 0,
    alertCount: entry.stats?.changes ?? 0,
    activeAds: entry.stats?.ads ?? 0,
    capturedEmails: entry.stats?.emails ?? 0,
    technologiesCount: entry.stats?.technologies ?? 0,
    notes: `Monitorando ${entry.display_name} em fontes públicas da web e artefatos de inteligência.`,
    tags: deriveCoverageTags(entry.stats)
  };
}

function mapFunnelVersion(competitorId: string, entry: ApiFunnelVersion): FunnelVersion {
  const firstNode = entry.nodes[0];
  const landingNode = entry.nodes.find((node) => node.type === "landing");
  const checkoutNode = entry.nodes.find((node) => node.type === "checkout" || node.type === "offer");

  return {
    id: entry.id,
    competitorId,
    name: `Versão do Funil ${entry.version_no}`,
    observedAt: entry.valid_from ?? entry.created_at,
    confidence: toConfidence(entry.confidence_score),
    primaryHook: firstNode?.label ?? "Entrada de funil detectada",
    conversionPoint: checkoutNode?.label ?? "Ponto de conversão principal",
    summary: `Reconstruído a partir de ${entry.nodes.length} nós e ${entry.edges.length} transições na última versão do funil armazenada.`,
    nodes: entry.nodes.map((node) => ({
      id: node.id,
      type: (node.type as FunnelVersion["nodes"][number]["type"]) ?? "landing",
      title: node.label,
      description: node.canonical_url ? `Capturado de ${node.canonical_url}` : `Nó ${node.type} detectado`,
      ...(node.canonical_url ? { url: node.canonical_url } : {}),
      priceValue: node.price_value,
      currency: node.currency,
      confidence: toConfidence(node.confidence_score),
      device: "misto",
      evidenceCount: 1,
      labels: [formatStage(node.type), ...(landingNode?.id === node.id ? ["Web"] : [])]
    })),
    edges: entry.edges.map((edge) => ({
      id: edge.id,
      source: edge.from_node_id,
      target: edge.to_node_id,
      label: sentenceCase(edge.edge_type),
      confidence: toConfidence(edge.confidence_score)
    }))
  };
}

function toStageType(value: string): FunnelVersion["nodes"][number]["type"] {
  if (
    value === "ad" ||
    value === "landing" ||
    value === "lead-magnet" ||
    value === "email" ||
    value === "webinar" ||
    value === "offer" ||
    value === "checkout" ||
    value === "upsell" ||
    value === "thank-you"
  ) {
    return value;
  }
  return "landing";
}

function buildEvidenceCounts(payload: ApiGraphVersionPayload) {
  const evidenceByNode = new Map<string, number>();
  const evidenceByEdge = new Map<string, number>();

  for (const item of payload.evidence) {
    if (item.node_id) {
      evidenceByNode.set(item.node_id, (evidenceByNode.get(item.node_id) ?? 0) + 1);
    }
    if (item.edge_id) {
      evidenceByEdge.set(item.edge_id, (evidenceByEdge.get(item.edge_id) ?? 0) + 1);
    }
  }

  return { evidenceByNode, evidenceByEdge };
}

function mapGraphVersion(competitorId: string, payload: ApiGraphVersionPayload): FunnelVersion {
  const { evidenceByNode } = buildEvidenceCounts(payload);
  const sortedNodes = [...payload.nodes].sort((left, right) => left.created_at.localeCompare(right.created_at));
  const firstNode = sortedNodes[0];
  const checkoutNode = sortedNodes.find((node) => node.node_type === "checkout" || node.node_type === "offer");

  return {
    id: payload.version.id,
    competitorId,
    name: `Grafo de Fluxo v${payload.version.version_no}`,
    observedAt: payload.version.valid_from ?? payload.version.generated_at,
    confidence: toConfidence(payload.version.confidence_score),
    primaryHook: firstNode?.label ?? "Entrada de funil detectada",
    conversionPoint: checkoutNode?.label ?? "Ponto de conversão principal",
    summary: `Grafo ${payload.version.version_no} gerado a partir de ${payload.nodes.length} nós, ${payload.edges.length} arestas e ${payload.evidence.length} evidências.`,
    nodes: sortedNodes.map((node) => ({
      id: node.id,
      type: toStageType(node.node_type),
      title: node.label,
      description: node.canonical_url ? `Capturado de ${node.canonical_url}` : `Nó ${node.raw_node_type} detectado`,
      ...(node.canonical_url ? { url: node.canonical_url } : {}),
      priceValue: node.price_value,
      currency: node.currency,
      confidence: toConfidence(node.confidence_score),
      device: "misto",
      evidenceCount: evidenceByNode.get(node.id) ?? 0,
      labels: [formatStage(node.raw_node_type), formatStage(node.node_type), payload.version.source]
    })),
    edges: payload.edges.map((edge) => ({
      id: edge.id,
      source: edge.from_node_id,
      target: edge.to_node_id,
      label: sentenceCase(edge.edge_type),
      confidence: toConfidence(edge.confidence_score)
    }))
  };
}

function mapFlowGraphVersion(competitorId: string, payload: ApiGraphVersionPayload): FlowGraphVersion {
  const { evidenceByNode, evidenceByEdge } = buildEvidenceCounts(payload);

  return {
    id: payload.version.id,
    competitorId,
    versionNo: payload.version.version_no,
    source: payload.version.source,
    status: payload.version.status,
    confidence: toConfidence(payload.version.confidence_score),
    validFrom: payload.version.valid_from,
    validTo: payload.version.valid_to,
    generatedAt: payload.version.generated_at,
    basedOnFunnelVersionId: payload.version.based_on_funnel_version_id,
    nodes: payload.nodes.map((node) => ({
      id: node.id,
      funnelNodeId: node.funnel_node_id,
      pageId: node.page_id,
      type: toStageType(node.node_type),
      rawType: node.raw_node_type,
      label: node.label,
      canonicalUrl: node.canonical_url,
      priceValue: node.price_value,
      currency: node.currency,
      confidence: toConfidence(node.confidence_score),
      firstSeen: node.first_seen,
      lastSeen: node.last_seen,
      changeType: node.change_type,
      metadata: node.metadata_json,
      createdAt: node.created_at,
      evidenceCount: evidenceByNode.get(node.id) ?? 0
    })),
    edges: payload.edges.map((edge) => ({
      id: edge.id,
      fromNodeId: edge.from_node_id,
      toNodeId: edge.to_node_id,
      edgeType: edge.edge_type,
      confidence: toConfidence(edge.confidence_score),
      firstSeen: edge.first_seen,
      lastSeen: edge.last_seen,
      changeType: edge.change_type,
      metadata: edge.metadata_json,
      createdAt: edge.created_at,
      evidenceCount: evidenceByEdge.get(edge.id) ?? 0
    })),
    evidence: payload.evidence.map((item) => ({
      id: item.id,
      nodeId: item.node_id,
      edgeId: item.edge_id,
      sourceType: item.source_type,
      sourceRefId: item.source_ref_id,
      sourceUrl: item.source_url,
      snippet: item.snippet,
      payload: item.payload_json,
      capturedAt: item.captured_at,
      createdAt: item.created_at
    }))
  };
}

function mapFlowGraphVersionSummary(item: ApiGraphVersionSummary): FlowGraphVersionSummary {
  return {
    id: item.id,
    versionNo: item.version_no,
    source: item.source,
    status: item.status,
    confidence: toConfidence(item.confidence_score),
    validFrom: item.valid_from,
    validTo: item.valid_to,
    generatedAt: item.generated_at,
    basedOnFunnelVersionId: item.based_on_funnel_version_id,
    nodesCount: item.nodes_count,
    edgesCount: item.edges_count,
    evidencesCount: item.evidences_count
  };
}

function mapPage(competitorId: string, page: ApiPage): LandingPageSnapshot {
  const stage: LandingPageSnapshot["stage"] = page.canonical_url.includes("pricing")
    ? "checkout"
    : page.canonical_url.includes("webinar")
      ? "webinar"
      : page.canonical_url.includes("thank")
        ? "thank-you"
        : "landing";

  return {
    id: page.page_id,
    competitorId,
    title: page.page_title ?? titleFromUrl(page.canonical_url),
    path: pathFromUrl(page.canonical_url),
    stage,
    headline: page.page_title ?? titleFromUrl(page.canonical_url),
    cta: "Inspecionar página",
    observedAt: page.last_seen_at,
    status: page.status_code === 404 ? "archived" : "active",
    changeSummary: `HTTP ${page.status_code ?? 200} no último snapshot`
  };
}

function mapAd(competitorId: string, ad: ApiAd): AdCreative {
  const landingUrl = ad.landing_url ?? `https://${competitorId}.example.com`;
  return {
    id: ad.id,
    competitorId,
    platform: ad.platform === "linkedin" ? "linkedin" : ad.platform === "google" ? "google" : ad.platform === "instagram" ? "instagram" : "meta",
    headline: ad.headline ?? "Criativo sem título",
    body: ad.body_text ?? "Nenhum texto armazenado",
    cta: ad.cta ?? "Saiba mais",
    landingPath: pathFromUrl(landingUrl),
    hook: ad.headline ?? "Gancho do criativo",
    format: "Texto",
    firstSeenAt: ad.last_seen_at,
    status: ad.status === "active" ? "active" : "paused",
    spendBand: "Observado",
    linkedFunnelVersionId: ""
  };
}

function mapEmail(competitorId: string, email: ApiEmail, index: number): EmailMessage {
  const tags: string[] = [];
  if (/offer|promo|discount|sale/i.test(email.subject)) tags.push("offer");
  if (/webinar|masterclass|workshop/i.test(email.subject)) tags.push("webinar");
  if (tags.length === 0) tags.push("captured");
  return {
    id: email.id,
    competitorId,
    subject: email.subject,
    sender: email.from_domain,
    sequence: "Sequência capturada",
    receivedAt: email.received_at,
    stepIndex: index + 1,
    previewText: email.body_text,
    ctaText: "Revisar mensagem",
    intent: index === 0 ? "welcome" : "nurture",
    tags
  };
}

function mapTechnology(competitorId: string, item: ApiTechnology): TechnologyDetection {
  return {
    id: item.detection_id,
    competitorId,
    category: (item.category as TechnologyDetection["category"]) ?? "analytics",
    name: `${item.vendor} ${item.product}`,
    confidence: toConfidence(item.confidence_score),
    firstSeenAt: item.detected_at,
    lastSeenAt: item.detected_at,
    status: "active",
    evidence: item.canonical_url ? `${item.product} em ${item.canonical_url}` : `${item.product} detectado`
  };
}

function stringifyValue(value: unknown) {
  if (!value) return "Nenhum valor anterior armazenado";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function mapMonitoringEvent(competitorId: string, item: ApiChange): MonitoringEvent {
  return {
    id: item.id,
    competitorId,
    title: formatChangeType(item.change_type),
    type: (item.type as MonitoringEvent["type"]) ?? "funnel",
    severity: (item.severity as MonitoringEvent["severity"]) ?? "medium",
    observedAt: item.detected_at,
    summary: `Detectado ${formatChangeType(item.change_type)} durante o monitoramento.`,
    before: stringifyValue(item.old_value_json),
    after: stringifyValue(item.new_value_json)
  };
}

function mapAlert(competitors: Competitor[], item: ApiAlert): AlertItem {
  const competitor = competitors.find((entry) => entry.name === item.competitor_name);
  return {
    id: item.id,
    competitorId: competitor?.id ?? "",
    title: `${item.competitor_name}: ${formatChangeType(item.change_type)}`,
    description: `Mudança de severidade ${formatSeverity(item.severity)} detectada para ${item.competitor_name}.`,
    severity: (item.severity as AlertItem["severity"]) ?? "medium",
    createdAt: item.created_at,
    status: item.status === "reviewed" ? "reviewed" : "open",
    rule: item.change_type
  };
}

function mapReport(entry: ApiReport): IntelligenceReport {
  const artifact = (entry.artifact_json ?? {}) as {
    title?: string;
    scope?: string;
    competitor?: { display_name?: string; primary_domain?: string };
    summary?: Record<string, unknown>;
    alerts?: Array<Record<string, unknown>>;
    funnel?: Array<Record<string, unknown>>;
    sections?: Array<{
      id?: string;
      title?: string;
      body?: string;
      metrics?: Array<{ label?: string; value?: string }>;
    }>;
    recommendations?: string[];
  };

  return {
    id: entry.id,
    title: artifact.title ?? (artifact.competitor?.display_name ? `${artifact.competitor.display_name} Relatório de Inteligência` : sentenceCase(entry.report_type)),
    scope: artifact.scope ?? artifact.competitor?.primary_domain ?? "Portfólio",
    generatedAt: entry.generated_at,
    status: "completed",
    summary: `Relatório gerado a partir de ${Array.isArray(artifact.funnel) ? artifact.funnel.length : 0} linhas de funil e ${Array.isArray(artifact.alerts) ? artifact.alerts.length : 0} alertas.`,
    recommendations: artifact.recommendations?.length
      ? artifact.recommendations
      : [
          "Revise a última versão do funil e compare com execuções anteriores de monitoramento.",
          "Inspecione anúncios e emails de ciclo de vida capturados para consistência narrativa.",
          "Use a severidade dos alertas para priorizar o follow-up do analista."
        ],
    sections: artifact.sections?.length
      ? artifact.sections.map((section, index) => ({
          id: section.id ?? `${entry.id}-section-${index + 1}`,
          title: section.title ?? `Seção ${index + 1}`,
          body: section.body ?? "Nenhuma narrativa disponível.",
          metrics: (section.metrics ?? []).map((metric) => ({
            label: metric.label ?? "Métrica",
            value: metric.value ?? "-"
          }))
        }))
      : [
          {
            id: `${entry.id}-summary`,
            title: "Resumo Operacional",
            body: "Este relatório foi gerado a partir do artefato da API ao vivo e normalizado para a experiência do painel.",
            metrics: Object.entries(artifact.summary ?? {}).map(([label, value]) => ({
              label: sentenceCase(label),
              value: String(value)
            }))
          }
        ]
  };
}

export const intelligenceService = {
  async getDashboard(): Promise<DashboardOverview> {
    return apiRequest<DashboardOverview>("/dashboard");
  },
  async getCompetitors(): Promise<Competitor[]> {
    const response = await apiRequest<ApiCompetitor[]>("/competitors");
    return response.map(mapCompetitor);
  },
  async getCompetitor(competitorId: string): Promise<Competitor | undefined> {
    const response = await apiRequest<ApiCompetitorDetail>(`/competitors/${competitorId}`);
    return mapCompetitor(response);
  },
  async getFunnelVersions(competitorId: string): Promise<FunnelVersion[]> {
    try {
      const summaries = await apiRequest<ApiGraphVersionSummary[]>(`/competitors/${competitorId}/graph/versions`);
      if (summaries.length > 0) {
        const payloads = await Promise.all(
          summaries.slice(0, 10).map((summary) =>
            apiRequest<ApiGraphVersionPayload>(`/competitors/${competitorId}/graph/${summary.id}`)
          )
        );
        return payloads.map((payload) => mapGraphVersion(competitorId, payload));
      }
    } catch {
      // Fallback to legacy funnel endpoint while graph versions are not generated yet.
    }

    const response = await apiRequest<ApiFunnelVersion[]>(`/competitors/${competitorId}/funnel`);
    return response.map((entry) => mapFunnelVersion(competitorId, entry));
  },
  async getFlowGraphCurrent(competitorId: string): Promise<FlowGraphVersion | null> {
    try {
      const payload = await apiRequest<ApiGraphVersionPayload>(`/competitors/${competitorId}/graph/current`);
      return mapFlowGraphVersion(competitorId, payload);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async getFlowGraphVersions(competitorId: string): Promise<FlowGraphVersionSummary[]> {
    const payload = await apiRequest<ApiGraphVersionSummary[]>(`/competitors/${competitorId}/graph/versions`);
    return payload.map(mapFlowGraphVersionSummary);
  },
  async getFlowGraphVersion(competitorId: string, versionId: string): Promise<FlowGraphVersion | null> {
    try {
      const payload = await apiRequest<ApiGraphVersionPayload>(`/competitors/${competitorId}/graph/${versionId}`);
      return mapFlowGraphVersion(competitorId, payload);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async getFunnelVersion(funnelVersionId: string): Promise<FunnelVersion | undefined> {
    const competitors = await this.getCompetitors();
    const versions = await Promise.all(competitors.map((competitor) => this.getFunnelVersions(competitor.id)));
    return versions.flat().find((item) => item.id === funnelVersionId);
  },
  async getLandingPages(competitorId: string): Promise<LandingPageSnapshot[]> {
    const response = await apiRequest<ApiPage[]>(`/competitors/${competitorId}/pages`);
    return response.map((item) => mapPage(competitorId, item));
  },
  async getAds(competitorId?: string): Promise<AdCreative[]> {
    if (competitorId) {
      const response = await apiRequest<ApiAd[]>(`/competitors/${competitorId}/ads`);
      return response.map((item) => mapAd(competitorId, item));
    }

    const competitors = await this.getCompetitors();
    const results = await Promise.all(competitors.map((competitor) => this.getAds(competitor.id)));
    return results.flat();
  },
  async getEmails(competitorId?: string): Promise<EmailMessage[]> {
    if (competitorId) {
      const response = await apiRequest<ApiEmail[]>(`/competitors/${competitorId}/emails`);
      return response.map((item, index) => mapEmail(competitorId, item, index));
    }

    const competitors = await this.getCompetitors();
    const results = await Promise.all(competitors.map((competitor) => this.getEmails(competitor.id)));
    return results.flat();
  },
  async getTechnologies(competitorId?: string): Promise<TechnologyDetection[]> {
    if (competitorId) {
      const response = await apiRequest<ApiTechnology[]>(`/competitors/${competitorId}/technologies`);
      return response.map((item) => mapTechnology(competitorId, item));
    }

    const competitors = await this.getCompetitors();
    const results = await Promise.all(competitors.map((competitor) => this.getTechnologies(competitor.id)));
    return results.flat();
  },
  async getMonitoringEvents(competitorId?: string): Promise<MonitoringEvent[]> {
    if (competitorId) {
      const response = await apiRequest<ApiChange[]>(`/competitors/${competitorId}/changes`);
      return response.map((item) => mapMonitoringEvent(competitorId, item));
    }

    const competitors = await this.getCompetitors();
    const results = await Promise.all(
      competitors.map(async (competitor) => {
        const response = await apiRequest<ApiChange[]>(`/competitors/${competitor.id}/changes`);
        return response.map((item) => mapMonitoringEvent(competitor.id, item));
      })
    );
    return results.flat().sort((left, right) => right.observedAt.localeCompare(left.observedAt));
  },
  async getAlerts(): Promise<AlertItem[]> {
    const [alertResponse, competitors] = await Promise.all([apiRequest<ApiAlert[]>("/alerts"), this.getCompetitors()]);
    return alertResponse.map((item) => mapAlert(competitors, item));
  },
  async getReports(): Promise<IntelligenceReport[]> {
    const response = await apiRequest<ApiReport[]>("/reports");
    return response.map(mapReport);
  },
  async getReport(reportId: string): Promise<IntelligenceReport | undefined> {
    const response = await apiRequest<ApiReport>(`/reports/${reportId}`);
    return mapReport(response);
  },
  async createCompetitor(input: CreateCompetitorInput): Promise<{ id: string }> {
    const sources = [
      { sourceType: "website", url: input.websiteUrl },
      ...(input.instagramUrl ? [{ sourceType: "instagram", url: input.instagramUrl }] : []),
      ...(input.facebookUrl ? [{ sourceType: "facebook", url: input.facebookUrl }] : [])
    ];

    return apiRequest<{ id: string }>("/competitors", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        primaryDomain: input.primaryDomain,
        sources
      })
    });
  },
  async runCompetitor(competitorId: string): Promise<{ scheduled: boolean }> {
    return apiRequest<{ scheduled: boolean }>(`/competitors/${competitorId}/run`, {
      method: "POST"
    });
  },
  async generateReport(input: GenerateReportInput): Promise<{ reportId: string }> {
    return apiRequest<{ reportId: string }>("/reports/generate", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  async updateAlertStatus(alertId: string, status: AlertItem["status"]): Promise<{ id: string; status: AlertItem["status"] }> {
    return apiRequest<{ id: string; status: AlertItem["status"] }>(`/alerts/${alertId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }
};
