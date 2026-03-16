import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">{eyebrow}</p> : null}
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
