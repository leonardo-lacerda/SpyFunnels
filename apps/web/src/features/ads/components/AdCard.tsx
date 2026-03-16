import { ArrowUpRight, ImageOff, MousePointerClick, Radar, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import type { AdCreative } from "../../../types/intelligence";
import { formatAdStatus } from "../../../utils/labels";

export function AdCard({ ad }: { ad: AdCreative }) {
  return (
    <Card className="group overflow-hidden border-white/70 bg-white/90 shadow-[0_22px_54px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.14)]">
      <div className="relative aspect-[5/4] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.18),transparent_40%),linear-gradient(135deg,#111827,#1f2937_50%,#334155)] p-5 text-white">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="border-white/10 bg-white/10 text-white capitalize backdrop-blur">
            {ad.platform}
          </Badge>
          <Badge variant={ad.status === "new" ? "warning" : ad.status === "active" ? "success" : "outline"} className="border-white/10 bg-white/10 text-white backdrop-blur">
            {formatAdStatus(ad.status)}
          </Badge>
        </div>
        <div className="mt-12 space-y-3">
          <p className="max-w-[90%] text-xl font-semibold leading-tight tracking-[-0.03em]">{ad.headline}</p>
          <p className="line-clamp-3 max-w-[92%] text-sm leading-6 text-white/70">{ad.body}</p>
        </div>
        <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-xs text-white/75">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {ad.hook}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur">
            <ImageOff className="h-3.5 w-3.5" />
            {ad.format}
          </span>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3 text-xs font-medium text-text-secondary">
          <span className="inline-flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5" /> {ad.cta}</span>
          <span className="inline-flex items-center gap-1.5"><Radar className="h-3.5 w-3.5" /> {ad.spendBand}</span>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Caminho de destino</p>
          <p className="mt-2 text-sm font-medium text-text-primary">{ad.landingPath}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Visto pela primeira vez em {new Date(ad.firstSeenAt).toLocaleDateString()}</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-600">
            Vinculado ao funil
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Card>
  );
}
