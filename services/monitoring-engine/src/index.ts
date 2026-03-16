import { createHash } from "node:crypto";
import { loadConfig } from "@funnel/config";
import { DatabaseClient, Repository } from "@funnel/database";
import { createLogger } from "@funnel/logger";
import { deriveChildTrace, KafkaEventBus, TOPICS, type TraceContext } from "@funnel/shared";

const config = loadConfig({
  ...process.env,
  SERVICE_NAME: "monitoring-engine"
});
const logger = createLogger("monitoring-engine", config.LOG_LEVEL);
const db = new DatabaseClient(config.DATABASE_URL, logger);
const repository = new Repository(db);
const bus = new KafkaEventBus(logger, {
  clientId: `${config.KAFKA_CLIENT_ID}-monitoring-engine`,
  brokers: config.kafkaBrokers
});

function nextTrace(parent: TraceContext | null | undefined): TraceContext {
  return deriveChildTrace(parent, "monitoring-engine");
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

function safeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function toNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fingerprint(changeType: string, payload: unknown): string {
  return createHash("sha256")
    .update(`${changeType}:${JSON.stringify(payload)}`)
    .digest("hex");
}

function nodeIdentityKey(node: { node_type: string; label: string; canonical_url: string | null }): string {
  const normalizedUrl = node.canonical_url ? normalizeUrlForMatch(node.canonical_url) : null;
  if (normalizedUrl) return `${node.node_type}:${normalizedUrl}`;
  return `${node.node_type}:${safeSlug(node.label)}`;
}

function asMetadata(value: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value ?? {};
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function evidenceForEntity(
  evidence: Array<{
    id: string;
    node_id: string | null;
    edge_id: string | null;
    source_type: string;
    source_ref_id: string | null;
    source_url: string | null;
    snippet: string | null;
    captured_at: string;
  }>,
  nodeId?: string | null,
  edgeId?: string | null
) {
  return evidence
    .filter((item) => (nodeId ? item.node_id === nodeId : true) && (edgeId ? item.edge_id === edgeId : true))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      sourceType: item.source_type,
      sourceRefId: item.source_ref_id,
      sourceUrl: item.source_url,
      snippet: item.snippet,
      capturedAt: item.captured_at
    }));
}

async function createChangeAndAlert(params: {
  competitorId: string;
  orgId: string;
  traceContext?: TraceContext | null | undefined;
  sourceGraphVersionId?: string | null;
  changeType: string;
  severity: string;
  oldValue: unknown;
  newValue: unknown;
  dedupePayload: unknown;
}): Promise<boolean> {
  const changeFingerprint = fingerprint(params.changeType, params.dedupePayload);
  const result = await repository.recordChangeEventDetailed(
    params.competitorId,
    params.changeType,
    params.severity,
    params.oldValue,
    params.newValue,
    {
      changeFingerprint,
      sourceGraphVersionId: params.sourceGraphVersionId ?? null,
      dedupeWindowHours: 168
    }
  );

  if (!result.created) {
    return false;
  }

  await repository.createAlert(params.orgId, params.competitorId, result.id, params.severity);
  await bus.publish(TOPICS.ALERT_TRIGGERED, result.id, {
    competitorId: params.competitorId,
    changeEventId: result.id,
    severity: params.severity
  }, { traceContext: nextTrace(params.traceContext) });
  return true;
}

