# Funnel Graph KPI Harness Report

- Generated at: `2026-03-16T00:43:44.085Z`
- Dataset version: `v1.0.0`

## Metrics

- Price/offer precision: **100%** (target >= 90%)
- Upsell/downsell recall: **100%** (target >= 80%)
- Observed-edge coverage: **100%** (target >= 85%)
- Avg processing per competitor: **0.0001 min** (target <= 10 min)
- Processing sample size: **4** runs (lookback 7 days, minimum 3)
- Critical alert false-positive proxy: **0%** (target <= 10%)

## Gates

- Price precision gate: PASS
- Upsell/downsell recall gate: PASS
- Observed-edge reconstruction gate: PASS
- Processing-time gate: PASS
- Critical-alert FP gate: PASS

> Note: false-positive metric is a proxy based on muted critical alerts; definitive FP requires human labels.
