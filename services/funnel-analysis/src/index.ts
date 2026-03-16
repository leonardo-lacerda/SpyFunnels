import { load } from "cheerio";
import type { FunnelNodeType } from "@funnel/types";
import { loadConfig } from "@funnel/config";
import { DatabaseClient, Repository } from "@funnel/database";
import { createLogger } from "@funnel/logger";
import { deriveChildTrace, KafkaEventBus, TOPICS, type TraceContext } from "@funnel/shared";
import {
  extractHeuristicSignals as extractSemanticHeuristics,
  normalizePrice,
  type NodeSemanticSignals
} from "./semantic-extraction.js";

const config = loadConfig({
  ...process.env,
  SERVICE_NAME: "funnel-analysis"
});
const logger = createLogger("funnel-analysis", config.LOG_LEVEL);
const db = new DatabaseClient(config.DATABASE_URL, logger);
const repository = new Repository(db);
const bus = new KafkaEventBus(logger, {
  clientId: `${config.KAFKA_CLIENT_ID}-funnel-analysis`,
  brokers: config.kafkaBrokers
});

function nextTrace(parent: TraceContext | null | undefined): TraceContext {
  return deriveChildTrace(parent, "funnel-analysis");
}

const stageRank: Record<FunnelNodeType, number> = {
  ad_entry: 0,
  landing: 1,
  lead_magnet: 2,
  webinar: 3,
  product: 4,
  checkout: 5,
  upsell: 6,
  thank_you: 7,
  retention: 8,
  unknown: 99
};

function resolveUrl(baseUrl: string, candidate: string): string | null {
  const raw = candidate.trim();
  if (!raw) return null;
  if (raw.startsWith("data:")) return null;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return null;
  }
}

function collectImageCandidates(baseUrl: string, html: string, maxCandidates: number): string[] {
  const $ = load(html);
  const candidates: string[] = [];

  const fromMeta = $('meta[property="og:image"], meta[name="twitter:image"]')
    .toArray()
    .map((entry) => $(entry).attr("content"))
    .filter((entry): entry is string => typeof entry === "string");
  const fromImages = $("img")
    .toArray()
    .flatMap((entry) => {
      const src = $(entry).attr("src");
      const srcset = $(entry).attr("srcset");
      const list = [
        src,
        ...(srcset
          ? srcset
              .split(",")
              .map((item) => item.trim().split(/\s+/)[0])
              .filter((item): item is string => Boolean(item))
          : [])
      ];
      return list.filter((item): item is string => typeof item === "string");
    });

  for (const entry of [...fromMeta, ...fromImages]) {
    const resolved = resolveUrl(baseUrl, entry);
    if (!resolved) continue;
    if (!candidates.includes(resolved)) {
      candidates.push(resolved);
    }
    if (candidates.length >= maxCandidates) {
      break;
    }
  }

  return candidates;
}

function extractAiOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }
  const chunks = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((entry) => (entry.type === "output_text" && typeof entry.text === "string" ? entry.text : ""))
    .join(" ")
    .trim();
  return chunks ? chunks : null;
}

