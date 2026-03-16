import type { TraceContext } from "./tracing.js";

type TraceExportEvent = {
  service: string;
  operation: string;
  traceContext: TraceContext | null;
  durationMs?: number;
  status?: "ok" | "error";
  attributes?: Record<string, unknown>;
  error?: { message: string; stack?: string };
};

function endpointFromEnv(): string | null {
  const value = process.env.TRACE_EXPORTER_ENDPOINT;
  if (!value || !value.trim()) return null;
  return value.trim();
}

function timeoutFromEnv(): number {
  const raw = process.env.TRACE_EXPORTER_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 5_000;
  return parsed;
}

export function emitTraceEvent(event: TraceExportEvent): void {
  const endpoint = endpointFromEnv();
  if (!endpoint) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutFromEnv());
  const payload = {
    emittedAt: new Date().toISOString(),
    ...event
  };

  void fetch(endpoint, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .catch(() => undefined)
    .finally(() => clearTimeout(timeout));
}
