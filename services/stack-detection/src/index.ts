import { createHash } from "node:crypto";
import { load } from "cheerio";
import { loadConfig } from "@funnel/config";
import { DatabaseClient, Repository } from "@funnel/database";
import { createLogger } from "@funnel/logger";
import { deriveChildTrace, KafkaEventBus, TOPICS, type TraceContext } from "@funnel/shared";

const config = loadConfig({
  ...process.env,
  SERVICE_NAME: "stack-detection"
});
const logger = createLogger("stack-detection", config.LOG_LEVEL);
const db = new DatabaseClient(config.DATABASE_URL, logger);
const repository = new Repository(db);
const bus = new KafkaEventBus(logger, {
  clientId: `${config.KAFKA_CLIENT_ID}-stack-detection`,
  brokers: config.kafkaBrokers
});

function nextTrace(parent: TraceContext | null | undefined): TraceContext {
  return deriveChildTrace(parent, "stack-detection");
}

const signatures: Array<{
  vendor: string;
  product: string;
  category: string;
  patterns: RegExp[];
}> = [
  { vendor: "Shopify", product: "Shopify", category: "commerce", patterns: [/cdn\.shopify\.com/i, /shopify/i] },
  { vendor: "Stripe", product: "Stripe", category: "payments", patterns: [/js\.stripe\.com/i, /stripe/i] },
  { vendor: "Meta", product: "Facebook Pixel", category: "analytics", patterns: [/connect\.facebook\.net/i, /fbq\(/i] },
  { vendor: "Google", product: "Google Analytics", category: "analytics", patterns: [/googletagmanager\.com/i, /gtag\(/i] },
  { vendor: "ClickFunnels", product: "ClickFunnels", category: "funnel_builder", patterns: [/clickfunnels/i] },
  { vendor: "Hotmart", product: "Hotmart", category: "checkout", patterns: [/hotmart/i] }
];

async function detect(snapshotId: string, competitorId: string, traceContext?: TraceContext | null) {
  const snapshot = await repository.getSnapshotById(snapshotId);
  if (!snapshot) {
    return;
  }
  const html = snapshot.html_content;
  const $ = load(html);
  const scripts = $("script[src]")
    .toArray()
    .map((entry) => $(entry).attr("src"))
    .filter((src): src is string => Boolean(src));

  for (const script of scripts) {
    const hash = createHash("sha256").update(script).digest("hex");
    const vendorGuess = script.includes("google")
      ? "Google"
      : script.includes("facebook")
        ? "Meta"
        : script.includes("shopify")
          ? "Shopify"
          : "unknown";
    await repository.saveTrackingScript(snapshotId, script, vendorGuess, hash);
  }

  for (const signature of signatures) {
    const matched = signature.patterns.some((pattern) => pattern.test(html));
    if (!matched) {
      continue;
    }
    await repository.saveTechnologyDetection(snapshotId, signature.vendor, signature.product, signature.category, 0.85);
  }

  await bus.publish(TOPICS.STACK_DETECTED, snapshotId, {
    competitorId,
    snapshotId
  }, { traceContext: nextTrace(traceContext) });
}

async function main() {
  await bus.connectProducer();
  await bus.createConsumer(
    `${config.KAFKA_GROUP_ID}-stack-detection`,
    [TOPICS.STACK_DETECTION_REQUESTED],
    async (event) => {
      const payload = event.payload as { competitorId: string; snapshotId: string };
      await detect(payload.snapshotId, payload.competitorId, event.traceContext);
    }
  );
  logger.info("Stack detection worker started");
}

main().catch((error) => {
  logger.error(error, "Stack detection service failed");
  process.exit(1);
});