async function inferOcrTextWithAi(url: string, html: string, title: string): Promise<string | null> {
  if (!config.FUNNEL_OCR_ENABLED || !config.OPENAI_API_KEY) {
    return null;
  }

  const imageUrls = collectImageCandidates(url, html, config.FUNNEL_OCR_MAX_IMAGES);
  if (imageUrls.length === 0) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.FUNNEL_OCR_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: config.OPENAI_MODEL,
        input: [
          {
            role: "system",
            content:
              "Extract OCR text from offer creatives. Return plain text only, preserving prices and installment details."
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: `Page title: ${title}` },
              { type: "input_text", text: "Read each image and extract all visible offer, price, currency, installment, CTA, upsell and downsell text." },
              ...imageUrls.map((imageUrl) => ({ type: "input_image", image_url: imageUrl }))
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }
    return extractAiOutputText(await response.json());
  } catch (error) {
    logger.debug({ error }, "OCR inference failed");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mapAiNodeType(value: string): FunnelNodeType | null {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "ad_entry" ||
    normalized === "landing" ||
    normalized === "lead_magnet" ||
    normalized === "webinar" ||
    normalized === "product" ||
    normalized === "checkout" ||
    normalized === "upsell" ||
    normalized === "thank_you" ||
    normalized === "retention" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  return null;
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function inferSignalsWithAi(
  url: string,
  title: string,
  html: string,
  baseType: FunnelNodeType
): Promise<Partial<NodeSemanticSignals> | null> {
  if (!config.OPENAI_API_KEY) return null;
  try {
    const excerpt = load(html)("body").text().replace(/\s+/g, " ").trim().slice(0, 8_000);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: config.OPENAI_MODEL,
        input: [
          {
            role: "system",
            content:
              "You classify funnel stages and commerce signals. Output only valid JSON."
          },
          {
            role: "user",
            content: [
              `URL: ${url}`,
              `Title: ${title}`,
              `Base node type: ${baseType}`,
              `Content excerpt: ${excerpt}`,
              "Return JSON with keys:",
              "nodeType (one of ad_entry, landing, lead_magnet, webinar, product, checkout, upsell, thank_you, retention, unknown),",
              "priceValue (number or null), currency (string or null), installmentCount (number or null), installmentValue (number or null),",
              "hasOrderBump (boolean), hasUpsell (boolean), hasDownsell (boolean), productName (string or null), primaryCta (string or null)."
            ].join("\n")
          }
        ]
      })
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { output_text?: string };
    const parsed = extractJsonObject(json.output_text ?? "");
    if (!parsed) return null;

    const nodeType = typeof parsed.nodeType === "string" ? mapAiNodeType(parsed.nodeType) : null;
    const priceValue =
      typeof parsed.priceValue === "number"
        ? parsed.priceValue
        : typeof parsed.priceValue === "string"
          ? normalizePrice(parsed.priceValue)
          : null;
    const currency = typeof parsed.currency === "string" ? parsed.currency.toUpperCase().slice(0, 3) : null;
    const installmentCount =
      typeof parsed.installmentCount === "number" ? parsed.installmentCount : null;
    const installmentValue =
      typeof parsed.installmentValue === "number"
        ? parsed.installmentValue
        : typeof parsed.installmentValue === "string"
          ? normalizePrice(parsed.installmentValue)
          : null;

    return {
      ...(nodeType ? { resolvedNodeType: nodeType } : {}),
      priceValue,
      currency,
      installmentCount,
      installmentValue,
      hasOrderBump: Boolean(parsed.hasOrderBump),
      hasUpsell: Boolean(parsed.hasUpsell),
      hasDownsell: Boolean(parsed.hasDownsell),
      productName: typeof parsed.productName === "string" ? parsed.productName : null,
      primaryCta: typeof parsed.primaryCta === "string" ? parsed.primaryCta : null
    };
  } catch (error) {
    logger.debug({ error }, "AI semantic inference failed");
    return null;
  }
}

