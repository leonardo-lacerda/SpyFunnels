import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { extractHeuristicSignals } from "../services/funnel-analysis/src/semantic-extraction.ts";

type DatasetCase = {
  id: string;
  url: string;
  title: string;
  html: string;
  ocrText?: string;
  expected: {
    nodeType: string;
    priceValue: number | null;
    currency: string | null;
    installmentCount: number | null;
    hasUpsell: boolean;
    hasDownsell: boolean;
  };
};

type DatasetShape = {
  datasetVersion: string;
  updatedAt: string;
  cases: DatasetCase[];
};

function toPct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function closeEnough(left: number | null, right: number | null, tolerance = 0.01): boolean {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  return Math.abs(left - right) <= tolerance;
}

function booleanMatch(predicted: boolean, expected: boolean): boolean {
  return predicted === expected;
}

async function loadDataset(filePath: string): Promise<DatasetShape> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as DatasetShape;
}

async function queryDbMetrics(client: pg.Client) {
  const one = async <T>(sql: string, params: unknown[] = []) => (await client.query<T>(sql, params)).rows[0] ?? null;

  const edgeCoverage = await one<{ total_edges: number; observed_edges: number }>(
    `with latest as (
       select distinct on (competitor_id) id, competitor_id
       from graph_versions
       order by competitor_id, version_no desc
     )
     select
       count(*)::int as total_edges,
       count(*) filter (where ge.edge_type like '%navigation%')::int as observed_edges
     from graph_edges ge
     join latest l on l.id = ge.graph_version_id`
  );

  const processingLookbackDays = Number(process.env.KPI_PROCESSING_LOOKBACK_DAYS ?? "7");
  const processing = await one<{ sample_size: number; avg_processing_minutes: string; p95_processing_minutes: string }>(
    `with filtered as (
       select extract(epoch from (completed_at - started_at)) / 60.0 as minutes
       from crawl_runs
       where completed_at is not null
         and started_at >= now() - ($1::text || ' days')::interval
     ),
     chosen as (
       select * from filtered
       union all
       select extract(epoch from (completed_at - started_at)) / 60.0
       from crawl_runs
       where completed_at is not null
         and not exists (select 1 from filtered)
     )
     select
       count(*)::int as sample_size,
       coalesce(avg(minutes), 0)::numeric(12,4) as avg_processing_minutes,
       coalesce(percentile_disc(0.95) within group (order by minutes), 0)::numeric(12,4) as p95_processing_minutes
     from chosen`,
    [processingLookbackDays]
  );

  const criticalAlerts = await one<{ total_critical_alerts: number; muted_critical_alerts: number }>(
    `select
       count(*)::int as total_critical_alerts,
       count(*) filter (where status = 'muted')::int as muted_critical_alerts
     from alerts
     where severity = 'critical'`
  );

  return {
    totalEdges: Number(edgeCoverage?.total_edges ?? 0),
    observedEdges: Number(edgeCoverage?.observed_edges ?? 0),
    observedEdgeCoveragePercent: toPct(Number(edgeCoverage?.observed_edges ?? 0), Number(edgeCoverage?.total_edges ?? 0)),
    processingLookbackDays,
    processingSampleSize: Number(processing?.sample_size ?? 0),
    avgProcessingMinutes: Number(processing?.avg_processing_minutes ?? 0),
    p95ProcessingMinutes: Number(processing?.p95_processing_minutes ?? 0),
    criticalAlertFalsePositivePercentProxy: toPct(
      Number(criticalAlerts?.muted_critical_alerts ?? 0),
      Number(criticalAlerts?.total_critical_alerts ?? 0)
    )
  };
}

