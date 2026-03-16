# Competitive Funnel Intelligence SaaS

Production-oriented monorepo implementation for crawling, simulation, stack detection, ad/email intelligence, funnel reconstruction, monitoring, reporting, and dashboard operations.

## Monorepo Structure

- `apps/web`: React dashboard for operators and analysts.
- `apps/api`: API gateway with auth, competitor orchestration, alerts, reports, and AI insights.
- `services/crawler`: URL discovery and page capture worker.
- `services/browser-automation`: human-like browsing simulation worker.
- `services/funnel-analysis`: funnel graph reconstruction and AI analysis worker.
- `services/email-intelligence`: Mailpit ingestion and email sequence extraction worker.
- `services/ad-intelligence`: ad collection worker (Meta API + on-site signal fallback).
- `services/stack-detection`: script and technology fingerprinting worker.
- `services/monitoring-engine`: historical diff monitoring and alert generation worker.
- `packages/shared`: event bus, shared topics, HTTP helpers, AI prompt utilities.
- `packages/database`: PostgreSQL client and repositories.
- `packages/config`: typed configuration loader and validation.
- `packages/logger`: structured logging.
- `packages/types`: shared domain schemas and types.
- `migrations`: SQL migrations.
- `scripts`: migration and seed scripts.
- `infrastructure/docker`: monorepo Dockerfile and Compose stack.
- `infrastructure/kubernetes`: deployment manifests and autoscaling.
- `infrastructure/terraform`: cloud provisioning baseline (AWS EKS + ECR + VPC).

## Local Development

1. Copy `.env.example` to `.env` and set secrets.
2. Install dependencies:
   - `npm install`
3. Start infrastructure:
   - `docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redpanda mailpit`
4. Run migrations and seed:
   - `npm run db:migrate`
   - `npm run db:seed`
5. Start API and workers:
   - `npm run dev --workspace @funnel/api`
   - `npm run dev --workspace @funnel/crawler`
   - `npm run dev --workspace @funnel/browser-automation`
   - `npm run dev --workspace @funnel/stack-detection`
   - `npm run dev --workspace @funnel/email-intelligence`
   - `npm run dev --workspace @funnel/ad-intelligence`
   - `npm run dev --workspace @funnel/funnel-analysis`
   - `npm run dev --workspace @funnel/monitoring-engine`
6. Start dashboard:
   - `npm run dev --workspace @funnel/web`

Default seeded login:
- `admin@local`
- `admin1234567890`

You can override these during seed with:
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ORG_NAME`

## Quality and Observability Commands

- KPI baseline snapshot:
  - `npm run kpi:baseline`
- KPI harness with dataset and report:
  - `npm run kpi:harness`
- Pipeline end-to-end smoke test:
  - `npm run test:e2e:pipeline`
  - optional iterations: `PIPELINE_E2E_ITERATIONS=3 npm run test:e2e:pipeline`

API observability endpoints:
- `GET /metrics` (Prometheus text format)
- `GET /ops/slo`
- `GET /ops/slo/history`

KPI tuning env vars:
- `KPI_PROCESSING_LOOKBACK_DAYS` (default `7`)
- `KPI_PROCESSING_MIN_SAMPLES` (default `3`)
