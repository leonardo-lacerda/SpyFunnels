import { NavLink, Outlet } from "react-router-dom";
import { cn } from "../utils/cn";

const settingsTabs = [
  { label: "Perfil", to: "/settings/profile" },
  { label: "Espaço de trabalho", to: "/settings/workspace" },
  { label: "Alertas", to: "/settings/alerts" },
  { label: "Integrações", to: "/settings/integrations" },
  { label: "Equipe", to: "/settings/team" },
];

export function Settings() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-500">Administração</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-text-primary">Configurações</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">Controle padrões do espaço de trabalho, alertas, integrações e políticas de acesso da plataforma de inteligência.</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto rounded-[28px] border border-white/70 bg-white/90 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        {settingsTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "rounded-2xl px-4 py-3 text-sm font-medium whitespace-nowrap transition",
                isActive ? "bg-ink-strong text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]" : "text-text-secondary hover:bg-surface-2",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
