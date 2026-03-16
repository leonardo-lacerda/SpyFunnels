# Project Structure Rationale

## Why a Monorepo

The platform has tightly coupled domain contracts (events, schemas, repositories, auth context). A monorepo keeps these contracts versioned together and reduces integration drift across distributed workers.

## Directory Responsibilities

- `apps`: user-facing interfaces (`web`) and API gateway/control plane (`api`).
- `services`: asynchronous data plane workers for each intelligence capability.
- `packages`: reusable cross-cutting libraries (types, database, config, logging, shared event contracts).
- `infrastructure`: deployment artifacts for local and production environments.
- `scripts`: migration and bootstrap automation.
- `docs`: architecture and operational documentation.

## Service Communication Model

- Synchronous: HTTP through API app for user actions.
- Asynchronous: Kafka topics for crawl/sim/analysis/report pipelines.
- Persistence: PostgreSQL as source of truth with snapshot/event lineage.

