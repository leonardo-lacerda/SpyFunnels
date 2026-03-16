import { load } from "cheerio";
import { loadConfig } from "@funnel/config";
import { DatabaseClient, Repository } from "@funnel/database";
import { createLogger } from "@funnel/logger";
import { deriveChildTrace, KafkaEventBus, TOPICS, type TraceContext, fetchJson } from "@funnel/shared";

type MetaAdResponse = {
  data?: Array<{
    id?: string;
    ad_snapshot_url?: string;
    ad_creative_bodies?: Array<{ text?: string }>;
    ad_creative_link_titles?: Array<{ text?: string }>;
    ad_creative_link_descriptions?: Array<{ text?: string }>;
    page_name?: string;
  }>;
};

const config = loadConfig({
  ...process.env,
  SERVICE_NAME: "ad-intelligence"
});
const logger = createLogger("ad-intelligence", config.LOG_LEVEL);
const db = new DatabaseClient(config.DATABASE_URL, logger);
const repository = new Repository(db);
const bus = new KafkaEventBus(logger, {
  clientId: `${config.KAFKA_CLIENT_ID}-ad-intelligence`,
  brokers: config.kafkaBrokers
});

function nextTrace(parent: TraceContext | null | undefined): TraceContext {
  return deriveChildTrace(parent, "ad-intelligence");
}

async function collectFromMetaApi(competitorId: string, competitorName: string): Promise<number> {
  const token = process.env.META_AD_LIBRARY_ACCESS_TOKEN;
  if (!token) {
    return 0;
  }
  const query = new URLSearchParams({
    search_terms: competitorName,
    ad_type: "ALL",
    ad_reached_countries: "['US']",
    limit: "20",
    access_token: token
  });
  const endpoint = `https://graph.facebook.com/v21.0/ads_archive?${query.toString()}`;
  const response = await fetchJson<MetaAdResponse>(endpoint);
  const ads = response.data ?? [];
  let count = 0;
  for (const ad of ads) {
    if (!ad.id) {
      continue;
    }
    const headline = ad.ad_creative_link_titles?.[0]?.text ?? ad.page_name ?? "Meta Ad";
    const body = ad.ad_creative_bodies?.[0]?.text ?? ad.ad_creative_link_descriptions?.[0]?.text ?? "";
    await repository.saveAd({
      competitorId,
      platform: "meta",
      externalId: ad.id,
      headline,
      bodyText: body,
      cta: "Learn More",
      landingUrl: ad.ad_snapshot_url ?? ""
    });
    count += 1;
  }
  return count;
}

async function collectFromPageSignals(competitorId: string): Promise<number> {
  const snapshots = await repository.listLatestSnapshotsByCompetitor(competitorId, 20);
  let count = 0;
  for (const snapshot of snapshots) {
    const $ = load(snapshot.html_content);
    const headline = $("h1").first().text().trim() || snapshot.page_title || "Website promo";
    const cta = $("a,button")
      .toArray()
      .map((entry) => $(entry).text().trim())
      .find((value) => /buy|start|join|get|trial|register|book|learn/i.test(value));
    if (!cta) {
      continue;
    }
    await repository.saveAd({
      competitorId,
      platform: "web_signal",
      externalId: `${snapshot.snapshot_id}-${count}`,
      headline,
      bodyText: `Detected promotional CTA from ${snapshot.canonical_url}`,
      cta,
      landingUrl: snapshot.canonical_url
    });
    count += 1;
  }
  return count;
}

async function collectAds(competitorId: string, traceContext?: TraceContext | null) {
  const competitor = await repository.getCompetitorById(competitorId);
  if (!competitor) {
    return;
  }
  const fromApi = await collectFromMetaApi(competitorId, competitor.display_name).catch((error) => {
    logger.warn({ competitorId, error }, "Meta API collection failed");
    return 0;
  });
  const fromSignals = await collectFromPageSignals(competitorId);
  await bus.publish(TOPICS.AD_INGESTED, competitorId, {
    competitorId,
    count: fromApi + fromSignals
  }, { traceContext: nextTrace(traceContext) });
  await bus.publish(TOPICS.FUNNEL_ANALYSIS_REQUESTED, competitorId, { competitorId }, { traceContext: nextTrace(traceContext) });
}

async function main() {
  await bus.connectProducer();
  await bus.createConsumer(`${config.KAFKA_GROUP_ID}-ad-intelligence`, [TOPICS.AD_SYNC_REQUESTED], async (event) => {
    const payload = event.payload as { competitorId: string };
    await collectAds(payload.competitorId, event.traceContext);
  });
  logger.info("Ad intelligence worker started");
}

main().catch((error) => {
  logger.error(error, "Ad intelligence failed");
  process.exit(1);
});
