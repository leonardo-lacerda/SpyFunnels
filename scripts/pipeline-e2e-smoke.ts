import "dotenv/config";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../packages/config/src/index.ts";
import { DatabaseClient, Repository } from "../packages/database/src/index.ts";
import { createLogger } from "../packages/logger/src/index.ts";
import type { CompetitorInput } from "../packages/types/src/index.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSingleIteration(repository: Repository, iteration: number) {
  const now = Date.now();
  const orgName = `E2E Org ${now}-${iteration}`;
  const org = await repository.createOrganization(orgName);
  const user = await repository.createUser(`e2e-${now}-${iteration}@local.test`, randomUUID().replace(/-/g, ""));
  await repository.addMembership(org.id, user.id, "owner");

  const competitorInput: CompetitorInput = {
    name: `E2E Competitor ${now}-${iteration}`,
    primaryDomain: `e2e-${now}-${iteration}.example.com`,
    sources: [{ sourceType: "website", url: "https://example.com" }]
  };
  const competitor = await repository.createCompetitor(org.id, competitorInput);
  const competitorDetail = await repository.getCompetitorById(competitor.id);
  assert(competitorDetail, "competitor should exist");
  const sources = await repository.getCompetitorSources(competitor.id);
  const source = sources[0];
  assert(source, "source should exist");

  const page = await repository.upsertPage(competitor.id, "https://example.com/checkout", `hash-${now}-${iteration}`);
  const crawlRun = await repository.createCrawlRun(competitor.id, source.id, "benchmark");
  const snapshot = await repository.savePageSnapshot({
    pageId: page.id,
    crawlRunId: crawlRun.id,
    contentHash: `content-${now}-${iteration}`,
    html: "<html><body><h1>Checkout</h1><p>Pay now for $97.00</p></body></html>",
    title: "Checkout",
    statusCode: 200
  });
  await repository.completeCrawlRun(crawlRun.id, "completed");

  const simulationRun = await repository.createSimulationRun(competitor.id, "engage");
  const stepOne = await repository.addSimulationStep(simulationRun.id, 1, "click_cta", "https://example.com/offer", "ok", 320);
  const stepTwo = await repository.addSimulationStep(simulationRun.id, 2, "redirect", "https://example.com/checkout", "ok", 410);
  const journeyOne = await repository.recordJourneyEvent({
    competitorId: competitor.id,
    runId: simulationRun.id,
    stepId: stepOne.id,
    eventType: "click",
    fromUrl: "https://example.com/offer",
    toUrl: "https://example.com/checkout",
    observedAt: new Date().toISOString()
  });
  const journeyTwo = await repository.recordJourneyEvent({
    competitorId: competitor.id,
    runId: simulationRun.id,
    stepId: stepTwo.id,
    eventType: "redirect",
    fromUrl: "https://example.com/offer",
    toUrl: "https://example.com/checkout",
    observedAt: new Date().toISOString()
  });

  const funnelV1 = await repository.createFunnelVersion(competitor.id, 0.84);
  const entryV1 = await repository.addFunnelNode(funnelV1.id, page.id, "landing", "Landing", 0.82, null, null);
  const checkoutV1 = await repository.addFunnelNode(funnelV1.id, page.id, "checkout", "Checkout", 0.9, 97, "USD");
  await repository.addFunnelEdge(funnelV1.id, entryV1.id, checkoutV1.id, "sequence", 0.7);

  const graphV1 = await repository.createGraphVersion({
    competitorId: competitor.id,
    source: "e2e",
    confidenceScore: 0.81,
    basedOnFunnelVersionId: funnelV1.id
  });
  const graphEntryV1 = await repository.addGraphNode({
    graphVersionId: graphV1.id,
    funnelNodeId: entryV1.id,
    pageId: page.id,
    nodeType: "landing",
    label: "Landing",
    canonicalUrl: "https://example.com/offer",
    confidenceScore: 0.82,
    changeType: "new"
  });
  const graphCheckoutV1 = await repository.addGraphNode({
    graphVersionId: graphV1.id,
    funnelNodeId: checkoutV1.id,
    pageId: page.id,
    nodeType: "checkout",
    label: "Checkout",
    canonicalUrl: "https://example.com/checkout",
    priceValue: 97,
    currency: "USD",
    confidenceScore: 0.9,
    changeType: "new"
  });
  await repository.addGraphEdge({
    graphVersionId: graphV1.id,
    fromNodeId: graphEntryV1.id,
    toNodeId: graphCheckoutV1.id,
    edgeType: "sequence",
    confidenceScore: 0.7,
    changeType: "new"
  });

  const funnelV2 = await repository.createFunnelVersion(competitor.id, 0.88);
  const entryV2 = await repository.addFunnelNode(funnelV2.id, page.id, "landing", "Landing", 0.86, null, null);
  const checkoutV2 = await repository.addFunnelNode(funnelV2.id, page.id, "checkout", "Checkout", 0.94, 127, "USD");
  await repository.addFunnelEdge(funnelV2.id, entryV2.id, checkoutV2.id, "cta_click_navigation", 0.9);

  const graphV2 = await repository.createGraphVersion({
    competitorId: competitor.id,
    source: "e2e",
    confidenceScore: 0.89,
    basedOnFunnelVersionId: funnelV2.id
  });
  const graphEntryV2 = await repository.addGraphNode({
    graphVersionId: graphV2.id,
    funnelNodeId: entryV2.id,
    pageId: page.id,
    nodeType: "landing",
    label: "Landing",
    canonicalUrl: "https://example.com/offer",
    confidenceScore: 0.86,
    changeType: "unchanged"
  });
  const graphCheckoutV2 = await repository.addGraphNode({
    graphVersionId: graphV2.id,
    funnelNodeId: checkoutV2.id,
    pageId: page.id,
    nodeType: "checkout",
    label: "Checkout",
    canonicalUrl: "https://example.com/checkout",
    priceValue: 127,
    currency: "USD",
    confidenceScore: 0.94,
    changeType: "updated"
  });
  const observedEdge = await repository.addGraphEdge({
    graphVersionId: graphV2.id,
    fromNodeId: graphEntryV2.id,
    toNodeId: graphCheckoutV2.id,
    edgeType: "observed_navigation",
    confidenceScore: 0.92,
    changeType: "new"
  });
  await repository.addGraphEvidence({
    graphVersionId: graphV2.id,
    edgeId: observedEdge.id,
    sourceType: "journey_event",
    sourceRefId: journeyOne.id,
    sourceUrl: "https://example.com/checkout",
    snippet: "click",
    payload: { eventType: "click", snapshotId: snapshot.id }
  });
  await repository.addGraphEvidence({
    graphVersionId: graphV2.id,
    edgeId: observedEdge.id,
    sourceType: "journey_event",
    sourceRefId: journeyTwo.id,
    sourceUrl: "https://example.com/checkout",
    snippet: "redirect",
    payload: { eventType: "redirect", snapshotId: snapshot.id }
  });

  const change = await repository.recordChangeEventDetailed(
    competitor.id,
    "price_change",
    "high",
    { graphVersionId: graphV1.id, priceValue: 97 },
    { graphVersionId: graphV2.id, priceValue: 127 },
    {
      changeFingerprint: `e2e-price-change-${graphV2.id}`,
      sourceGraphVersionId: graphV2.id
    }
  );
  if (change.created) {
    await repository.createAlert(org.id, competitor.id, change.id, "high");
  }

  const graphVersions = await repository.listGraphVersions(competitor.id);
  const latestEvidence = await repository.listGraphEvidence(graphV2.id);
  const changes = await repository.listChangeEvents(competitor.id);
  const alerts = await repository.listAlerts(org.id);

  assert(graphVersions.length >= 2, "expected at least 2 graph versions");
  assert(latestEvidence.some((item) => item.source_type === "journey_event"), "expected journey_event evidence on graph edge");
  assert(changes.some((item) => item.change_type === "price_change"), "expected price_change event");
  assert(alerts.length > 0, "expected at least one alert");

  return {
    competitorId: competitor.id,
    graphVersions: graphVersions.length,
    journeyEvidence: latestEvidence.filter((item) => item.source_type === "journey_event").length,
    changeEvents: changes.length,
    alerts: alerts.length
  };
}

async function main() {
  const config = loadConfig({
    ...process.env,
    SERVICE_NAME: "pipeline-e2e-smoke"
  });
  const logger = createLogger("pipeline-e2e-smoke", config.LOG_LEVEL);
  const db = new DatabaseClient(config.DATABASE_URL, logger);
  const repository = new Repository(db);

  const iterations = Math.max(1, Number(process.env.PIPELINE_E2E_ITERATIONS ?? "1"));
  const results: Array<Record<string, unknown>> = [];
  for (let index = 0; index < iterations; index += 1) {
    const run = await runSingleIteration(repository, index + 1);
    results.push(run);
  }

  await db.close();
  console.log(
    JSON.stringify(
      {
        ok: true,
        iterations,
        runs: results
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error);
  console.error(`Pipeline E2E smoke failed: ${message}`);
  process.exitCode = 1;
});
