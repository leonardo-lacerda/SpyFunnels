import { Link, useParams } from "react-router-dom";
import { ArrowRight, Flame, Layers3, Mail, Radar, ScanSearch } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useAdsQuery, useCompetitorQuery, useEmailsQuery, useFunnelVersionsQuery, useMonitoringEventsQuery } from "../../hooks/use-platform-data";
import { formatConfidence, formatSeverity } from "../../utils/labels";

export function CompetitorOverviewPage() {
  const { competitorId } = useParams();
  const { data: competitor, isLoading } = useCompetitorQuery(competitorId);
  const { data: funnels = [] } = useFunnelVersionsQuery(competitorId);
  const { data: ads = [] } = useAdsQuery(competitorId);
  const { data: emails = [] } = useEmailsQuery(competitorId);
  const { data: events = [] } = useMonitoringEventsQuery(competitorId);

  if (isLoading || !competitor) {
    return <LoadingPanel label="Carregando visão geral do concorrente..." />;
  }

  const primaryFunnel = funnels[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <div className="space-y-6">
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Tese atual</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Resumo estratégico</h2>
            </div>
            <Badge>{competitor.category}</Badge>
          </div>
          <p className="mt-5 text-sm leading-7 text-text-secondary">{competitor.notes}</p>
          {primaryFunnel ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Gancho principal</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{primaryFunnel.primaryHook}</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Ponto de conversão</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{primaryFunnel.conversionPoint}</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Confiança</p>
                <p className="mt-2 text-sm font-semibold capitalize text-text-primary">{formatConfidence(primaryFunnel.confidence)}</p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Atividade recente</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">O que mudou mais recentemente</h2>
            </div>
            <Link to="../monitoring" className="text-sm font-semibold text-brand-600">Abrir feed</Link>
          </div>
          <div className="mt-5 space-y-3">
            {events.slice(0, 3).map((event) => (
              <div key={event.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{event.title}</p>
                  <Badge variant={event.severity === "high" || event.severity === "critical" ? "destructive" : "warning"}>{formatSeverity(event.severity)}</Badge>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{event.summary}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Cobertura</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Ativos observados</h2>
          <div className="mt-6 space-y-3">
            {[
              { label: "Funis", value: funnels.length, icon: Layers3 },
              { label: "Anúncios", value: ads.length, icon: Radar },
              { label: "Emails", value: emails.length, icon: Mail },
              { label: "Sinais", value: events.length, icon: ScanSearch },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3">
                  <span className="inline-flex items-center gap-3 text-sm font-medium text-text-primary"><Icon className="h-4 w-4 text-brand-500" /> {row.label}</span>
                  <span className="text-sm font-semibold text-brand-600">{row.value}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.84))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Próxima leitura recomendada</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Superfície mais acionável</h2>
          <p className="mt-4 text-sm leading-7 text-text-secondary">O sinal mais recente indica uma ramificação de qualificação mais forte no meio do funil. Revise o mapa do funil e o texto de suporte da landing page antes de analisar mudanças de preços a jusante.</p>
          <Link to="../funnels" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
            Abrir mapa do funil
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="mt-5 rounded-2xl border border-border-subtle bg-white/80 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary"><Flame className="h-4 w-4 text-amber-600" /> Nota estratégica</p>
            <p className="mt-2 text-sm leading-7 text-text-secondary">Espere mais testes de segmentação por número de licenças ou complexidade de migração. A estrutura atual sugere que o roteamento por intenção está ficando mais explícito.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
