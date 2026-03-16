# Funnel Graph - Status de Fases e Backlog

Atualizado em: `2026-03-16`

## Resumo Executivo
- `Fase 0` a `Fase 6` estao **implementadas** no codigo.
- Todos os itens `FG-001` a `FG-007` estao **entregues** tecnicamente.
- KPIs agora possuem **harness automatizado**, dataset versionado e relatorio persistido.
- Existem gates de desempenho que exigem **otimizacao operacional continua** (nao bloqueiam a implementacao do backlog).

## Status Por Fase

### Fase 0 - Baseline e arquitetura alvo
Status: `implementado`

Entregas:
- RFC tecnica formal do Funnel Graph em `docs/RFC_FUNNEL_GRAPH.md`.
- Baseline operacional em `docs/kpi-baseline.latest.json`.
- Harness de KPI com dataset versionado em `docs/kpi-dataset/funnel-graph-ground-truth.v1.json`.
- Relatorio automatizado em `docs/kpi-benchmark.latest.json` e `docs/kpi-benchmark.latest.md`.
- Persistencia de execucoes de benchmark em `kpi_benchmark_runs`.

### Fase 1 - Modelo de grafo e versionamento
Status: `implementado`

Entregas:
- Tabelas `graph_versions`, `graph_nodes`, `graph_edges`, `graph_evidence`.
- Campos temporais e de mudanca (`first_seen`, `last_seen`, `change_type`).
- Repositorios e endpoints para versao atual e historico.

### Fase 2 - Coleta de jornada real
Status: `implementado`

Entregas:
- Stream `journey.event.captured` com persistencia em `journey_events`.
- Eventos `click`, `submit`, `redirect`, `email_click`, `ad_click`.
- Associacao de eventos observados ao grafo via `graph_evidence`.

### Fase 3 - Extracao estruturada de ofertas/precos
Status: `implementado`

Entregas:
- Extractor hibrido DOM/regex.
- OCR opcional com fallback configuravel (`FUNNEL_OCR_ENABLED`).
- Fallback LLM e enrich comercial com score de confianca.
- Testes cobrindo cenario OCR + sinais comerciais.

### Fase 4 - Reconstrucao e diff inteligente
Status: `implementado`

Entregas:
- Versionamento temporal do grafo.
- Diff semantico (upsell novo, mudanca de preco, CTA novo/alterado, ramo removido).
- Alertas com evidencias e idempotencia por fingerprint.

### Fase 5 - UI n8n-like
Status: `implementado`

Entregas:
- Minimap no canvas.
- Agrupamento por `stage`/`channel` com colapso/expansao.
- Timeline de versoes com selecao de base.
- Comparacao lado a lado entre duas versoes de grafo.
- Painel de evidencia para no, aresta e grupo.

### Fase 6 - Hardening e producao
Status: `implementado`

Entregas:
- Retries e DLQ no consumidor Kafka.
- Metricas operacionais instrumentadas (publish/consume latency, erro, DLQ).
- Endpoints operacionais (`/metrics`, `/ops/slo`, `/ops/slo/history`).
- Exportador de trace opcional para backend externo (`TRACE_EXPORTER_ENDPOINT`).
- Suite E2E de pipeline (`npm run test:e2e:pipeline`) integrada na CI.

## KPIs de Sucesso - Situacao Atual

Status geral: `automatizado e monitorado`

Fonte:
- Harness: `npm run kpi:harness`
- Ultimo snapshot: `docs/kpi-benchmark.latest.json`

Gate atual (ultimo run):
- Precisao preco/oferta: `PASS`
- Recall upsell/downsell: `PASS`
- Reconstrucao com arestas observadas: `PASS`
- Tempo por competidor < 10 min: `PASS` (janela 7 dias, amostra minima atendida)
- Falso positivo critico < 10% (proxy): `PASS`

## Backlog Priorizado

Prioridade `P0`:
- [x] `FG-001` RFC formal + baseline congelado.
- [x] `FG-002` Stream de jornada real com `email_click`/`ad_click`.
- [x] `FG-003` KPI harness automatizado com dataset validado e relatorio.

Prioridade `P1`:
- [x] `FG-004` OCR opcional no extractor comercial.
- [x] `FG-005` Minimap + timeline + comparacao lado a lado no explorer.
- [x] `FG-006` E2E pipeline completo em CI.

Prioridade `P2`:
- [x] `FG-007` Observabilidade com metricas/SLO + exportador de tracing.
