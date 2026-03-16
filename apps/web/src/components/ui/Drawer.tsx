import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className={cn("fixed inset-0 z-40 transition", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div className={cn("absolute inset-0 bg-slate-950/20 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-[420px] border-l border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.94))] p-6 shadow-[-24px_0_60px_rgba(15,23,42,0.12)] transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">{title}</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-secondary shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 h-[calc(100%-64px)] overflow-y-auto pr-1">{children}</div>
      </aside>
    </div>
  );
}
