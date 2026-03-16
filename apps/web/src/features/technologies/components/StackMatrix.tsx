import { Boxes, Radar, Server, Sparkles, Workflow } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import type { TechnologyDetection } from "../../../types/intelligence";
import { formatConfidence, formatTechCategory, formatTechStatus } from "../../../utils/labels";

const iconMap = {
  analytics: Radar,
  marketing: Sparkles,
  commerce: Boxes,
  infrastructure: Server,
  automation: Workflow,
};

export function StackMatrix({ technologies }: { technologies: TechnologyDetection[] }) {
  const grouped = Object.entries(
    technologies.reduce<Record<string, TechnologyDetection[]>>((accumulator, item) => {
      const bucket = accumulator[item.category] ?? [];
      bucket.push(item);
      accumulator[item.category] = bucket;
      return accumulator;
    }, {}),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">Detecções de tecnologia</h2>
        <p className="mt-1 text-sm text-text-secondary">Evidências de fingerprinting em superfícies de analytics, automação e infraestrutura.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {grouped.map(([category, items]) => {
          const Icon = iconMap[category as keyof typeof iconMap] ?? Boxes;
          return (
            <Card key={category} className="border-white/70 bg-white/92 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-strong text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{formatTechCategory(category)}</p>
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">{items.length} detecções</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {items.map((tech) => (
                  <div key={tech.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{tech.name}</p>
                        <p className="mt-1 text-xs text-text-secondary">{tech.evidence}</p>
                      </div>
                    <Badge variant={tech.status === "new" ? "warning" : tech.status === "removed" ? "destructive" : "secondary"}>
                      {formatTechStatus(tech.status)}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
                      <span>Visto pela primeira vez {new Date(tech.firstSeenAt).toLocaleDateString()}</span>
                      <span>Visto pela última vez {new Date(tech.lastSeenAt).toLocaleDateString()}</span>
                      <span>Confiança {formatConfidence(tech.confidence)}</span>
                  </div>
                </div>
              ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