async function detectSemanticGraphChanges(
  competitorId: string,
  orgId: string,
  traceContext?: TraceContext | null
): Promise<number> {
  const versions = await repository.listGraphVersions(competitorId);
  if (versions.length < 2) return 0;
  const currentVersion = versions[0];
  const previousVersion = versions[1];
  if (!currentVersion || !previousVersion) return 0;

  const [currentNodes, currentEdges, currentEvidence, previousNodes, previousEdges, previousEvidence] = await Promise.all([
    repository.listGraphNodes(currentVersion.id),
    repository.listGraphEdges(currentVersion.id),
    repository.listGraphEvidence(currentVersion.id),
    repository.listGraphNodes(previousVersion.id),
    repository.listGraphEdges(previousVersion.id),
    repository.listGraphEvidence(previousVersion.id)
  ]);

  const currentNodeByKey = new Map<string, (typeof currentNodes)[number]>();
  const previousNodeByKey = new Map<string, (typeof previousNodes)[number]>();
  const currentNodeKeyById = new Map<string, string>();
  const previousNodeKeyById = new Map<string, string>();

  for (const node of currentNodes) {
    const key = nodeIdentityKey(node);
    if (!currentNodeByKey.has(key)) currentNodeByKey.set(key, node);
    currentNodeKeyById.set(node.id, key);
  }
  for (const node of previousNodes) {
    const key = nodeIdentityKey(node);
    if (!previousNodeByKey.has(key)) previousNodeByKey.set(key, node);
    previousNodeKeyById.set(node.id, key);
  }

  const currentEdgeByKey = new Map<string, (typeof currentEdges)[number]>();
  const previousEdgeByKey = new Map<string, (typeof previousEdges)[number]>();
  for (const edge of currentEdges) {
    const fromKey = currentNodeKeyById.get(edge.from_node_id);
    const toKey = currentNodeKeyById.get(edge.to_node_id);
    if (!fromKey || !toKey) continue;
    const key = `${fromKey}->${toKey}:${edge.edge_type}`;
    if (!currentEdgeByKey.has(key)) currentEdgeByKey.set(key, edge);
  }
  for (const edge of previousEdges) {
    const fromKey = previousNodeKeyById.get(edge.from_node_id);
    const toKey = previousNodeKeyById.get(edge.to_node_id);
    if (!fromKey || !toKey) continue;
    const key = `${fromKey}->${toKey}:${edge.edge_type}`;
    if (!previousEdgeByKey.has(key)) previousEdgeByKey.set(key, edge);
  }

  let createdChanges = 0;

  for (const [key, node] of currentNodeByKey.entries()) {
    if (node.node_type !== "upsell") continue;
    if (previousNodeByKey.has(key)) continue;

    const created = await createChangeAndAlert({
      competitorId,
      orgId,
      traceContext,
      sourceGraphVersionId: currentVersion.id,
      changeType: "new_offer",
      severity: "high",
      oldValue: null,
      newValue: {
        kind: "new_upsell",
        graphVersionId: currentVersion.id,
        nodeId: node.id,
        label: node.label,
        canonicalUrl: node.canonical_url,
        priceValue: toNumber(node.price_value),
        currency: node.currency,
        evidence: evidenceForEntity(currentEvidence, node.id, null)
      },
      dedupePayload: {
        key,
        graphVersionId: currentVersion.id,
        kind: "new_upsell"
      }
    });
    if (created) createdChanges += 1;
  }

  for (const [key, node] of currentNodeByKey.entries()) {
    const previousNode = previousNodeByKey.get(key);
    if (!previousNode) continue;

    const oldPrice = toNumber(previousNode.price_value);
    const newPrice = toNumber(node.price_value);
    const oldCurrency = previousNode.currency ?? null;
    const newCurrency = node.currency ?? null;
    const priceChanged =
      (oldPrice == null && newPrice != null) ||
      (oldPrice != null && newPrice == null) ||
      (oldPrice != null && newPrice != null && Math.abs(oldPrice - newPrice) > 0.009) ||
      oldCurrency !== newCurrency;

    if (priceChanged) {
      const pctDelta = oldPrice && newPrice ? Math.abs((newPrice - oldPrice) / oldPrice) : null;
      const severity = pctDelta != null && pctDelta >= 0.2 ? "high" : "medium";

      const created = await createChangeAndAlert({
        competitorId,
        orgId,
        traceContext,
        sourceGraphVersionId: currentVersion.id,
        changeType: "price_change",
        severity,
        oldValue: {
          graphVersionId: previousVersion.id,
          nodeId: previousNode.id,
          priceValue: oldPrice,
          currency: oldCurrency,
          evidence: evidenceForEntity(previousEvidence, previousNode.id, null)
        },
        newValue: {
          graphVersionId: currentVersion.id,
          nodeId: node.id,
          priceValue: newPrice,
          currency: newCurrency,
          deltaPercent: pctDelta,
          evidence: evidenceForEntity(currentEvidence, node.id, null)
        },
        dedupePayload: {
          key,
          oldPrice,
          newPrice,
          oldCurrency,
          newCurrency
        }
      });
      if (created) createdChanges += 1;
    }

    const previousPrimaryCta = asText(asMetadata(previousNode.metadata_json).primaryCta);
    const currentPrimaryCta = asText(asMetadata(node.metadata_json).primaryCta);
    const hasNewCta = (!previousPrimaryCta && currentPrimaryCta) || (previousPrimaryCta && currentPrimaryCta && previousPrimaryCta !== currentPrimaryCta);
    if (hasNewCta) {
      const created = await createChangeAndAlert({
        competitorId,
        orgId,
        traceContext,
        sourceGraphVersionId: currentVersion.id,
        changeType: "funnel_structure_change",
        severity: "medium",
        oldValue: {
          graphVersionId: previousVersion.id,
          nodeId: previousNode.id,
          primaryCta: previousPrimaryCta
        },
        newValue: {
          graphVersionId: currentVersion.id,
          nodeId: node.id,
          primaryCta: currentPrimaryCta,
          evidence: evidenceForEntity(currentEvidence, node.id, null)
        },
        dedupePayload: {
          key,
          previousPrimaryCta,
          currentPrimaryCta
        }
      });
      if (created) createdChanges += 1;
    }
  }

  for (const [edgeKey, edge] of previousEdgeByKey.entries()) {
    if (currentEdgeByKey.has(edgeKey)) continue;
    const created = await createChangeAndAlert({
      competitorId,
      orgId,
      traceContext,
      sourceGraphVersionId: currentVersion.id,
      changeType: "funnel_structure_change",
      severity: "high",
      oldValue: {
        graphVersionId: previousVersion.id,
        edgeId: edge.id,
        edgeKey,
        edgeType: edge.edge_type,
        evidence: evidenceForEntity(previousEvidence, null, edge.id)
      },
      newValue: {
        graphVersionId: currentVersion.id,
        edgeKey,
        state: "removed"
      },
      dedupePayload: {
        edgeKey,
        removedInGraphVersionId: currentVersion.id
      }
    });
    if (created) createdChanges += 1;
  }

  return createdChanges;
}

