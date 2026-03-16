import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { loadConfig } from "@funnel/config";
import { DatabaseClient, Repository } from "@funnel/database";
import { createLogger } from "@funnel/logger";
import { deriveChildTrace, KafkaEventBus, TOPICS, type TraceContext } from "@funnel/shared";

const config = loadConfig({
  ...process.env,
  SERVICE_NAME: "browser-automation"
});
const logger = createLogger("browser-automation", config.LOG_LEVEL);
const db = new DatabaseClient(config.DATABASE_URL, logger);
const repository = new Repository(db);
const bus = new KafkaEventBus(logger, {
  clientId: `${config.KAFKA_CLIENT_ID}-browser-automation`,
  brokers: config.kafkaBrokers
});

type JourneyEventType = "click" | "submit" | "redirect" | "email_click" | "ad_click";

function nextTrace(parent: TraceContext | null | undefined): TraceContext {
  return deriveChildTrace(parent, "browser-automation");
}

function inferAttributionEvent(url: string): { eventType: "email_click" | "ad_click"; sourceChannel: string; sourceRef: string | null } | null {
  try {
    const parsed = new URL(url);
    const utmSource = (parsed.searchParams.get("utm_source") ?? "").toLowerCase();
    const utmMedium = (parsed.searchParams.get("utm_medium") ?? "").toLowerCase();
    const utmCampaign = parsed.searchParams.get("utm_campaign");
    const sourceRef = utmCampaign || parsed.searchParams.get("campaign_id") || null;

    const emailSource =
      utmMedium.includes("email") ||
      utmSource.includes("email") ||
      utmSource.includes("newsletter") ||
      utmSource.includes("mail");
    if (emailSource) {
      return {
        eventType: "email_click",
        sourceChannel: utmSource || "email",
        sourceRef
      };
    }

    const hasAdClickId =
      parsed.searchParams.has("gclid") ||
      parsed.searchParams.has("fbclid") ||
      parsed.searchParams.has("ttclid") ||
      parsed.searchParams.has("msclkid");
    const paidMedium =
      utmMedium.includes("cpc") ||
      utmMedium.includes("paid") ||
      utmMedium.includes("ppc") ||
      utmMedium.includes("display") ||
      utmMedium.includes("social");
    const paidSource =
      utmSource.includes("facebook") ||
      utmSource.includes("instagram") ||
      utmSource.includes("meta") ||
      utmSource.includes("google") ||
      utmSource.includes("youtube") ||
      utmSource.includes("tiktok") ||
      utmSource.includes("linkedin");
    if (hasAdClickId || paidMedium || paidSource) {
      return {
        eventType: "ad_click",
        sourceChannel: utmSource || utmMedium || "paid_media",
        sourceRef
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function simulate(competitorId: string, scenario: string, traceContext?: TraceContext | null) {
  const competitor = await repository.getCompetitorById(competitorId);
  if (!competitor) {
    return;
  }
  const sources = await repository.getCompetitorSources(competitorId);
  const startUrl = sources[0]?.normalized_url;
  if (!startUrl) {
    return;
  }

  const run = await repository.createSimulationRun(competitorId, scenario);
  const inboxAddress = `lead-${randomUUID().slice(0, 8)}@funnel.local`;
  await repository.ensureInbox(competitor.org_id, inboxAddress);
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext({
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36"
  });
  const page = await context.newPage();
  const started = Date.now();
  let stepOrder = 1;
  let lastUrl = startUrl;

  async function emitJourneyEvent(params: {
    stepId: string;
    observedAt: string;
    eventType: JourneyEventType;
    actionType: string;
    fromUrl?: string | null;
    toUrl?: string | null;
    sourceChannel?: string | null;
    sourceRef?: string | null;
    payload?: Record<string, unknown> | null;
  }) {
    const persisted = await repository.recordJourneyEvent({
      competitorId,
      runId: run.id,
      stepId: params.stepId,
      eventType: params.eventType,
      sourceChannel: params.sourceChannel ?? null,
      sourceRef: params.sourceRef ?? null,
      fromUrl: params.fromUrl ?? null,
      toUrl: params.toUrl ?? null,
      payload: params.payload ?? null,
      observedAt: params.observedAt
    });
    if (!persisted.created) {
      return;
    }
    await bus.publish(
      TOPICS.JOURNEY_EVENT_CAPTURED,
      persisted.id,
      {
        journeyEventId: persisted.id,
        competitorId,
        runId: run.id,
        stepId: params.stepId,
        actionType: params.actionType,
        eventType: params.eventType,
        fromUrl: params.fromUrl ?? null,
        toUrl: params.toUrl ?? null,
        sourceChannel: params.sourceChannel ?? null,
        sourceRef: params.sourceRef ?? null,
        observedAt: params.observedAt,
        payload: params.payload ?? null
      },
      { traceContext: nextTrace(traceContext) }
    );
  }

  async function record(actionType: string, result: string, latencyMs: number, targetUrl?: string | null) {
    const resolvedTargetUrl = targetUrl ?? page.url();
    const step = await repository.addSimulationStep(run.id, stepOrder, actionType, resolvedTargetUrl, result, latencyMs);
    stepOrder += 1;
    return { stepId: step.id, observedAt: step.created_at, targetUrl: resolvedTargetUrl };
  }

  async function captureRedirectIfChanged() {
    const current = page.url();
    if (current !== lastUrl) {
      const fromUrl = lastUrl;
      const recorded = await record("redirect", "ok", 250, current);
      await emitJourneyEvent({
        stepId: recorded.stepId,
        observedAt: recorded.observedAt,
        eventType: "redirect",
        actionType: "redirect",
        fromUrl,
        toUrl: current,
        payload: {
          scenario,
          runId: run.id
        }
      });
      const attribution = inferAttributionEvent(current);
      if (attribution) {
        await emitJourneyEvent({
          stepId: recorded.stepId,
          observedAt: recorded.observedAt,
          eventType: attribution.eventType,
          actionType: "redirect",
          fromUrl,
          toUrl: current,
          sourceChannel: attribution.sourceChannel,
          sourceRef: attribution.sourceRef,
          payload: {
            scenario,
            runId: run.id
          }
        });
      }
      lastUrl = current;
    }
  }

  try {
    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const gotoRecord = await record("goto", "ok", Date.now() - started, startUrl);
    const gotoAttribution = inferAttributionEvent(gotoRecord.targetUrl);
    if (gotoAttribution) {
      await emitJourneyEvent({
        stepId: gotoRecord.stepId,
        observedAt: gotoRecord.observedAt,
        eventType: gotoAttribution.eventType,
        actionType: "goto",
        fromUrl: null,
        toUrl: gotoRecord.targetUrl,
        sourceChannel: gotoAttribution.sourceChannel,
        sourceRef: gotoAttribution.sourceRef,
        payload: {
          scenario,
          runId: run.id
        }
      });
    }
    await captureRedirectIfChanged();

    await page.waitForTimeout(1000 + Math.floor(Math.random() * 1200));
    await page.mouse.wheel(0, 500 + Math.floor(Math.random() * 1000));
    await record("scroll", "ok", 800, page.url());

    const emailInput = page.locator('input[type="email"], input[name*="email" i]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill(inboxAddress);
      await record("fill_email", "ok", 500, page.url());
      const submit = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submit.isVisible({ timeout: 1000 }).catch(() => false)) {
        const fromUrl = page.url();
        await submit.click({ timeout: 2000 });
        await page.waitForTimeout(1200);
        const submitRecord = await record("submit", "ok", 1200, page.url());
        await emitJourneyEvent({
          stepId: submitRecord.stepId,
          observedAt: submitRecord.observedAt,
          eventType: "submit",
          actionType: "submit",
          fromUrl,
          toUrl: submitRecord.targetUrl,
          payload: {
            scenario,
            runId: run.id
          }
        });
        const submitAttribution = inferAttributionEvent(submitRecord.targetUrl);
        if (submitAttribution) {
          await emitJourneyEvent({
            stepId: submitRecord.stepId,
            observedAt: submitRecord.observedAt,
            eventType: submitAttribution.eventType,
            actionType: "submit",
            fromUrl,
            toUrl: submitRecord.targetUrl,
            sourceChannel: submitAttribution.sourceChannel,
            sourceRef: submitAttribution.sourceRef,
            payload: {
              scenario,
              runId: run.id
            }
          });
        }
        await captureRedirectIfChanged();
      }
    }

    const ctaLink = page
      .locator("a[href], button")
      .filter({ hasText: /buy|pricing|checkout|plan|offer|learn|start|get|book/i })
      .first();
    if (await ctaLink.isVisible({ timeout: 1500 }).catch(() => false)) {
      const before = page.url();
      await ctaLink.click({ timeout: 2500 }).catch(() => undefined);
      await page.waitForTimeout(1000);
      const clickRecord = await record("click_cta", "ok", 700, page.url());
      await emitJourneyEvent({
        stepId: clickRecord.stepId,
        observedAt: clickRecord.observedAt,
        eventType: "click",
        actionType: "click_cta",
        fromUrl: before,
        toUrl: clickRecord.targetUrl,
        payload: {
          scenario,
          runId: run.id
        }
      });
      const clickAttribution = inferAttributionEvent(clickRecord.targetUrl);
      if (clickAttribution) {
        await emitJourneyEvent({
          stepId: clickRecord.stepId,
          observedAt: clickRecord.observedAt,
          eventType: clickAttribution.eventType,
          actionType: "click_cta",
          fromUrl: before,
          toUrl: clickRecord.targetUrl,
          sourceChannel: clickAttribution.sourceChannel,
          sourceRef: clickAttribution.sourceRef,
          payload: {
            scenario,
            runId: run.id
          }
        });
      }
      if (page.url() !== before) {
        await captureRedirectIfChanged();
      }
    }

    if (scenario === "abandon_checkout") {
      const before = page.url();
      await page.locator("a,button").first().click({ timeout: 1200 }).catch(() => undefined);
      const abandonRecord = await record("abandon", "ok", 300, page.url());
      await emitJourneyEvent({
        stepId: abandonRecord.stepId,
        observedAt: abandonRecord.observedAt,
        eventType: "click",
        actionType: "abandon",
        fromUrl: before,
        toUrl: abandonRecord.targetUrl,
        payload: {
          scenario,
          runId: run.id
        }
      });
      if (page.url() !== before) {
        await captureRedirectIfChanged();
      }
    }

    await repository.completeSimulationRun(run.id, "completed");
    await bus.publish(TOPICS.SIMULATION_COMPLETED, competitorId, {
      competitorId,
      runId: run.id,
      inboxAddress
    }, { traceContext: nextTrace(traceContext) });
    await bus.publish(TOPICS.EMAIL_SYNC_REQUESTED, competitorId, {
      competitorId,
      inboxAddress
    }, { traceContext: nextTrace(traceContext) });
    await bus.publish(TOPICS.FUNNEL_ANALYSIS_REQUESTED, competitorId, {
      competitorId
    }, { traceContext: nextTrace(traceContext) });
  } catch (error) {
    await repository.completeSimulationRun(run.id, "failed");
    logger.error({ competitorId, error }, "Simulation failed");
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  await bus.connectProducer();
  await bus.createConsumer(
    `${config.KAFKA_GROUP_ID}-browser-automation`,
    [TOPICS.SIMULATION_REQUESTED],
    async (event) => {
      const payload = event.payload as { competitorId: string; scenario?: string };
      await simulate(payload.competitorId, payload.scenario ?? "engage", event.traceContext);
    }
  );
  logger.info("Browser automation worker started");
}

main().catch((error) => {
  logger.error(error, "Browser automation service failed");
  process.exit(1);
});
