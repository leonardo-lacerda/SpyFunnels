import type { FunnelVersion } from "../../types/intelligence";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { formatConfidence, formatStage } from "../../utils/labels";

export function FunnelTimeline({ funnelVersion }: { funnelVersion: FunnelVersion }) {
  return (
    <div className="space-y-4">
      {funnelVersion.nodes.map((node, index) => (
        <Card key={node.id} className="border-white/70 bg-white/92 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Etapa {index + 1}</Badge>
                <Badge>{formatStage(node.type)}</Badge>
                <Badge variant="outline">{formatConfidence(node.confidence)}</Badge>
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-text-primary">{node.title}</h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{node.description}</p>
            </div>
            <div className="text-right text-xs text-text-muted">
              <p>{node.evidenceCount} itens de evidência</p>
              <p className="mt-1">Dispositivo: {node.device}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