function asMarkdown(payload: Record<string, unknown>) {
  const runAt = String(payload.generatedAt);
  const datasetVersion = String(payload.datasetVersion);
  const metrics = payload.metrics as Record<string, number>;
  const thresholds = payload.thresholds as Record<string, number>;
  const checks = payload.checks as Record<string, boolean>;
  const processingMeta = payload.processing as Record<string, number>;

  return [
    "# Funnel Graph KPI Harness Report",
    "",
    `- Generated at: \`${runAt}\``,
    `- Dataset version: \`${datasetVersion}\``,
    "",
    "## Metrics",
    "",
    `- Price/offer precision: **${metrics.priceOfferPrecisionPercent}%** (target >= ${thresholds.priceOfferPrecisionPercent}%)`,
    `- Upsell/downsell recall: **${metrics.upsellDownsellRecallPercent}%** (target >= ${thresholds.upsellDownsellRecallPercent}%)`,
    `- Observed-edge coverage: **${metrics.observedEdgeCoveragePercent}%** (target >= ${thresholds.observedEdgeCoveragePercent}%)`,
    `- Avg processing per competitor: **${metrics.avgProcessingMinutes} min** (target <= ${thresholds.avgProcessingMinutes} min)`,
    `- Processing sample size: **${processingMeta.sampleSize}** runs (lookback ${processingMeta.lookbackDays} days, minimum ${processingMeta.minSamples})`,
    `- Critical alert false-positive proxy: **${metrics.criticalAlertFalsePositivePercentProxy}%** (target <= ${thresholds.criticalAlertFalsePositivePercent}%)`,
    "",
    "## Gates",
    "",
    `- Price precision gate: ${checks.pricePrecision ? "PASS" : "FAIL"}`,
    `- Upsell/downsell recall gate: ${checks.upsellRecall ? "PASS" : "FAIL"}`,
    `- Observed-edge reconstruction gate: ${checks.observedEdgeCoverage ? "PASS" : "FAIL"}`,
    `- Processing-time gate: ${checks.processingTime ? "PASS" : "FAIL"}`,
    `- Critical-alert FP gate: ${checks.falsePositiveRate ? "PASS" : "FAIL"}`,
    "",
    "> Note: false-positive metric is a proxy based on muted critical alerts; definitive FP requires human labels."
  ].join("\n");
}

