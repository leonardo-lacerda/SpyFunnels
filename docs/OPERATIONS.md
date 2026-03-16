# Operations Guide

## Required Infrastructure

- PostgreSQL 16+
- Kafka-compatible broker (Redpanda/Kafka)
- Mailpit for test inbox capture
- Object storage (optional for artifact offloading)

## Health and Reliability

- API health endpoint: `GET /health`
- API readiness endpoint: `GET /ready` (checks database connectivity)
- Use worker logs and Kafka consumer lag to monitor pipeline performance.
- Scale crawler and browser automation workers independently.

## Security Baselines

- Rotate JWT secret in production.
- Keep API and worker credentials in a secrets manager.
- Restrict dashboard and API ingress behind identity provider and WAF.
- Enable audit logs for report generation and competitor target changes.
