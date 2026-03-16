import { useState } from "react";
import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { InlineError } from "../components/shared/InlineError";
import { PageHeader } from "../components/shared/PageHeader";
import { LoadingPanel } from "../components/shared/LoadingPanel";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { VirtualList } from "../components/shared/VirtualList";
import { useAlertsQuery, useCompetitorsQuery, useUpdateAlertStatusMutation } from "../hooks/use-platform-data";
import { AlertTriagePanel } from "../features/monitoring/components/AlertTriagePanel";
import { formatAlertStatus, formatSeverity } from "../utils/labels";

export function Alerts() {
  const [error, setError] = useState<string | null>(null);
  const { data: alerts = [], isLoading } = useAlertsQuery();
  const { data: competitors = [] } = useCompetitorsQuery();
  const updateAlertStatus = useUpdateAlertStatusMutation();

  if (isLoading) {
    return <LoadingPanel label="Carregando central de alertas..." />;
  }

  const byCompetitor = new Map(competitors.map((competitor) => [competitor.id, competitor]));
  const openAlerts = alerts.filter((alert) => alert.status === "open");

  async function reviewTopThree() {
    setError(null);
    try {
      await Promise.all(
        openAlerts.slice(0, 3).map((alert) =>
          updateAlertStatus.mutateAsync({ alertId: alert.id, status: "reviewed" })
        )
      );
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Falha ao revisar alertas.");
    }
  }

  return (
    <div className="space-y-8">
      {error ? <InlineError title="Falha ao atualizar alertas" description={error} /> : null}
      <PageHeader
        eyebrow="Fila do analista"
        title="Alertas"
        description="Alertas baseados em regras e inferência priorizados para revisão do analista. Cada alerta aponta para o concorrente, artefato e regra de monitoramento que o gerou."
        actions={
          <>
            <Button variant="outline" onClick={reviewTopThree} isLoading={updateAlertStatus.isPending} disabled={!openAlerts.length}>Marcar como revisado</Button>
            <Button>Configurar regras</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-white/70 bg-white/92 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <VirtualList
            items={alerts}
            estimateSize={170}
            className="h-[720px] overflow-y-auto"
            renderItem={(alert) => (
              <div className="px-2 py-2">
                <Card key={alert.id} className="border-white/70 bg-white/92 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-strong text-white">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">{alert.title}</h2>
                          <Badge variant={alert.severity === "critical" || alert.severity === "high" ? "destructive" : "warning"}>{formatSeverity(alert.severity)}</Badge>
                          <Badge variant="secondary">{formatAlertStatus(alert.status)}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-text-secondary">{alert.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
                          <span>Concorrente: {byCompetitor.get(alert.competitorId)?.name ?? alert.competitorId}</span>
                          <span>Regra: {alert.rule}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Clock3 className="h-4 w-4" />
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          />
        </div>
        <div className="space-y-6">
          <AlertTriagePanel alerts={alerts} onReviewTopThree={reviewTopThree} isReviewing={updateAlertStatus.isPending} />
          <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(30,41,59,0.95))] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Orientações de operações</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Revise primeiro as ramificações críticas do funil</h2>
            <p className="mt-4 text-sm leading-7 text-white/72">A fila atual é dominada por mudanças estruturais no funil, que costumam gerar os insights de maior alavancagem. Alterações no texto de preços vêm em seguida, após a validação das ramificações do funil.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/85">
              <CheckCircle2 className="h-4 w-4" />
              Checklist do analista pronto
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
