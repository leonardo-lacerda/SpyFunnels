import { CheckCheck, ShieldAlert } from "lucide-react";
import type { AlertItem } from "../../../types/intelligence";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { formatSeverity } from "../../../utils/labels";

export function AlertTriagePanel({
  alerts,
  onReviewTopThree,
  isReviewing,
}: {
  alerts: AlertItem[];
  onReviewTopThree?: () => void;
  isReviewing?: boolean;
}) {
  return (
    <Card className="border-white/70 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Painel de triagem</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Ações sugeridas na fila</h2>
        </div>
        <Button
          variant="outline"
          {...(onReviewTopThree ? { onClick: onReviewTopThree } : {})}
          {...(typeof isReviewing === "boolean" ? { isLoading: isReviewing } : {})}
          disabled={!alerts.length}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Revisar top 3
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {alerts.slice(0, 3).map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-ink-strong text-white">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{alert.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">{alert.rule}</p>
                </div>
              </div>
              <Badge variant={alert.severity === "critical" || alert.severity === "high" ? "destructive" : "warning"}>{formatSeverity(alert.severity)}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