async function main() {
  const root = process.cwd();
  const datasetPath = process.env.FUNNEL_KPI_DATASET_PATH ?? path.resolve(root, "docs", "kpi-dataset", "funnel-graph-ground-truth.v1.json");
  const jsonOutputPath = process.env.FUNNEL_KPI_OUTPUT_JSON ?? path.resolve(root, "docs", "kpi-benchmark.latest.json");
  const mdOutputPath = process.env.FUNNEL_KPI_OUTPUT_MD ?? path.resolve(root, "docs", "kpi-benchmark.latest.md");
  const dataset = await loadDataset(datasetPath);

  let nodeTypeHits = 0;
  let priceTp = 0;
  let priceFp = 0;
  let priceFn = 0;
  let upsellTp = 0;
  let upsellFn = 0;
  const caseDetails: Array<Record<string, unknown>> = [];

  for (const entry of dataset.cases) {
    const signal = extractHeuristicSignals(entry.url, entry.html, entry.title, {
      ...(entry.ocrText ? { ocrText: entry.ocrText } : {})
    });
    const nodeTypeMatch = signal.resolvedNodeType === entry.expected.nodeType;
    if (nodeTypeMatch) nodeTypeHits += 1;

    const predictedHasPrice = signal.priceValue != null;
    const expectedHasPrice = entry.expected.priceValue != null;
    const priceAndCurrencyMatch =
      closeEnough(signal.priceValue, entry.expected.priceValue) &&
      (entry.expected.currency == null || signal.currency === entry.expected.currency);

    if (predictedHasPrice) {
      if (expectedHasPrice && priceAndCurrencyMatch) {
        priceTp += 1;
      } else {
        priceFp += 1;
      }
    } else if (expectedHasPrice) {
      priceFn += 1;
    }

    const expectedUpsellSignal = entry.expected.hasUpsell || entry.expected.hasDownsell;
    const predictedUpsellSignal =
      booleanMatch(signal.hasUpsell, entry.expected.hasUpsell) || booleanMatch(signal.hasDownsell, entry.expected.hasDownsell);
    if (expectedUpsellSignal) {
      if (predictedUpsellSignal) {
        upsellTp += 1;
      } else {
        upsellFn += 1;
      }
    }

    caseDetails.push({
      id: entry.id,
      expected: entry.expected,
      predicted: {
        nodeType: signal.resolvedNodeType,
        priceValue: signal.priceValue,
        currency: signal.currency,
        installmentCount: signal.installmentCount,
        hasUpsell: signal.hasUpsell,
        hasDownsell: signal.hasDownsell
      },
      checks: {
        nodeTypeMatch,
        priceAndCurrencyMatch,
        upsellSignalMatch: !expectedUpsellSignal || predictedUpsellSignal
      }
    });
  }

  const databaseUrl = process.env.DATABASE_URL;
  const dbMetrics = {
    totalEdges: 0,
    observedEdges: 0,
    observedEdgeCoveragePercent: 0,
    avgProcessingMinutes: 0,
    p95ProcessingMinutes: 0,
    criticalAlertFalsePositivePercentProxy: 0
  };

  if (databaseUrl) {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const values = await queryDbMetrics(client);
      Object.assign(dbMetrics, values);
    } finally {
      await client.end();
    }
  }

  const metrics = {
    nodeTypeAccuracyPercent: toPct(nodeTypeHits, dataset.cases.length),
    priceOfferPrecisionPercent: toPct(priceTp, priceTp + priceFp),
    priceOfferRecallPercent: toPct(priceTp, priceTp + priceFn),
    upsellDownsellRecallPercent: toPct(upsellTp, upsellTp + upsellFn),
    observedEdgeCoveragePercent: dbMetrics.observedEdgeCoveragePercent,
    avgProcessingMinutes: Number(dbMetrics.avgProcessingMinutes.toFixed(4)),
    p95ProcessingMinutes: Number(dbMetrics.p95ProcessingMinutes.toFixed(4)),
    criticalAlertFalsePositivePercentProxy: dbMetrics.criticalAlertFalsePositivePercentProxy
  };
  const processingMinSamples = Number(process.env.KPI_PROCESSING_MIN_SAMPLES ?? "3");

  const thresholds = {
    priceOfferPrecisionPercent: 90,
    upsellDownsellRecallPercent: 80,
    observedEdgeCoveragePercent: 85,
    avgProcessingMinutes: 10,
    criticalAlertFalsePositivePercent: 10
  };

  const checks = {
    pricePrecision: metrics.priceOfferPrecisionPercent >= thresholds.priceOfferPrecisionPercent,
    upsellRecall: metrics.upsellDownsellRecallPercent >= thresholds.upsellDownsellRecallPercent,
    observedEdgeCoverage: metrics.observedEdgeCoveragePercent >= thresholds.observedEdgeCoveragePercent,
    processingTime:
      dbMetrics.processingSampleSize >= processingMinSamples &&
      metrics.avgProcessingMinutes <= thresholds.avgProcessingMinutes,
    falsePositiveRate: metrics.criticalAlertFalsePositivePercentProxy <= thresholds.criticalAlertFalsePositivePercent
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    datasetVersion: dataset.datasetVersion,
    datasetUpdatedAt: dataset.updatedAt,
    totalCases: dataset.cases.length,
    metrics,
    processing: {
      lookbackDays: dbMetrics.processingLookbackDays,
      sampleSize: dbMetrics.processingSampleSize,
      minSamples: processingMinSamples
    },
    thresholds,
    checks,
    caseDetails
  };

  await fs.mkdir(path.dirname(jsonOutputPath), { recursive: true });
  await fs.mkdir(path.dirname(mdOutputPath), { recursive: true });
  await fs.writeFile(jsonOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.writeFile(mdOutputPath, `${asMarkdown(payload)}\n`, "utf8");

  if (databaseUrl) {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query(
        `insert into kpi_benchmark_runs
         (id, dataset_version, total_cases, metrics_json, checks_json, generated_at)
         values (gen_random_uuid(), $1, $2, $3::jsonb, $4::jsonb, now())`,
        [dataset.datasetVersion, dataset.cases.length, JSON.stringify(metrics), JSON.stringify(checks)]
      );
    } catch {
      // Keep harness resilient if migration has not been applied yet.
    } finally {
      await client.end();
    }
  }

  console.log(`KPI harness generated:\n- ${jsonOutputPath}\n- ${mdOutputPath}`);
}

main().catch((error) => {
  console.error("KPI harness failed", error);
  process.exitCode = 1;
});
