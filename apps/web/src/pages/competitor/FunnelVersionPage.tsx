import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { FunnelViewer } from "../../features/funnels/components/FunnelViewer";
import { useFunnelVersionQuery } from "../../hooks/use-platform-data";
import { formatConfidence } from "../../utils/labels";

export function FunnelVersionPage() {
  const { funnelVersionId } = useParams();
  const { data: funnelVersion, isLoading } = useFunnelVersionQuery(funnelVersionId);

  if (isLoading || !funnelVersion) {
    return <LoadingPanel label="Carregando detalhes da versão do funil..." />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Detalhe da versão</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">{funnelVersion.name}</h2>
            <p className="mt-2 text-sm leading-7 text-text-secondary">Observado em {new Date(funnelVersion.observedAt).toLocaleString()}</p>
          </div>
          <Badge>{formatConfidence(funnelVersion.confidence)} confiança</Badge>
        </div>
        <div className="mt-6">
          <FunnelViewer funnelVersion={funnelVersion} />
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Evidências do nó</p>
          <div className="mt-5 space-y-3">
            {funnelVersion.nodes.map((node) => (
              <div key={node.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{node.title}</p>
                  <Badge variant="secondary">{formatConfidence(node.confidence)}</Badge>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{node.description}</p>
                {node.priceValue != null ? (
                  <p className="mt-2 text-xs font-medium text-text-secondary">Preço {node.currency ?? ""} {node.priceValue}</p>
                ) : null}
                <p className="mt-3 text-xs text-text-muted">{node.evidenceCount} evidências</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Confiança da transição</p>
          <div className="mt-5 space-y-3">
            {funnelVersion.edges.map((edge) => (
              <div key={edge.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
                <p className="text-sm font-semibold text-text-primary">{edge.label}</p>
                <p className="mt-2 text-sm text-text-secondary">{edge.source} para {edge.target}</p>
                <p className="mt-3 text-xs capitalize text-text-muted">Confiança {formatConfidence(edge.confidence)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
