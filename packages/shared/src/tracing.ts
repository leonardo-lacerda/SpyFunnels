import { randomUUID } from "node:crypto";

export type TraceContext = {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  origin: string | null;
  startedAt: string;
};

type TraceShape = Partial<{
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  origin: string | null;
  startedAt: string;
}>;

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toTraceContext(input: TraceShape): TraceContext | null {
  const traceId = toText(input.traceId);
  if (!traceId) return null;
  return {
    traceId,
    spanId: toText(input.spanId) ?? randomUUID().replace(/-/g, ""),
    parentSpanId: toText(input.parentSpanId) ?? null,
    origin: toText(input.origin) ?? null,
    startedAt: toText(input.startedAt) ?? new Date().toISOString()
  };
}

export function createTraceContext(seed?: Partial<TraceContext> | null): TraceContext {
  return {
    traceId: toText(seed?.traceId) ?? randomUUID().replace(/-/g, ""),
    spanId: toText(seed?.spanId) ?? randomUUID().replace(/-/g, ""),
    parentSpanId: toText(seed?.parentSpanId) ?? null,
    origin: toText(seed?.origin) ?? null,
    startedAt: toText(seed?.startedAt) ?? new Date().toISOString()
  };
}

export function deriveChildTrace(parent: TraceContext | null | undefined, origin?: string): TraceContext {
  if (!parent) {
    return createTraceContext({
      origin: origin ?? null
    });
  }
  return createTraceContext({
    traceId: parent.traceId,
    parentSpanId: parent.spanId,
    startedAt: parent.startedAt,
    origin: origin ?? parent.origin
  });
}

export function extractTraceContext(payload: unknown): TraceContext | null {
  const direct = asRecord(payload);
  if (direct) {
    const fromTraceField = toTraceContext(asRecord(direct._trace) ?? {});
    if (fromTraceField) {
      return fromTraceField;
    }
    const fromRoot = toTraceContext(direct as TraceShape);
    if (fromRoot) {
      return fromRoot;
    }
  }
  return null;
}

export function attachTraceContext<T>(payload: T, traceContext: TraceContext): T {
  const record = asRecord(payload);
  if (!record) return payload;
  return {
    ...record,
    _trace: traceContext
  } as T;
}
