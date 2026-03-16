import { ArrowRight, Bell, Boxes, Flame, PlusCircle, Radar, ScrollText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ActivityChart } from "../components/visualizations/ActivityChart";
import { MetricCard } from "../components/shared/MetricCard";
import { PageHeader } from "../components/shared/PageHeader";
import { LoadingPanel } from "../components/shared/LoadingPanel";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useDashboardQuery } from "../hooks/use-platform-data";
import { formatCadence, formatSeverity } from "../utils/labels";

const kpiIcons = [Radar, Boxes, Bell, ScrollText];

export function Dashboard() {
  const { data, isLoading } = useDashboardQuery();

  if (isLoading || !data) {
    return <LoadingPanel label="Carregando inteligência do painel..." />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sala de controle estratégica"
        title="Inteligência de Funis Competitivos"
        description="Uma superfície operacional diária para mudanças de alto sinal na estrutura do funil, narrativa de preços, ganchos de anúncios e mensagens de ciclo de vida. Cada insight abaixo está ligado a evidências e ao estado do monitoramento."
        actions={
          <>
            <Button variant="outline" asChild><Link to="/reports">Exportar resumo</Link></Button>
            <Button asChild><Link to="/reports/new">Gerar briefing executivo</Link></Button>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-4">
        {data.kpis.map((kpi, index) => {
          const Icon = kpiIcons[index] ?? Radar;
          return (
            <MetricCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta}
              context={kpi.context}
              trend={kpi.trend}
              icon={<Icon className="h-5 w-5" />}
            />
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Checklist de integração</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Primeiro valor em menos de 15 minutos</h2>
          <div className="mt-6 space-y-3">
            {[
              "Adicionar o primeiro concorrente monitorado",
              "Rodar o primeiro pipeline de monitoramento",
              "Revisar um alerta de alta prioridade",
              "Gerar o primeiro relatório de inteligência",
            ].map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3">
                <span className="text-sm font-medium text-text-primary">{item}</span>
                <Badge variant={index === 0 ? "warning" : "secondary"}>{index === 0 ? "próximo" : "pendente"}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(30,41,59,0.95))] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Ações rápidas</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Do sinal à ação</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link to="/competitors/new" className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15">
              <PlusCircle className="h-5 w-5" />
              <p className="mt-3 text-sm font-semibold">Adicionar alvo</p>
            </Link>
            <Link to="/monitoring" className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15">
              <Radar className="h-5 w-5" />
              <p className="mt-3 text-sm font-semibold">Abrir monitoramento</p>
            </Link>
            <Link to="/alerts" className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15">
              <Bell className="h-5 w-5" />
              <p className="mt-3 text-sm font-semibold">Revisar alertas</p>
            </Link>
            <Link to="/reports/new" className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15">
              <Sparkles className="h-5 w-5" />
              <p className="mt-3 text-sm font-semibold">Gerar briefing</p>
            </Link>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Velocidade de sinais</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Índice de atividade do mercado</h2>
              <p className="mt-1 text-sm text-text-secondary">Rastreamento diário e saída de monitoramento entre concorrentes monitorados e superfícies prioritárias.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-2/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {formatCadence(data.workspace.monitoringCadence)}
            </div>
          </div>
          <div className="mt-6">
            <ActivityChart data={data.marketActivity} />
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Concentração de alertas</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Onde o mercado se moveu</h2>
            <div className="mt-6 space-y-3">
              {data.alertBursts.map((burst) => (
                <div key={burst.label} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-primary">{burst.label}</span>
                    <span className="text-sm font-semibold text-brand-600">{burst.value}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-700" style={{ width: `${Math.min(100, burst.value * 10)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(30,41,59,0.95))] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Síntese por IA</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">O que importa nesta semana</h2>
            <p className="mt-4 text-sm leading-7 text-white/72">
              Camadas de qualificação estão aparecendo mais cedo no funil. Concorrentes focados em migração estão introduzindo ativos com acesso controlado ou ramificações de suporte à venda antes do checkout, enquanto marcas enterprise estão subindo a prova de ROI nas páginas de solução.
            </p>
            <Link to="/reports/new" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Abrir construtor de relatórios
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Fila prioritária</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Alertas estratégicos em aberto</h2>
            </div>
            <Link to="/alerts" className="text-sm font-semibold text-brand-600">Ver todos</Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.priorityAlerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{alert.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{alert.description}</p>
                  </div>
                  <Badge variant={alert.severity === "critical" || alert.severity === "high" ? "destructive" : "warning"}>{formatSeverity(alert.severity)}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                  <span>{alert.rule}</span>
                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Lista de acompanhamento de concorrentes</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Alvos mais ativos</h2>
            </div>
            <Link to="/competitors" className="text-sm font-semibold text-brand-600">Portfólio</Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.competitors.map((competitor) => (
              <Link key={competitor.id} to={`/competitors/${competitor.id}/overview`} className="block rounded-2xl border border-border-subtle bg-surface-2/60 p-4 transition hover:bg-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{competitor.name}</p>
                    <p className="mt-1 text-sm text-text-secondary">{competitor.notes}</p>
                  </div>
                  <div className="text-right text-xs text-text-muted">
                    <p>{competitor.activeAds} anúncios ativos</p>
                    <p>{competitor.capturedEmails} emails</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
