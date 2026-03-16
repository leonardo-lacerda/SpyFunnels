type LabelValue = string | number | boolean | null | undefined;
type MetricLabels = Record<string, LabelValue>;

type CounterPoint = {
  labels: Record<string, string>;
  value: number;
};

type HistogramPoint = {
  labels: Record<string, string>;
  count: number;
  sum: number;
  bucketCounts: number[];
};

type HistogramDefinition = {
  buckets: number[];
  points: Map<string, HistogramPoint>;
};

type CounterDefinition = {
  points: Map<string, CounterPoint>;
};

const DEFAULT_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000];
const GLOBAL_KEY = Symbol.for("funnel.shared.metrics.registry");

function toSafeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_:]/g, "_").replace(/_+/g, "_");
}

function normalizeLabels(labels?: MetricLabels): Record<string, string> {
  if (!labels) return {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(labels)) {
    if (value == null) continue;
    normalized[toSafeName(key)] = String(value);
  }
  return normalized;
}

function labelsKey(labels: Record<string, string>): string {
  const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
  return entries.map(([key, value]) => `${key}=${value}`).join("|");
}

function formatLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "";
  const rendered = entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}="${value.replace(/"/g, '\\"')}"`)
    .join(",");
  return `{${rendered}}`;
}

class MetricsRegistry {
  private counters = new Map<string, CounterDefinition>();
  private histograms = new Map<string, HistogramDefinition>();

  incrementCounter(name: string, value = 1, labels?: MetricLabels) {
    const metricName = toSafeName(name);
    const normalizedLabels = normalizeLabels(labels);
    const key = labelsKey(normalizedLabels);
    const def = this.counters.get(metricName) ?? { points: new Map<string, CounterPoint>() };
    const point = def.points.get(key) ?? { labels: normalizedLabels, value: 0 };
    point.value += value;
    def.points.set(key, point);
    this.counters.set(metricName, def);
  }

  observeHistogram(name: string, value: number, labels?: MetricLabels, buckets = DEFAULT_BUCKETS_MS) {
    const metricName = toSafeName(name);
    const normalizedLabels = normalizeLabels(labels);
    const key = labelsKey(normalizedLabels);
    const def = this.histograms.get(metricName) ?? { buckets: [...buckets], points: new Map<string, HistogramPoint>() };
    const point =
      def.points.get(key) ??
      {
        labels: normalizedLabels,
        count: 0,
        sum: 0,
        bucketCounts: def.buckets.map(() => 0)
      };

    point.count += 1;
    point.sum += value;
    for (const [index, bucket] of def.buckets.entries()) {
      if (value <= bucket) {
        point.bucketCounts[index] = (point.bucketCounts[index] ?? 0) + 1;
      }
    }
    def.points.set(key, point);
    this.histograms.set(metricName, def);
  }

  readCounter(name: string, labels?: MetricLabels): number {
    const metricName = toSafeName(name);
    const def = this.counters.get(metricName);
    if (!def) return 0;
    const normalizedLabels = normalizeLabels(labels);
    if (Object.keys(normalizedLabels).length === 0) {
      let total = 0;
      for (const point of def.points.values()) {
        total += point.value;
      }
      return total;
    }
    let total = 0;
    for (const point of def.points.values()) {
      const matches = Object.entries(normalizedLabels).every(([key, value]) => point.labels[key] === value);
      if (matches) {
        total += point.value;
      }
    }
    return total;
  }

  snapshot() {
    return {
      counters: this.counters,
      histograms: this.histograms
    };
  }

  toPrometheusText(): string {
    const lines: string[] = [];

    for (const [name, def] of this.counters.entries()) {
      lines.push(`# TYPE ${name} counter`);
      for (const point of def.points.values()) {
        lines.push(`${name}${formatLabels(point.labels)} ${point.value}`);
      }
    }

    for (const [name, def] of this.histograms.entries()) {
      lines.push(`# TYPE ${name} histogram`);
      for (const point of def.points.values()) {
        for (const [index, bucket] of def.buckets.entries()) {
          const labels = { ...point.labels, le: String(bucket) };
          lines.push(`${name}_bucket${formatLabels(labels)} ${point.bucketCounts[index] ?? 0}`);
        }
        const infLabels = { ...point.labels, le: "+Inf" };
        lines.push(`${name}_bucket${formatLabels(infLabels)} ${point.count}`);
        lines.push(`${name}_sum${formatLabels(point.labels)} ${point.sum}`);
        lines.push(`${name}_count${formatLabels(point.labels)} ${point.count}`);
      }
    }

    return `${lines.join("\n")}\n`;
  }
}

function getRegistry() {
  const globalWithRegistry = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: MetricsRegistry;
  };
  if (!globalWithRegistry[GLOBAL_KEY]) {
    globalWithRegistry[GLOBAL_KEY] = new MetricsRegistry();
  }
  return globalWithRegistry[GLOBAL_KEY]!;
}

export function incrementCounter(name: string, value = 1, labels?: MetricLabels) {
  getRegistry().incrementCounter(name, value, labels);
}

export function observeHistogram(name: string, value: number, labels?: MetricLabels, buckets?: number[]) {
  getRegistry().observeHistogram(name, value, labels, buckets);
}

export function readCounter(name: string, labels?: MetricLabels): number {
  return getRegistry().readCounter(name, labels);
}

export function snapshotMetrics() {
  return getRegistry().snapshot();
}

export function renderPrometheusMetrics(): string {
  return getRegistry().toPrometheusText();
}
