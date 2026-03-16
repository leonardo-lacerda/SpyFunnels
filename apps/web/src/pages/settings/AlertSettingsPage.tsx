import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useAlertsQuery } from "../../hooks/use-platform-data";
import { LoadingPanel } from "../../components/shared/LoadingPanel";

export function AlertSettingsPage() {
  const { data: alerts = [], isLoading } = useAlertsQuery();

  if (isLoading) {
    return <LoadingPanel label="Carregando regras de alerta..." />;
  }

  const rules = Array.from(new Map(alerts.map((alert) => [alert.rule, alert.status])).entries());

  return (
    <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">Regras de alerta</h2>
      <p className="mt-2 text-sm text-text-secondary">Gerencie limites para mudanças de preços, ramificações de funil e novos sinais de canal.</p>
      <div className="mt-6 space-y-3">
        {rules.length ? rules.map(([rule, status]) => (
          <div key={rule} className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3">
            <span className="text-sm font-medium text-text-primary">{rule}</span>
            <Badge variant={status === "muted" ? "warning" : "success"}>{status === "muted" ? "Silenciado" : "Ativo"}</Badge>
          </div>
        )) : (
          <div className="rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3 text-sm text-text-secondary">
            Nenhuma regra de alerta encontrada.
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <Button>Salvar regras</Button>
      </div>
    </Card>
  );
}
