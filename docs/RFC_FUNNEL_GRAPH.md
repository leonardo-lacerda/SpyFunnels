# RFC: Funnel Graph Data Contract and Baseline

Status: Accepted  
Ultima atualizacao: `2026-03-16`

## 1. Objetivo
Definir o contrato de dados do Funnel Graph e o fluxo de versionamento para reconstruir jornadas de funil com evidencias rastreaveis ao longo do tempo.

## 2. Escopo
- Modelagem de `graph_versions`, `graph_nodes`, `graph_edges`, `graph_evidence`.
- Contrato de enriquecimento comercial (preco, moeda, parcelamento, CTA, upsell/downsell).
- Contrato de jornada observada (`journey_events`) e associacao com arestas.
- Semantica de diff para alertas de negocio.

## 3. Entidades e Invariantes

### `graph_versions`
- Identifica uma versao temporal do grafo por competidor.
- Invariantes:
  - `(competitor_id, version_no)` unico.
  - Apenas uma versao ativa por competidor (`valid_to is null`).

### `graph_nodes`
- Nos de funil para uma versao de grafo.
- Campos chave:
  - `node_type`, `label`, `canonical_url`
  - `price_value`, `currency`
  - `confidence_score`
  - `first_seen`, `last_seen`, `change_type`
- Invariantes:
  - `first_seen <= last_seen`
  - `confidence_score` no intervalo operacional `[0, 1]` (por convencao de writer).

### `graph_edges`
- Arestas direcionadas entre nos (`from_node_id`, `to_node_id`).
- Campos chave:
  - `edge_type`
  - `confidence_score`
  - `first_seen`, `last_seen`, `change_type`
- Invariantes:
  - `from_node_id != to_node_id` (aplicado na logica de escrita).

### `graph_evidence`
- Evidencias ligadas a no/aresta.
- Campos chave:
  - `source_type`, `source_ref_id`, `source_url`, `payload_json`, `captured_at`
- Invariantes:
  - Pelo menos um entre `node_id` ou `edge_id` deve existir.

### `journey_events`
- Eventos observados de jornada.
- Campos chave:
  - `event_type` (`click`, `submit`, `redirect`, `email_click`, `ad_click`)
  - `run_id`, `step_id`
  - `from_url`, `to_url`
  - `source_channel`, `source_ref`
- Invariantes:
  - Unicidade por `(run_id, step_id, event_type)`.
  - Associacao com grafo via `graph_evidence.source_ref_id = journey_events.id`.

## 4. Fluxo de Dados
1. `browser-automation` executa jornada e grava `simulation_steps`.
2. Eventos de jornada sao persistidos em `journey_events` e publicados em `journey.event.captured`.
3. `funnel-analysis` reconstrui nos/arestas e associa evidencias de jornada em arestas observadas.
4. `monitoring-engine` executa diff semantico entre versoes e gera alertas idempotentes.

## 5. Contrato de API (Graph)
- `GET /competitors/:id/graph/versions`
- `GET /competitors/:id/graph/current`
- `GET /competitors/:id/graph/:versionId`

Payload minimo esperado:
- Nodes com `first_seen`, `last_seen`, `change_type`, `confidence_score`.
- Edges com `first_seen`, `last_seen`, `change_type`, `confidence_score`.
- Evidence com `source_type`, `source_ref_id`, `captured_at`.

## 6. Baseline e KPIs
Script de baseline operacional:
- `npm run kpi:baseline`
- Saida padrao: `docs/kpi-baseline.latest.json`

Metricas calculadas automaticamente:
- Cobertura de grafo por competidor monitorado.
- Razao de arestas observadas no grafo mais recente.
- Tempo medio de processamento por crawl.
- Proxy de falso positivo critico (alertas criticos mutados).

Metricas que exigem ground truth externo (nao inferiveis apenas com banco):
- Precisao de deteccao de preco/oferta.
- Recall de deteccao de upsell/downsell.

## 7. Riscos e Pendencias
- Falta conjunto validado com ground truth para KPI de qualidade semantica.
- Falta pipeline E2E completa em CI para medir regressao de extracao e diff.
- Falta backend de observabilidade para traces/metricas com SLO formal.

## 8. Criterio de Evolucao
Mudancas no contrato do Funnel Graph devem:
- Atualizar esta RFC.
- Atualizar migracoes/repositorios/endpoints.
- Incluir teste de contrato da API e, quando aplicavel, teste de extracao.

## 9. Artefatos de Conformidade
- Baseline: `docs/kpi-baseline.latest.json`
- Harness KPI: `npm run kpi:harness`
- Dataset versionado: `docs/kpi-dataset/funnel-graph-ground-truth.v1.json`
- Relatorio KPI: `docs/kpi-benchmark.latest.json` e `docs/kpi-benchmark.latest.md`
