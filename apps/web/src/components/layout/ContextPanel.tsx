import { FileSearch, X } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { useUIStore } from "../../store/ui";

export function ContextPanel() {
  const contextPanel = useUIStore((state) => state.contextPanel);
  const closeContextPanel = useUIStore((state) => state.closeContextPanel);

  return (
    <Drawer open={contextPanel.open} onClose={closeContextPanel} title={contextPanel.title || "Evidências"}>
      <div className="space-y-4">
        <div className="rounded-[24px] border border-border-subtle bg-white/90 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-strong text-white">
              <FileSearch className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Resumo das evidências</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{contextPanel.description}</p>
            </div>
          </div>
        </div>
        {contextPanel.meta.map((item) => (
          <div key={item} className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3 text-sm text-text-secondary">
            <span>{item}</span>
            <X className="h-3.5 w-3.5 opacity-0" />
          </div>
        ))}
      </div>
    </Drawer>
  );
}
