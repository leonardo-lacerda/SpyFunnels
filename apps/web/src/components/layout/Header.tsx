import { Bell, CalendarDays, Command, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useUIStore } from "../../store/ui";

export function Header() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const globalSearch = useUIStore((state) => state.globalSearch);
  const setGlobalSearch = useUIStore((state) => state.setGlobalSearch);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const routeLabels: Record<string, string> = {
    dashboard: "Painel",
    competitors: "Concorrentes",
    overview: "Visão geral",
    funnels: "Funis",
    pages: "Páginas",
    ads: "Anúncios",
    emails: "Emails",
    technologies: "Tecnologias",
    monitoring: "Monitoramento",
    alerts: "Alertas",
    reports: "Relatórios",
    settings: "Configurações",
    profile: "Perfil",
    workspace: "Espaço de trabalho",
    integrations: "Integrações",
    team: "Equipe",
    new: "Novo",
  };
  const formattedRoute = location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => routeLabels[segment] ?? segment)
    .join(" / ");

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-[rgba(248,245,239,0.78)] px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Rota do espaço de trabalho</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-text-primary">{formattedRoute || "Painel"}</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block min-w-[280px] flex-1 sm:w-[340px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Buscar concorrente, gancho, oferta ou alerta"
              className="h-11 w-full rounded-full border border-white/70 bg-white/92 pl-11 pr-4 text-sm text-text-primary shadow-[0_10px_30px_rgba(15,23,42,0.06)] outline-none transition focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20"
            />
          </label>
          <div className="flex items-center gap-3">
            <button className="inline-flex h-11 items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 text-sm font-medium text-text-secondary shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:text-text-primary">
              <CalendarDays className="h-4 w-4" />
              Últimos 7 dias
            </button>
            <button className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-text-secondary shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:text-text-primary">
              <Bell className="h-4 w-4" />
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="hidden items-center gap-3 rounded-full border border-white/70 bg-white/90 px-4 py-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] lg:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-strong text-xs font-semibold text-white">
                {(user?.email ?? "A").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{user?.email ?? "Não autenticado"}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Estrategista</p>
              </div>
            </div>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden h-11 items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 text-sm font-medium text-text-secondary shadow-[0_10px_30px_rgba(15,23,42,0.06)] xl:inline-flex"
            >
              <Command className="h-4 w-4" />
              Menu de comandos
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
