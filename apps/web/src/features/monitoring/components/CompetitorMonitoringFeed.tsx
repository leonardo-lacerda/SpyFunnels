import { ArrowRight, Flame, Layers3, Megaphone, ReceiptText, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import type { MonitoringEvent } from "../../../types/intelligence";
import { formatSeverity } from "../../../utils/labels";

const iconMap = {
  pricing: ReceiptText,
  offer: Flame,
  funnel: Layers3,
  ads: Megaphone,
  email: Sparkles,
  stack: Sparkles,
};

export function CompetitorMonitoringFeed({ events }: { events: MonitoringEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((event) => {
        const Icon = iconMap[event.type] ?? Layers3;
        return (
          <Card key={event.id} className="border-white/70 bg-white/92 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-strong text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">{event.title}</h3>
                    <Badge variant={event.severity === "critical" || event.severity === "high" ? "destructive" : event.severity === "medium" ? "warning" : "secondary"}>
                      {formatSeverity(event.severity)}
                    </Badge>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">{event.summary}</p>
                  {event.before || event.after ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Antes</p>
                        <p className="mt-2 text-sm text-text-secondary">{event.before ?? "Nenhuma evidência anterior armazenada"}</p>
                      </div>
                      <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Depois</p>
                        <p className="mt-2 text-sm text-text-secondary">{event.after ?? "Mudança ainda em andamento"}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{new Date(event.observedAt).toLocaleString()}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  Inspecionar evidências
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
