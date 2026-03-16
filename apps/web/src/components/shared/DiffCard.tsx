import { ArrowRightLeft } from "lucide-react";
import { Card } from "../ui/Card";

export function DiffCard({ title, before, after }: { title: string; before: string; after: string }) {
  return (
    <Card className="border-white/70 bg-white/92 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-strong text-white">
          <ArrowRightLeft className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Diferença antes / depois</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Antes</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{before}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Depois</p>
          <p className="mt-2 text-sm leading-6 text-emerald-950/80">{after}</p>
        </div>
      </div>
    </Card>
  );
}
