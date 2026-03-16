import { Link } from "react-router-dom";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { LoadingPanel } from "../components/shared/LoadingPanel";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useReportsQuery } from "../hooks/use-platform-data";
import { formatReportStatus } from "../utils/labels";

export function Reports() {
  const { data: reports = [], isLoading } = useReportsQuery();

  if (isLoading) {
    return <LoadingPanel label="Carregando relatórios de inteligência..." />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Central de relatórios"
        title="Relatórios de inteligência"
        description="Sumários gerados, briefings executivos e análises profundas de concorrentes. Os relatórios agregam reconstrução de funil, inteligência de anúncios, sinais de ciclo de vida e monitoramento de mudanças em um artefato compartilhável."
        actions={
          <Button asChild>
            <Link to="/reports/new">
              <FilePlus2 className="mr-2 h-4 w-4" />
              Novo relatório
            </Link>
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id} className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">{report.scope}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">{report.title}</h2>
              </div>
              <Badge variant={report.status === "completed" ? "success" : "warning"}>{formatReportStatus(report.status)}</Badge>
            </div>
            <p className="mt-4 text-sm leading-7 text-text-secondary">{report.summary}</p>
            <div className="mt-5 space-y-2">
              {report.recommendations.slice(0, 2).map((recommendation) => (
                <div key={recommendation} className="rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3 text-sm text-text-secondary">
                  {recommendation}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-text-muted">Gerado {new Date(report.generatedAt).toLocaleString()}</span>
              <Link to={`/reports/${report.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
                Abrir relatório
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