function normalizeUrlForMatch(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.hostname}${path}${parsed.search}`;
  } catch {
    return null;
  }
}

function normalizePathForMatch(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
}

function safeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function buildNodeIdentityKey(nodeType: string, label: string, canonicalUrl: string): string {
  const normalizedUrl = normalizeUrlForMatch(canonicalUrl);
  if (normalizedUrl) {
    return `${nodeType}:${normalizedUrl}`;
  }
  return `${nodeType}:${safeSlug(label)}`;
}

function toMetadataRecord(value: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value ?? {};
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function changedNumber(left: number | null, right: number | null): boolean {
  if (left == null && right == null) return false;
  if (left == null || right == null) return true;
  return Math.abs(left - right) > 0.009;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const safeLimit = Math.max(1, Math.min(limit, items.length || 1));
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const currentIndex = cursor;
      cursor += 1;
      if (currentIndex >= items.length) {
        return;
      }
      const value = items[currentIndex];
      if (value === undefined) {
        continue;
      }
      results[currentIndex] = await mapper(value, currentIndex);
    }
  }

  await Promise.all(Array.from({ length: safeLimit }, () => worker()));
  return results;
}

async function generateAiInsight(summary: string): Promise<string> {
  if (!config.OPENAI_API_KEY) {
    return `Heuristic insight: ${summary}. Prioritize improving lead capture, checkout optimization, and upsell paths.`;
  }
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: config.OPENAI_MODEL,
        input: [
          {
            role: "system",
            content:
              "You are a competitive marketing analyst. Produce concise tactical insights with clear evidence orientation."
          },
          {
            role: "user",
            content: summary
          }
        ]
      })
    });
    if (!response.ok) {
      return `AI fallback insight: ${summary}`;
    }
    const json = (await response.json()) as { output_text?: string };
    return json.output_text ?? `AI fallback insight: ${summary}`;
  } catch {
    return `AI fallback insight: ${summary}`;
  }
}

async function analyze(competitorId: string, traceContext?: TraceContext | null): Promise<void> {
  const competitor = await repository.getCompetitorById(competitorId);
  if (!competitor) return;

  const snapshots = await repository.listLatestSnapshotsByCompetitor(competitorId, 200);
  if (!snapshots.length) return;

  const nowIso = new Date().toISOString();
  const previousGraphVersion = await repository.getLatestGraphVersion(competitorId);
  const previousGraphNodes = previousGraphVersion ? await repository.listGraphNodes(previousGraphVersion.id) : [];
  const previousGraphEdges = previousGraphVersion ? await repository.listGraphEdges(previousGraphVersion.id) : [];

  const previousNodeByKey = new Map<
    string,
    {
      id: string;
      node_type: string;
      label: string;
      canonical_url: string | null;
      price_value: string | null;
      currency: string | null;
      first_seen: string;
      metadata_json: Record<string, unknown> | null;
    }
  >();
  const previousNodeKeyById = new Map<string, string>();
  for (const node of previousGraphNodes) {
    const identityKey = buildNodeIdentityKey(node.node_type, node.label, node.canonical_url ?? node.label);
    if (!previousNodeByKey.has(identityKey)) {
      previousNodeByKey.set(identityKey, node);
    }
    previousNodeKeyById.set(node.id, identityKey);
  }

  const previousEdgeByIdentity = new Map<
    string,
    {
      id: string;
      first_seen: string;
      edge_type: string;
    }
  >();
  for (const edge of previousGraphEdges) {
    const fromKey = previousNodeKeyById.get(edge.from_node_id);
    const toKey = previousNodeKeyById.get(edge.to_node_id);
    if (!fromKey || !toKey) continue;
    const identityKey = `${fromKey}->${toKey}:${edge.edge_type}`;
    if (!previousEdgeByIdentity.has(identityKey)) {
      previousEdgeByIdentity.set(identityKey, edge);
    }
  }

  const funnel = await repository.createFunnelVersion(competitorId, 0.83);
  const graph = await repository.createGraphVersion({
    competitorId,
    source: "semantic_observed_navigation_v2",
    confidenceScore: 0.79,
    basedOnFunnelVersionId: funnel.id
  });

  const nodeRefs: Array<{
    funnelNodeId: string;
    graphNodeId: string;
    nodeKey: string;
    rank: number;
    label: string;
    nodeType: FunnelNodeType;
    pageId: string;
    canonicalUrl: string;
    snapshotId: string;
    capturedAt: string;
  }> = [];
  const graphToFunnel = new Map<string, string>();
  const byExactUrl = new Map<string, string>();
  const byPath = new Map<string, string>();
  const maxAiCalls = config.FUNNEL_MAX_AI_CALLS;
  const extracted = await mapLimit(snapshots, config.FUNNEL_EXTRACTION_CONCURRENCY, async (snapshot) => {
    const title = snapshot.page_title?.trim() || snapshot.canonical_url;
    const ocrText = await inferOcrTextWithAi(snapshot.canonical_url, snapshot.html_content, title);
    const heuristic = extractSemanticHeuristics(snapshot.canonical_url, snapshot.html_content, title, {
      ocrText
    });
    return { snapshot, title, ocrText, signals: heuristic };
  });

  const aiCandidateIndexes = extracted
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) =>
      entry.signals.resolvedNodeType === "unknown" ||
      entry.signals.resolvedNodeType === "product" ||
      entry.signals.resolvedNodeType === "checkout" ||
      entry.signals.resolvedNodeType === "upsell"
    )
    .slice(0, maxAiCalls)
    .map((entry) => entry.index);

  const aiOverrides = new Map<number, Partial<NodeSemanticSignals>>();
  await mapLimit(aiCandidateIndexes, config.FUNNEL_AI_CONCURRENCY, async (candidateIndex) => {
    const candidate = extracted[candidateIndex];
    if (!candidate) return;
    const ai = await inferSignalsWithAi(
      candidate.snapshot.canonical_url,
      candidate.title,
      candidate.snapshot.html_content,
      candidate.signals.resolvedNodeType
    );
    if (ai) {
      aiOverrides.set(candidateIndex, ai);
    }
  });

  for (const [index, entry] of extracted.entries()) {
    const snapshot = entry.snapshot;
    const title = entry.title;
    const ocrText = entry.ocrText;
    const heuristic = entry.signals;
    const ai = aiOverrides.get(index);
    const signals = ai
      ? {
          ...heuristic,
          ...ai,
          resolvedNodeType: (ai.resolvedNodeType as FunnelNodeType | undefined) ?? heuristic.resolvedNodeType,
          confidence: Math.max(heuristic.confidence, 0.82),
          reason: [...heuristic.reason, "ai_refinement"]
        }
      : heuristic;

    const resolvedType = signals.resolvedNodeType;
    const rank = stageRank[resolvedType] ?? 99;
    const confidenceScore = Math.max(0.62, Math.min(0.98, signals.confidence));
    const nodeKey = buildNodeIdentityKey(resolvedType, title, snapshot.canonical_url);
    const previousNode = previousNodeByKey.get(nodeKey);
    const previousMetadata = toMetadataRecord(previousNode?.metadata_json);
    const previousPrimaryCta = asText(previousMetadata.primaryCta);
    const hasPrimaryCtaChanged = previousPrimaryCta !== (signals.primaryCta ?? null);
    const hasPriceChanged = changedNumber(previousNode?.price_value ? Number(previousNode.price_value) : null, signals.priceValue);
    const hasCurrencyChanged = (previousNode?.currency ?? null) !== (signals.currency ?? null);
    const hasNodeTypeChanged = previousNode ? previousNode.node_type !== resolvedType : false;
    const nodeChangeType =
      !previousNode ? "new" :
      hasPrimaryCtaChanged || hasPriceChanged || hasCurrencyChanged || hasNodeTypeChanged ? "updated" :
      "unchanged";
    const firstSeen = previousNode?.first_seen ?? nowIso;

    const funnelNode = await repository.addFunnelNode(
      funnel.id,
      snapshot.page_id,
      resolvedType,
      title,
      confidenceScore,
      signals.priceValue,
      signals.currency
    );

    const graphNode = await repository.addGraphNode({
      graphVersionId: graph.id,
      funnelNodeId: funnelNode.id,
      pageId: snapshot.page_id,
      nodeType: resolvedType,
      label: title,
      canonicalUrl: snapshot.canonical_url,
      priceValue: signals.priceValue,
      currency: signals.currency,
      confidenceScore,
      firstSeen,
      lastSeen: nowIso,
      changeType: nodeChangeType,
      metadata: {
        stageRank: rank,
        classifier: "heuristic_semantic",
        ...(ocrText ? { ocrEnabled: true } : {}),
        identityKey: nodeKey,
        productName: signals.productName,
        primaryCta: signals.primaryCta,
        installmentCount: signals.installmentCount,
        installmentValue: signals.installmentValue,
        hasOrderBump: signals.hasOrderBump,
        hasUpsell: signals.hasUpsell,
        hasDownsell: signals.hasDownsell,
        reason: signals.reason,
        ...(ocrText ? { ocrText } : {}),
        sourceSnapshotId: snapshot.snapshot_id
      }
    });

    await repository.addGraphEvidence({
      graphVersionId: graph.id,
      nodeId: graphNode.id,
      sourceType: "page_snapshot",
      sourceRefId: snapshot.snapshot_id,
      sourceUrl: snapshot.canonical_url,
      snippet: title,
      capturedAt: snapshot.captured_at,
      payload: {
        nodeType: resolvedType,
        productName: signals.productName,
        priceValue: signals.priceValue,
        currency: signals.currency,
        installmentCount: signals.installmentCount,
        installmentValue: signals.installmentValue,
        hasOrderBump: signals.hasOrderBump,
        hasUpsell: signals.hasUpsell,
        hasDownsell: signals.hasDownsell,
        ...(ocrText ? { ocrText } : {})
      }
    });

    graphToFunnel.set(graphNode.id, funnelNode.id);
    const exact = normalizeUrlForMatch(snapshot.canonical_url);
    const path = normalizePathForMatch(snapshot.canonical_url);
    if (exact && !byExactUrl.has(exact)) byExactUrl.set(exact, graphNode.id);
    if (path && !byPath.has(path)) byPath.set(path, graphNode.id);

    nodeRefs.push({
      funnelNodeId: funnelNode.id,
      graphNodeId: graphNode.id,
      nodeKey,
      rank,
      label: title,
      nodeType: resolvedType,
      pageId: snapshot.page_id,
      canonicalUrl: snapshot.canonical_url,
      snapshotId: snapshot.snapshot_id,
      capturedAt: snapshot.captured_at
    });
  }

  const createdEdgeKeys = new Set<string>();
  const createdFunnelEdgeKeys = new Set<string>();
  const ordered = [...nodeRefs].sort((a, b) => a.rank - b.rank);

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];
    if (!current || !next) continue;

    const funnelKey = `${current.funnelNodeId}->${next.funnelNodeId}:sequence`;
    if (!createdFunnelEdgeKeys.has(funnelKey)) {
      await repository.addFunnelEdge(funnel.id, current.funnelNodeId, next.funnelNodeId, "sequence", 0.68);
      createdFunnelEdgeKeys.add(funnelKey);
    }

    const edgeIdentityKey = `${current.nodeKey}->${next.nodeKey}:sequence`;
    if (createdEdgeKeys.has(edgeIdentityKey)) continue;
    createdEdgeKeys.add(edgeIdentityKey);
    const previousEdge = previousEdgeByIdentity.get(edgeIdentityKey);

    const graphEdge = await repository.addGraphEdge({
      graphVersionId: graph.id,
      fromNodeId: current.graphNodeId,
      toNodeId: next.graphNodeId,
      edgeType: "sequence",
      confidenceScore: 0.68,
      firstSeen: previousEdge?.first_seen ?? nowIso,
      lastSeen: nowIso,
      changeType: previousEdge ? "unchanged" : "new",
      metadata: {
        identityKey: edgeIdentityKey,
        inference: "stage_rank_order",
        fromRank: current.rank,
        toRank: next.rank
      }
    });
    await repository.addGraphEvidence({
      graphVersionId: graph.id,
      edgeId: graphEdge.id,
      sourceType: "inference.stage_rank_order",
      sourceRefId: `${current.snapshotId}:${next.snapshotId}`,
      sourceUrl: current.canonicalUrl,
      capturedAt: next.capturedAt,
      payload: {
        fromNodeType: current.nodeType,
        toNodeType: next.nodeType
      }
    });
  }

  const [transitions, journeyEvents] = await Promise.all([
    repository.listObservedNavigationTransitions(competitorId, 168),
    repository.listJourneyEvents(competitorId, 168)
  ]);
  let observedEdges = 0;
  const nodeKeyByGraphNodeId = new Map(nodeRefs.map((entry) => [entry.graphNodeId, entry.nodeKey]));
  const journeyByStep = new Map<string, typeof journeyEvents>();
  for (const event of journeyEvents) {
    if (!event.run_id || !event.step_id) continue;
    const key = `${event.run_id}:${event.step_id}`;
    const list = journeyByStep.get(key) ?? [];
    list.push(event);
    journeyByStep.set(key, list);
  }

  function findNodeIdByUrl(url: string | null): string | null {
    if (!url) return null;
    const exact = normalizeUrlForMatch(url);
    if (exact && byExactUrl.has(exact)) return byExactUrl.get(exact) ?? null;
    const path = normalizePathForMatch(url);
    if (path && byPath.has(path)) return byPath.get(path) ?? null;
    return null;
  }

  for (const transition of transitions) {
    const fromNodeId = findNodeIdByUrl(transition.from_target_url);
    const toNodeId = findNodeIdByUrl(transition.to_target_url);
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) continue;

    const action = transition.to_action_type || transition.from_action_type;
    const edgeType =
      action === "submit" ? "submit_navigation" :
      action === "redirect" ? "redirect_navigation" :
      action === "click_cta" ? "cta_click_navigation" :
      "observed_navigation";
    const confidenceScore = edgeType === "redirect_navigation" ? 0.94 : 0.9;
    const fromNodeKey = nodeKeyByGraphNodeId.get(fromNodeId);
    const toNodeKey = nodeKeyByGraphNodeId.get(toNodeId);
    if (!fromNodeKey || !toNodeKey) continue;
    const edgeIdentityKey = `${fromNodeKey}->${toNodeKey}:${edgeType}`;
    if (createdEdgeKeys.has(edgeIdentityKey)) continue;
    createdEdgeKeys.add(edgeIdentityKey);
    const previousEdge = previousEdgeByIdentity.get(edgeIdentityKey);

    const graphEdge = await repository.addGraphEdge({
      graphVersionId: graph.id,
      fromNodeId,
      toNodeId,
      edgeType,
      confidenceScore,
      firstSeen: previousEdge?.first_seen ?? nowIso,
      lastSeen: nowIso,
      changeType: previousEdge ? "unchanged" : "new",
      metadata: {
        identityKey: edgeIdentityKey,
        source: "simulation_steps",
        runId: transition.run_id,
        fromStepId: transition.from_step_id,
        toStepId: transition.to_step_id,
        fromActionType: transition.from_action_type,
        toActionType: transition.to_action_type
      }
    });

    await repository.addGraphEvidence({
      graphVersionId: graph.id,
      edgeId: graphEdge.id,
      sourceType: "simulation_transition",
      sourceRefId: `${transition.run_id}:${transition.from_step_id}->${transition.to_step_id}`,
      sourceUrl: transition.from_target_url,
      snippet: `${transition.from_action_type} -> ${transition.to_action_type}`,
      capturedAt: transition.to_created_at,
      payload: {
        fromTargetUrl: transition.from_target_url,
        toTargetUrl: transition.to_target_url,
        fromResult: transition.from_result,
        toResult: transition.to_result
      }
    });

    const transitionJourneyEvents = [
      ...(journeyByStep.get(`${transition.run_id}:${transition.from_step_id}`) ?? []),
      ...(journeyByStep.get(`${transition.run_id}:${transition.to_step_id}`) ?? [])
    ];
    for (const event of transitionJourneyEvents) {
      await repository.addGraphEvidence({
        graphVersionId: graph.id,
        edgeId: graphEdge.id,
        sourceType: "journey_event",
        sourceRefId: event.id,
        sourceUrl: event.to_url ?? event.from_url,
        snippet: event.event_type,
        capturedAt: event.observed_at,
        payload: {
          eventType: event.event_type,
          sourceChannel: event.source_channel,
          sourceRef: event.source_ref,
          fromUrl: event.from_url,
          toUrl: event.to_url,
          eventPayload: event.payload_json
        }
      });
    }

    const fromFunnel = graphToFunnel.get(fromNodeId);
    const toFunnel = graphToFunnel.get(toNodeId);
    if (fromFunnel && toFunnel && fromFunnel !== toFunnel) {
      const funnelEdgeKey = `${fromFunnel}->${toFunnel}:${edgeType}`;
      if (!createdFunnelEdgeKeys.has(funnelEdgeKey)) {
        await repository.addFunnelEdge(funnel.id, fromFunnel, toFunnel, edgeType, confidenceScore);
        createdFunnelEdgeKeys.add(funnelEdgeKey);
      }
    }
    observedEdges += 1;
  }

  const ads = await repository.listAds(competitorId);
  const emails = await repository.listEmails(competitorId);
  const summary = [
    `Competitor ${competitor.display_name} generated funnel version ${funnel.versionNo}.`,
    `Detected ${ordered.length} nodes, ${ads.length} ads, and ${emails.length} captured emails.`,
    `Graph version ${graph.versionNo} published with ${ordered.length} nodes and ${observedEdges} observed navigation edges.`,
    `Main top-of-funnel nodes: ${ordered.filter((item) => item.rank <= 2).map((item) => item.label).slice(0, 3).join("; ")}`
  ].join(" ");

  const aiInsight = await generateAiInsight(summary);
  await repository.saveReport(
    competitor.org_id,
    "funnel_analysis",
    new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    new Date().toISOString(),
    {
      competitorId,
      funnelVersion: funnel.versionNo,
      graphVersion: graph.versionNo,
      summary,
      observedEdges,
      aiInsight
    }
  );

  await bus.publish(TOPICS.FUNNEL_RECONSTRUCTED, competitorId, {
    competitorId,
    funnelVersionId: funnel.id,
    graphVersionId: graph.id,
    versionNo: funnel.versionNo
  }, { traceContext: nextTrace(traceContext) });
  await bus.publish(TOPICS.MONITORING_REQUESTED, competitorId, {
    competitorId,
    orgId: competitor.org_id
  }, { traceContext: nextTrace(traceContext) });
}

async function main() {
  await bus.connectProducer();
  await bus.createConsumer(
    `${config.KAFKA_GROUP_ID}-funnel-analysis`,
    [
      TOPICS.FUNNEL_ANALYSIS_REQUESTED,
      TOPICS.CRAWL_COMPLETED,
      TOPICS.EMAIL_INGESTED,
      TOPICS.AD_INGESTED,
      TOPICS.JOURNEY_EVENT_CAPTURED
    ],
    async (event) => {
      const payload = event.payload as { competitorId: string };
      await analyze(payload.competitorId, event.traceContext);
    }
  );
  logger.info("Funnel analysis worker started");
}

main().catch((error) => {
  logger.error(error, "Funnel analysis failed");
  process.exit(1);
});
