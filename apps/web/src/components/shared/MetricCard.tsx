import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  context: string;
  icon: ReactNode;
  trend?: "up" | "down";
  className?: string;
}

export function MetricCard({ label, value, delta, context, icon, trend = "up", className }: MetricCardProps) {
  return (
    <Card className={cn("group overflow-hidden border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
          <div>
            <p className="text-3xl font-semibold tracking-[-0.04em] text-text-primary">{value}</p>
            <p className={cn("mt-2 text-xs font-semibold", trend === "up" ? "text-emerald-600" : "text-amber-700")}>{delta}</p>
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-strong text-white shadow-[0_16px_30px_rgba(15,23,42,0.2)]">
          {icon}
        </div>
      </div>
      <p className="mt-6 text-sm leading-6 text-text-secondary">{context}</p>
    </Card>
  );
}