async function detectSnapshotHashChanges(
  competitorId: string,
  orgId: string,
  traceContext?: TraceContext | null
): Promise<number> {
  const history = await repository.listSnapshotHistoryForMonitoring(competitorId);
  const latestByPage = new Map<string, { snapshot_id: string; content_hash: string; captured_at: string }[]>();
  for (const row of history) {
    const list = latestByPage.get(row.page_id) ?? [];
    if (list.length < 2) {
      list.push({
        snapshot_id: row.snapshot_id,
        content_hash: row.content_hash,
        captured_at: row.captured_at
      });
      latestByPage.set(row.page_id, list);
    }
  }

  let createdChanges = 0;
  for (const [pageId, entries] of latestByPage.entries()) {
    if (entries.length < 2) continue;
    const [latest, previous] = entries;
    if (!latest || !previous) continue;
    if (latest.content_hash === previous.content_hash) continue;

    const result = await repository.recordChangeEventDetailed(
      competitorId,
      "funnel_structure_change",
      "medium",
      { snapshotId: previous.snapshot_id, capturedAt: previous.captured_at, contentHash: previous.content_hash },
      { snapshotId: latest.snapshot_id, capturedAt: latest.captured_at, contentHash: latest.content_hash },
      {
        changeFingerprint: fingerprint("snapshot_hash_change", { pageId, from: previous.content_hash, to: latest.content_hash }),
        dedupeWindowHours: 72
      }
    );
    if (!result.created) continue;

    await repository.createAlert(orgId, competitorId, result.id, "medium");
    await bus.publish(TOPICS.ALERT_TRIGGERED, result.id, {
      competitorId,
      changeEventId: result.id,
      severity: "medium"
    }, { traceContext: nextTrace(traceContext) });
    createdChanges += 1;
  }
  return createdChanges;
}

async function monitor(competitorId: string, traceContext?: TraceContext | null): Promise<void> {
  const competitor = await repository.getCompetitorById(competitorId);
  if (!competitor) return;

  const [semanticChanges, snapshotChanges] = await Promise.all([
    detectSemanticGraphChanges(competitorId, competitor.org_id, traceContext),
    detectSnapshotHashChanges(competitorId, competitor.org_id, traceContext)
  ]);

  if (semanticChanges > 0 || snapshotChanges > 0) {
    logger.info({ competitorId, semanticChanges, snapshotChanges }, "Monitoring changes detected");
  }
}

async function main() {
  await bus.connectProducer();
  await bus.createConsumer(
    `${config.KAFKA_GROUP_ID}-monitoring-engine`,
    [TOPICS.MONITORING_REQUESTED, TOPICS.CRAWL_COMPLETED, TOPICS.FUNNEL_RECONSTRUCTED],
    async (event) => {
      const payload = event.payload as { competitorId: string };
      await monitor(payload.competitorId, event.traceContext);
    }
  );
  logger.info("Monitoring engine started");
}

main().catch((error) => {
  logger.error(error, "Monitoring engine failed");
  process.exit(1);
});
