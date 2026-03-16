import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-border-subtle bg-white/70 px-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-text-muted">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-text-primary">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
