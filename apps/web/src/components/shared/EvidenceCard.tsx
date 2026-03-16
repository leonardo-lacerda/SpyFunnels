import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";
import { Card } from "../ui/Card";

export function EvidenceCard({ title, description, meta, children }: { title: string; description: string; meta: string[]; children?: ReactNode }) {
  return (
    <Card className="border-white/70 bg-white/92 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-strong text-white">
          <FileSearch className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
            {meta.map((item) => (
              <span key={item} className="rounded-full bg-surface-2 px-3 py-1">{item}</span>
            ))}
          </div>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </Card>
  );
}
