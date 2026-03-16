import { createHash } from "node:crypto";
import { URL } from "node:url";
import { load } from "cheerio";
import { loadConfig } from "@funnel/config";
import { DatabaseClient, Repository } from "@funnel/database";
import { createLogger } from "@funnel/logger";
import { deriveChildTrace, KafkaEventBus, TOPICS, type TraceContext } from "@funnel/shared";

const config = loadConfig({
  ...process.env,
  SERVICE_NAME: "crawler"
});
const logger = createLogger("crawler", config.LOG_LEVEL);
const db = new DatabaseClient(config.DATABASE_URL, logger);
const repository = new Repository(db);
const bus = new KafkaEventBus(logger, {
  clientId: `${config.KAFKA_CLIENT_ID}-crawler`,
  brokers: config.kafkaBrokers
});

const maxPages = Number(process.env.CRAWL_MAX_PAGES ?? 30);

function nextTrace(parent: TraceContext | null | undefined): TraceContext {
  return deriveChildTrace(parent, "crawler");
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function isInternalLink(base: URL, candidate: string): boolean {
  try {
    const parsed = new URL(candidate, base);
    return parsed.hostname === base.hostname && ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function crawlCompetitor(competitorId: string, traceContext?: TraceContext | null): Promise<void> {
  const competitor = await repository.getCompetitorById(competitorId);
  if (!competitor) {
    logger.warn({ competitorId }, "Competitor not found");
    return;
  }
  const sources = await repository.getCompetitorSources(competitorId);
  if (sources.length === 0) {
    logger.warn({ competitorId }, "No active sources for competitor");
    return;
  }
  const primary = sources[0];
  if (!primary) {
    return;
  }
  const crawlRun = await repository.createCrawlRun(competitorId, primary.id, "discovery");
  const queue = [primary.normalized_url];
  const visited = new Set<string>();

  while (queue.length > 0 && visited.size < maxPages) {
    const target = queue.shift();
    if (!target || visited.has(target)) {
      continue;
    }
    visited.add(target);
    const start = Date.now();
    try {
      const response = await fetch(target, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
        }
      });
      const html = await response.text();
      const page = await repository.upsertPage(competitorId, target, hash(target));
      const $ = load(html);
      const title = $("title").first().text().trim();
      const snapshot = await repository.savePageSnapshot({
        pageId: page.id,
        crawlRunId: crawlRun.id,
        contentHash: hash(html),
        html,
        title,
        statusCode: response.status
      });

      const root = new URL(target);
      const links = $("a[href]")
        .toArray()
        .map((element) => $(element).attr("href"))
        .filter((href): href is string => typeof href === "string")
        .slice(0, 200);
      for (const href of links) {
        if (!isInternalLink(root, href)) {
          continue;
        }
        const resolved = new URL(href, root).toString();
        await repository.savePageLink(snapshot.id, hash(resolved), null, null);
        if (!visited.has(resolved) && queue.length < maxPages * 2) {
          queue.push(resolved);
        }
      }

      await bus.publish(TOPICS.CRAWL_PAGE_CAPTURED, page.id, {
        competitorId,
        pageId: page.id,
        snapshotId: snapshot.id,
        url: target,
        durationMs: Date.now() - start
      }, { traceContext: nextTrace(traceContext) });
      await bus.publish(TOPICS.STACK_DETECTION_REQUESTED, snapshot.id, {
        competitorId,
        snapshotId: snapshot.id
      }, { traceContext: nextTrace(traceContext) });
      logger.info({ competitorId, url: target }, "Page captured");
    } catch (error) {
      logger.error({ competitorId, url: target, error }, "Crawler failed for URL");
    }
  }

  await repository.completeCrawlRun(crawlRun.id, "completed");
  await bus.publish(TOPICS.CRAWL_COMPLETED, competitorId, {
    competitorId,
    crawlRunId: crawlRun.id,
    pagesVisited: visited.size
  }, { traceContext: nextTrace(traceContext) });
  await bus.publish(TOPICS.FUNNEL_ANALYSIS_REQUESTED, competitorId, { competitorId }, { traceContext: nextTrace(traceContext) });
  await bus.publish(TOPICS.MONITORING_REQUESTED, competitorId, { competitorId, orgId: competitor.org_id }, { traceContext: nextTrace(traceContext) });
}

async function main() {
  await bus.connectProducer();
  await bus.createConsumer(`${config.KAFKA_GROUP_ID}-crawler`, [TOPICS.CRAWL_REQUESTED], async (event) => {
    const payload = event.payload as { competitorId: string };
    await crawlCompetitor(payload.competitorId, event.traceContext);
  });
  logger.info("Crawler worker started");
}

main().catch((error) => {
  logger.error(error, "Crawler service failed");
  process.exit(1);
});
