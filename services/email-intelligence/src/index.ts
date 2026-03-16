import { URL } from "node:url";
import { loadConfig } from "@funnel/config";
import { DatabaseClient, Repository } from "@funnel/database";
import { createLogger } from "@funnel/logger";
import { deriveChildTrace, KafkaEventBus, TOPICS, type TraceContext, fetchJson } from "@funnel/shared";

type MailpitListResponse = {
  messages?: Array<{
    ID?: string;
    Subject?: string;
    From?: { Address?: string };
    To?: Array<{ Address?: string }>;
  }>;
};

type MailpitMessageResponse = {
  ID?: string;
  Subject?: string;
  From?: { Address?: string };
  Text?: string;
  HTML?: string;
};

const config = loadConfig({
  ...process.env,
  SERVICE_NAME: "email-intelligence"
});
const logger = createLogger("email-intelligence", config.LOG_LEVEL);
const db = new DatabaseClient(config.DATABASE_URL, logger);
const repository = new Repository(db);
const bus = new KafkaEventBus(logger, {
  clientId: `${config.KAFKA_CLIENT_ID}-email-intelligence`,
  brokers: config.kafkaBrokers
});

function nextTrace(parent: TraceContext | null | undefined): TraceContext {
  return deriveChildTrace(parent, "email-intelligence");
}

function extractLinks(content: string): string[] {
  const matches = content.match(/https?:\/\/[^\s"')]+/gi);
  return matches ? Array.from(new Set(matches)) : [];
}

function extractUtm(url: URL): Record<string, string> {
  const utm: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key.toLowerCase().startsWith("utm_")) {
      utm[key] = value;
    }
  }
  return utm;
}

async function syncEmails(competitorId: string, inboxAddress?: string, traceContext?: TraceContext | null) {
  const competitor = await repository.getCompetitorById(competitorId);
  if (!competitor) {
    return;
  }

  const inbox = await repository.ensureInbox(
    competitor.org_id,
    inboxAddress ?? `lead-${competitor.primary_domain.replace(/[^a-z0-9]/gi, "")}@funnel.local`
  );
  const list = await fetchJson<MailpitListResponse>(`${config.MAILPIT_API_URL}/api/v1/messages`);
  const messages = list.messages ?? [];

  for (const item of messages) {
    if (!item.ID) {
      continue;
    }
    const detail = await fetchJson<MailpitMessageResponse>(`${config.MAILPIT_API_URL}/api/v1/message/${item.ID}`);
    const fromAddress = detail.From?.Address ?? item.From?.Address ?? "";
    if (!fromAddress.includes(competitor.primary_domain)) {
      continue;
    }
    const bodyText = detail.Text ?? "";
    const bodyHtml = detail.HTML ?? "";
    const stored = await repository.saveEmailMessage({
      inboxId: inbox.id,
      competitorId,
      subject: detail.Subject ?? item.Subject ?? "(no subject)",
      fromDomain: fromAddress,
      bodyText,
      bodyHtml
    });
    const links = extractLinks(`${bodyText}\n${bodyHtml}`);
    for (const link of links.slice(0, 50)) {
      try {
        const parsed = new URL(link);
        await repository.saveEmailLink(stored.id, link, parsed.toString(), extractUtm(parsed));
      } catch {
        logger.debug({ link }, "Skipping invalid URL from email");
      }
    }
    await bus.publish(TOPICS.EMAIL_INGESTED, stored.id, {
      competitorId,
      messageId: stored.id
    }, { traceContext: nextTrace(traceContext) });
  }

  await bus.publish(TOPICS.FUNNEL_ANALYSIS_REQUESTED, competitorId, { competitorId }, { traceContext: nextTrace(traceContext) });
}

async function main() {
  await bus.connectProducer();
  await bus.createConsumer(`${config.KAFKA_GROUP_ID}-email-intelligence`, [TOPICS.EMAIL_SYNC_REQUESTED], async (event) => {
    const payload = event.payload as { competitorId: string; inboxAddress?: string };
    await syncEmails(payload.competitorId, payload.inboxAddress, event.traceContext);
  });
  logger.info("Email intelligence worker started");
}

main().catch((error) => {
  logger.error(error, "Email intelligence failed");
  process.exit(1);
});
