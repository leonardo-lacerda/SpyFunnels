import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const outputPath = process.env.KPI_BASELINE_OUTPUT ?? path.resolve(process.cwd(), "docs", "kpi-baseline.latest.json");
const processingLookbackDays = Number(process.env.KPI_PROCESSING_LOOKBACK_DAYS ?? "7");

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

const one = async (sql, params = []) => (await client.query(sql, params)).rows[0] ?? null;

try {
  const competitors = await one(
    `select
       count(*)::int as total_competitors,
       count(*) filter (where status = 'active')::int as active_competitors
     from competitors`
  );
  const graphCoverage = await one(
    `select count(distinct competitor_id)::int as competitors_with_graph
     from graph_versions`
  );
  const edgeCoverage = await one(
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
  const processing = await one(
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
  const criticalAlerts = await one(
    `select
       count(*)::int as total_critical_alerts,
       count(*) filter (where status = 'muted')::int as muted_critical_alerts
     from alerts
     where severity = 'critical'`
  );

  const totalCompetitors = Number(competitors?.total_competitors ?? 0);
  const competitorsWithGraph = Number(graphCoverage?.competitors_with_graph ?? 0);
  const totalEdges = Number(edgeCoverage?.total_edges ?? 0);
  const observedEdges = Number(edgeCoverage?.observed_edges ?? 0);
  const totalCriticalAlerts = Number(criticalAlerts?.total_critical_alerts ?? 0);
  const mutedCriticalAlerts = Number(criticalAlerts?.muted_critical_alerts ?? 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    baseline: {
      totalCompetitors,
      activeCompetitors: Number(competitors?.active_competitors ?? 0),
      competitorsWithGraph,
      graphCoveragePercent: totalCompetitors > 0 ? Number(((competitorsWithGraph / totalCompetitors) * 100).toFixed(2)) : 0,
      totalEdges,
      observedEdges,
      observedEdgeRatioPercent: totalEdges > 0 ? Number(((observedEdges / totalEdges) * 100).toFixed(2)) : 0,
      processingLookbackDays,
      processingSampleSize: Number(processing?.sample_size ?? 0),
      avgProcessingMinutes: Number(processing?.avg_processing_minutes ?? 0),
      p95ProcessingMinutes: Number(processing?.p95_processing_minutes ?? 0),
      totalCriticalAlerts,
      mutedCriticalAlerts,
      mutedCriticalAlertRatioPercent:
        totalCriticalAlerts > 0 ? Number(((mutedCriticalAlerts / totalCriticalAlerts) * 100).toFixed(2)) : 0
    },
    qualityKpis: {
      priceOfferPrecisionPercent: null,
      upsellDownsellRecallPercent: null,
      criticalAlertFalsePositivePercent: null
    },
    notes: [
      "Metricas de precision/recall exigem conjunto de validacao com ground truth.",
      "criticalAlertFalsePositivePercent depende de rotulagem humana dos alertas."
    ]
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`KPI baseline generated at ${outputPath}`);
} finally {
  await client.end();
}
