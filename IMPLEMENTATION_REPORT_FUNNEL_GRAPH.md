# IMPLEMENTATION REPORT - Funnel Graph

Data: `2026-03-16`

## 1. O que foi implementado

### Fase 0 (Baseline + arquitetura alvo)
- RFC formalizada e atualizada para status `Accepted` em `docs/RFC_FUNNEL_GRAPH.md`.
- Harness de KPI implementado com dataset versionado e execucao automatizada:
  - `npm run kpi:harness`
  - gera `docs/kpi-benchmark.latest.json` e `docs/kpi-benchmark.latest.md`.
- Persistencia de benchmark em banco (`kpi_benchmark_runs`).

### Fase 1 (Modelo de grafo/versionamento)
- Mantido e validado o modelo com `graph_versions`, `graph_nodes`, `graph_edges`, `graph_evidence` e campos temporais.

### Fase 2 (Jornada real observada)
- Mantida a stream de jornada com `journey.event.captured` e associacao de evidencias em arestas.

### Fase 3 (Extracao estruturada com OCR)
- OCR opcional adicionado ao extractor semantico (fallback orientado a imagem via LLM quando habilitado).
- Novas flags:
  - `FUNNEL_OCR_ENABLED`
  - `FUNNEL_OCR_MAX_IMAGES`
  - `FUNNEL_OCR_TIMEOUT_MS`
- Testes atualizados para validar cenario OCR.

### Fase 4 (Reconstrucao + diff inteligente)
- Mantida implementacao de versionamento/diff e alertas semanticos com evidencias.

### Fase 5 (UI n8n-like)
- `FlowGraphExplorer` evoluido com:
  - minimap
  - agrupamento por `stage` ou `channel`
  - colapso/expansao de grupos
  - selecao de grupo com painel de evidencias agregadas
- `CompetitorFunnelsPage` evoluida com:
  - timeline de versoes de grafo
  - selecao de versao base
  - comparacao lado a lado entre duas versoes
  - resumo de delta (nodes/edges/evidence)

### Fase 6 (Hardening/Producao)
- Instrumentacao de observabilidade adicionada:
  - metricas de Kafka publish/consume/retry/DLQ
  - metricas HTTP da API
  - endpoint Prometheus: `GET /metrics`
  - endpoints SLO: `GET /ops/slo`, `GET /ops/slo/history`
- Exportador de trace opcional para backend externo (`TRACE_EXPORTER_ENDPOINT`).
- Suite E2E de pipeline implementada:
  - `npm run test:e2e:pipeline`
  - integrada na CI (`.github/workflows/ci.yml`).
- Benchmark de processamento endurecido:
  - janela de medicao recente + amostra minima
  - E2E com multiplas iteracoes para estabilidade de KPI em CI.

## 2. Novos arquivos criados
- `docs/kpi-dataset/funnel-graph-ground-truth.v1.json`
- `docs/kpi-benchmark.latest.json` (gerado)
- `docs/kpi-benchmark.latest.md` (gerado)
- `migrations/005_observability.sql`
- `scripts/run-funnel-graph-kpi-harness.ts`
- `scripts/pipeline-e2e-smoke.ts`
- `packages/shared/src/metrics.ts`
- `packages/shared/src/trace-exporter.ts`

## 3. Arquivos modificados (principais)
- `docs/FUNNEL_GRAPH_PHASE_BACKLOG.md`
- `docs/RFC_FUNNEL_GRAPH.md`
- `DEVELOPMENT_PROGRESS.md`
- `package.json`
- `.github/workflows/ci.yml`
- `.env.example`
- `packages/config/src/index.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/event-bus.ts`
- `packages/database/src/repositories.ts`
- `services/funnel-analysis/src/semantic-extraction.ts`
- `services/funnel-analysis/src/semantic-extraction.test.ts`
- `services/funnel-analysis/src/index.ts`
- `apps/api/src/index.ts`
- `apps/web/src/types/intelligence.ts`
- `apps/web/src/services/intelligence.ts`
- `apps/web/src/hooks/use-platform-data.ts`
- `apps/web/src/features/funnels/components/FlowGraphExplorer.tsx`
- `apps/web/src/pages/competitor/CompetitorFunnelsPage.tsx`

## 4. Melhorias entregues
- Maior robustez de extracao comercial (incluindo conteudo em imagem).
- Visao temporal e comparativa de versoes de grafo diretamente no explorer.
- Observabilidade operacional pronta para scraping e governanca de SLO.
- Automacao de validacao de KPI com dataset versionado e historico persistido.
- Cobertura E2E de pipeline de ponta a ponta no CI.

## 5. Potenciais melhorias futuras
- Aumentar a amostra e diversidade de cargas de benchmark para validar estabilidade do KPI de tempo em cenarios de maior volume.
- Adicionar carga/falha real de Kafka no CI (alem do smoke E2E atual).
- Enriquecer dataset de KPI com mais casos reais multi-lingua/estrategia.
- Conectar exportador de trace a collector OTEL em ambiente de producao com dashboards prontos.
