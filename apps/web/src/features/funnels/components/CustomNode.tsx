import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Flame,
  Globe,
  Mail,
  MousePointerClick,
  Presentation,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import type { FunnelStageType } from "../../../types/intelligence";
import { formatStage } from "../../../utils/labels";

const nodeStyles: Record<FunnelStageType, { icon: typeof Globe; accent: string; chip: string }> = {
  ad: { icon: MousePointerClick, accent: "from-sky-500/15 to-sky-500/5", chip: "text-sky-700" },
  landing: { icon: Globe, accent: "from-emerald-500/15 to-emerald-500/5", chip: "text-emerald-700" },
  "lead-magnet": { icon: Sparkles, accent: "from-amber-500/15 to-amber-500/5", chip: "text-amber-700" },
  email: { icon: Mail, accent: "from-indigo-500/15 to-indigo-500/5", chip: "text-indigo-700" },
  webinar: { icon: Presentation, accent: "from-fuchsia-500/15 to-fuchsia-500/5", chip: "text-fuchsia-700" },
  offer: { icon: Flame, accent: "from-orange-500/15 to-orange-500/5", chip: "text-orange-700" },
  checkout: { icon: ShoppingCart, accent: "from-rose-500/15 to-rose-500/5", chip: "text-rose-700" },
  upsell: { icon: BadgeDollarSign, accent: "from-violet-500/15 to-violet-500/5", chip: "text-violet-700" },
  "thank-you": { icon: CheckCircle2, accent: "from-teal-500/15 to-teal-500/5", chip: "text-teal-700" },
};

export function CustomNode({ data, selected }: NodeProps) {
  const { label, type, confidence, metric, meta } = data as {
    label: string;
    type: FunnelStageType;
    confidence: "high" | "medium" | "low";
    metric?: string;
    meta?: string;
  };

  const config = nodeStyles[type] ?? nodeStyles.landing;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative min-w-[220px] rounded-[24px] border border-white/70 bg-white/92 p-4 shadow-[0_22px_50px_rgba(15,23,42,0.12)] backdrop-blur transition-all duration-200",
        selected ? "-translate-y-0.5 ring-2 ring-brand-500/40" : "hover:-translate-y-0.5",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500" />
      <div className={cn("absolute inset-x-0 top-0 h-20 rounded-t-[24px] bg-gradient-to-r", config.accent)} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-strong text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.2em]", config.chip)}>{formatStage(type)}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-text-primary">{label}</p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex h-2.5 w-2.5 rounded-full",
              confidence === "high" ? "bg-emerald-500" : confidence === "medium" ? "bg-amber-500" : "bg-rose-500",
            )}
          />
        </div>
        <div className="mt-4 space-y-2">
          {metric ? <p className="text-xs font-medium text-text-secondary">{metric}</p> : null}
          {meta ? <p className="text-xs text-text-muted">{meta}</p> : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500" />
    </div>
  );
}
