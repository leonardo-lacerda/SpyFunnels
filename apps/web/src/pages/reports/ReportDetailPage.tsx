import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useReportQuery } from "../../hooks/use-platform-data";
import { formatReportStatus } from "../../utils/labels";

export function ReportDetailPage() {
  const { reportId } = useParams();
  const { data: report, isLoading } = useReportQuery(reportId);

  if (isLoading || !report) {
    return <LoadingPanel label="Carregando detalhes do relatório..." />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">{report.scope}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-text-primary">{report.title}</h1>
            <p className="mt-3 text-sm leading-7 text-text-secondary">{report.summary}</p>
          </div>
          <Badge variant={report.status === "completed" ? "success" : "warning"}>{formatReportStatus(report.status)}</Badge>
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          {report.sections.map((section) => (
            <Card key={section.id} className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">{section.title}</h2>
              <p className="mt-4 text-sm leading-7 text-text-secondary">{section.body}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {section.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{metric.label}</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">{metric.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Recomendações</p>
          <div className="mt-5 space-y-3">
            {report.recommendations.map((recommendation) => (
              <div key={recommendation} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4 text-sm leading-6 text-text-secondary">
                {recommendation}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
