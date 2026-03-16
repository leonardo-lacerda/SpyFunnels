import type { IntelligenceReport } from "../../../types/intelligence";
import { Card } from "../../../components/ui/Card";

export function ReportPreview({ report }: { report: IntelligenceReport }) {
  return (
    <Card className="border-white/70 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Prévia</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">{report.title}</h2>
      <p className="mt-4 text-sm leading-7 text-text-secondary">{report.summary}</p>
      <div className="mt-5 space-y-3">
        {report.recommendations.map((recommendation) => (
          <div key={recommendation} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4 text-sm text-text-secondary">
            {recommendation}
          </div>
        ))}
      </div>
    </Card>
  );
}
