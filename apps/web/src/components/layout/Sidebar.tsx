import { NavLink, useLocation } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  ChartColumnBig,
  Compass,
  FileText,
  Radar,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useCompetitorsQuery, useDashboardQuery } from "../../hooks/use-platform-data";
import { useUIStore } from "../../store/ui";
import { cn } from "../../utils/cn";

const primaryNavigation = [
  { label: "Painel", to: "/dashboard", icon: Compass },
  { label: "Concorrentes", to: "/competitors", icon: BriefcaseBusiness },
  { label: "Monitoramento", to: "/monitoring", icon: Radar },
  { label: "Alertas", to: "/alerts", icon: Bell },
  { label: "Relatórios", to: "/reports", icon: FileText },
  { label: "Configurações", to: "/settings/profile", icon: Settings2 },
];

export function Sidebar() {
  const location = useLocation();
  const { data: competitors = [] } = useCompetitorsQuery();
  const { data: dashboard } = useDashboardQuery();
  const selectedCompetitorId = useUIStore((state) => state.selectedCompetitorId);
  const setSelectedCompetitorId = useUIStore((state) => state.setSelectedCompetitorId);
  const criticalAlerts = dashboard?.priorityAlerts.filter((alert) => alert.severity === "critical").length ?? 0;
  const openAlerts = dashboard?.priorityAlerts.filter((alert) => alert.status === "open").length ?? 0;

  return (
    <aside className="hidden w-[304px] shrink-0 border-r border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,245,239,0.92))] px-6 py-6 shadow-[inset_-1px_0_0_rgba(255,255,255,0.4)] xl:flex xl:flex-col">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-ink-strong text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
          <ChartColumnBig className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">Inteligência competitiva</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">Atlas de Funis</h2>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        {primaryNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-ink-strong text-white shadow-[0_18px_34px_rgba(15,23,42,0.20)]"
                    : "text-text-secondary hover:bg-white/80 hover:text-text-primary",
                )
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {location.pathname.startsWith(item.to) ? <Sparkles className="h-4 w-4 opacity-80" /> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">Monitorados agora</p>
          <span className="text-xs font-medium text-text-muted">{competitors.length} ativos</span>
        </div>
        <div className="space-y-2">
          {competitors.slice(0, 4).map((competitor) => (
            <NavLink
              key={competitor.id}
              to={`/competitors/${competitor.id}/overview`}
              onClick={() => setSelectedCompetitorId(competitor.id)}
              className={cn(
                "block rounded-2xl border border-transparent bg-white/55 px-4 py-3 transition hover:border-border-subtle hover:bg-white/90",
                selectedCompetitorId === competitor.id && location.pathname.includes(competitor.id)
                  ? "border-border-subtle bg-white shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
                  : "",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{competitor.name}</p>
                  <p className="mt-1 text-xs text-text-muted">{competitor.domain}</p>
                </div>
                <span className="rounded-full bg-surface-2 px-2 py-1 text-[11px] font-semibold text-text-secondary">
                  {competitor.alertCount} alertas
                </span>
              </div>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="mt-auto rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.95))] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Pulso do espaço de trabalho</p>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">{dashboard?.workspace.name ?? "Espaço de trabalho"}</h3>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {criticalAlerts > 0
            ? `${criticalAlerts} alertas críticos e ${openAlerts} alertas em aberto exigem revisão do analista.`
            : "Nenhum alerta crítico na janela de monitoramento atual."}
        </p>
      </div>
    </aside>
  );
}
