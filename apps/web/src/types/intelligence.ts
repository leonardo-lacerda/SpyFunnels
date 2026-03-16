export type Confidence = "high" | "medium" | "low";
export type Severity = "critical" | "high" | "medium" | "low";
export type CompetitorStatus = "active" | "syncing" | "paused";
export type FunnelStageType =
  | "ad"
  | "landing"
  | "lead-magnet"
  | "email"
  | "webinar"
  | "offer"
  | "checkout"
  | "upsell"
  | "thank-you";

export interface WorkspaceSummary {
  id: string;
  name: string;
  activeCompetitors: number;
  monitoringCadence: string;
}

export interface KPIStat {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  context: string;
}

export interface DashboardOverview {
  workspace: WorkspaceSummary;
  kpis: KPIStat[];
  marketActivity: Array<{ date: string; signals: number; alerts: number }>;
  alertBursts: Array<{ label: string; value: number }>;
  priorityAlerts: AlertItem[];
  competitors: Competitor[];
  recentChanges: MonitoringEvent[];
}

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  websiteUrl: string;
  instagramUrl?: string;
  facebookUrl?: string;
  category: string;
  status: CompetitorStatus;
  priority: "tier-1" | "tier-2" | "tier-3";
  region: string;
  lastSyncAt: string;
  confidenceScore: number;
  funnelNodeCount: number;
  alertCount: number;
  activeAds: number;
  capturedEmails: number;
  technologiesCount: number;
  notes: string;
  tags: string[];
}

export interface FunnelVersion {
  id: string;
  competitorId: string;
  name: string;
  observedAt: string;
  confidence: Confidence;
  primaryHook: string;
  conversionPoint: string;
  summary: string;
  nodes: FunnelNode[];
  edges: FunnelEdge[];
}

export interface FunnelNode {
  id: string;
  type: FunnelStageType;
  title: string;
  description: string;
  url?: string;
  priceValue?: number | null;
  currency?: string | null;
  confidence: Confidence;
  device: "desktop" | "mobile" | "mixed";
  evidenceCount: number;
  labels: string[];
}

export interface FunnelEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence: Confidence;
}

export interface FlowGraphVersion {
  id: string;
  competitorId: string;
  versionNo: number;
  source: string;
  status: string;
  confidence: Confidence;
  validFrom: string;
  validTo: string | null;
  generatedAt: string;
  basedOnFunnelVersionId: string | null;
  nodes: FlowGraphNode[];
  edges: FlowGraphEdge[];
  evidence: FlowGraphEvidence[];
}

export interface FlowGraphVersionSummary {
  id: string;
  versionNo: number;
  source: string;
  status: string;
  confidence: Confidence;
  validFrom: string;
  validTo: string | null;
  generatedAt: string;
  basedOnFunnelVersionId: string | null;
  nodesCount: number;
  edgesCount: number;
  evidencesCount: number;
}

export interface FlowGraphNode {
  id: string;
  funnelNodeId: string | null;
  pageId: string | null;
  type: FunnelStageType;
  rawType: string;
  label: string;
  canonicalUrl: string | null;
  priceValue: number | null;
  currency: string | null;
  confidence: Confidence;
  firstSeen: string;
  lastSeen: string;
  changeType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  evidenceCount: number;
}

export interface FlowGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: string;
  confidence: Confidence;
  firstSeen: string;
  lastSeen: string;
  changeType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  evidenceCount: number;
}

export interface FlowGraphEvidence {
  id: string;
  nodeId: string | null;
  edgeId: string | null;
  sourceType: string;
  sourceRefId: string | null;
  sourceUrl: string | null;
  snippet: string | null;
  payload: Record<string, unknown> | null;
  capturedAt: string;
  createdAt: string;
}

export interface LandingPageSnapshot {
  id: string;
  competitorId: string;
  title: string;
  path: string;
  stage: FunnelStageType;
  headline: string;
  cta: string;
  observedAt: string;
  status: "active" | "archived" | "testing";
  changeSummary: string;
}

export interface AdCreative {
  id: string;
  competitorId: string;
  platform: "meta" | "instagram" | "facebook" | "google" | "linkedin";
  headline: string;
  body: string;
  cta: string;
  landingPath: string;
  hook: string;
  format: string;
  firstSeenAt: string;
  status: "active" | "paused" | "new";
  spendBand: string;
  linkedFunnelVersionId: string;
}

export interface EmailMessage {
  id: string;
  competitorId: string;
  subject: string;
  sender: string;
  sequence: string;
  receivedAt: string;
  stepIndex: number;
  previewText: string;
  ctaText: string;
  intent: "welcome" | "nurture" | "offer" | "upsell" | "re-engagement";
  tags: string[];
}

export interface TechnologyDetection {
  id: string;
  competitorId: string;
  category: "analytics" | "marketing" | "commerce" | "infrastructure" | "automation";
  name: string;
  confidence: Confidence;
  firstSeenAt: string;
  lastSeenAt: string;
  status: "active" | "new" | "removed";
  evidence: string;
}

export interface MonitoringEvent {
  id: string;
  competitorId: string;
  title: string;
  type: "pricing" | "offer" | "funnel" | "ads" | "email" | "stack";
  severity: Severity;
  observedAt: string;
  summary: string;
  before?: string;
  after?: string;
}

export interface AlertItem {
  id: string;
  competitorId: string;
  title: string;
  description: string;
  severity: Severity;
  createdAt: string;
  status: "open" | "reviewed" | "muted";
  rule: string;
}

export interface IntelligenceReport {
  id: string;
  title: string;
  scope: string;
  generatedAt: string;
  status: "completed" | "generating";
  summary: string;
  recommendations: string[];
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  body: string;
  metrics: Array<{ label: string; value: string }>;
}
