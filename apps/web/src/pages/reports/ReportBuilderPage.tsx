import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { ReportBuilder } from "../../features/reports/components/ReportBuilder";
import { ReportPreview } from "../../features/reports/components/ReportPreview";
import { useReportsQuery } from "../../hooks/use-platform-data";

export function ReportBuilderPage() {
  const navigate = useNavigate();
  const { data: reports = [] } = useReportsQuery();
  const preview = reports[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-500">Construtor de relatórios</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-text-primary">Criar novo briefing de inteligência</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">Monte um relatório estratégico selecionando escopo, intervalo de datas e ênfase narrativa. O artefato resultante pode ser reutilizado em revisões de stakeholders ou entregáveis de agência.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <ReportBuilder onGenerated={(reportId) => navigate(`/reports/${reportId}`)} />
        </Card>
        {preview ? <ReportPreview report={preview} /> : null}
      </div>
    </div>
  );
}
