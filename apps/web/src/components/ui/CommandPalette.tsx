import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BriefcaseBusiness, Compass, FileText, Radar, Search } from "lucide-react";
import { Drawer } from "./Drawer";
import { useUIStore } from "../../store/ui";

const commandItems = [
  { label: "Ir para o painel", to: "/dashboard", icon: Compass },
  { label: "Abrir concorrentes", to: "/competitors", icon: BriefcaseBusiness },
  { label: "Abrir monitoramento", to: "/monitoring", icon: Radar },
  { label: "Abrir alertas", to: "/alerts", icon: Bell },
  { label: "Abrir relatórios", to: "/reports", icon: FileText },
];

export function CommandPalette() {
  const open = useUIStore((state) => state.commandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const filtered = useMemo(() => {
    return commandItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="Paleta de comandos">
      <div className="space-y-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            autoFocus={open}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar navegação e ações"
            className="h-12 w-full rounded-2xl border border-border-subtle bg-white pl-11 pr-4 text-sm text-text-primary outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
          />
        </label>
        <div className="space-y-2">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-2xl border border-border-subtle bg-white/80 px-4 py-3 transition hover:bg-surface-2"
              >
                <span className="flex items-center gap-3 text-sm font-medium text-text-primary">
                  <Icon className="h-4 w-4 text-brand-500" />
                  {item.label}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-text-muted">Abrir</span>
              </Link>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}
