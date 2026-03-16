import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/shared/EmptyState";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useLandingPagesQuery } from "../../hooks/use-platform-data";
import { formatPageStatus, formatStage } from "../../utils/labels";

export function CompetitorPagesPage() {
  const { competitorId } = useParams();
  const { data: pages = [], isLoading } = useLandingPagesQuery(competitorId);

  if (isLoading) {
    return <LoadingPanel label="Carregando páginas de destino..." />;
  }

  if (!pages.length) {
    return <EmptyState title="Nenhuma landing page capturada" description="O crawler ainda não identificou landing pages públicas ou iscas digitais para este concorrente." />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {pages.map((page) => (
        <Card key={page.id} className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">{formatStage(page.stage)}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">{page.title}</h2>
            </div>
            <Badge variant={page.status === "active" ? "success" : page.status === "testing" ? "warning" : "secondary"}>{formatPageStatus(page.status)}</Badge>
          </div>
          <div className="mt-5 rounded-[24px] border border-border-subtle bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,245,239,0.82))] p-5">
            <p className="text-sm font-semibold text-text-primary">{page.headline}</p>
            <p className="mt-3 text-sm text-text-secondary">CTA: {page.cta}</p>
            <p className="mt-4 text-xs text-text-muted">Observado em {new Date(page.observedAt).toLocaleString()}</p>
          </div>
          <div className="mt-5 rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Nota de mudança</p>
            <p className="mt-2 text-sm text-text-secondary">{page.changeSummary}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
