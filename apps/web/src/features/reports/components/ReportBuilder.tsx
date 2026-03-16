import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { InlineError } from "../../../components/shared/InlineError";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useCompetitorsQuery, useGenerateReportMutation } from "../../../hooks/use-platform-data";

interface ReportBuilderProps {
  onGenerated?: (reportId: string) => void;
}

interface ReportFormState {
  competitorId: string;
  title: string;
  scope: string;
  audience: string;
  primaryQuestion: string;
  periodStart: string;
  periodEnd: string;
}

function isoDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

export function ReportBuilder({ onGenerated }: ReportBuilderProps) {
  const { data: competitors = [] } = useCompetitorsQuery();
  const generateMutation = useGenerateReportMutation();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const defaultCompetitor = competitors[0];
  const [form, setForm] = useState<ReportFormState>({
    competitorId: "",
    title: "Resumo semanal de mudanças no funil",
    scope: "Portfólio",
    audience: "Equipe executiva",
    primaryQuestion: "O que mudou na estratégia de qualificação dos concorrentes?",
    periodStart: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
  });

  const effectiveCompetitorId = form.competitorId || defaultCompetitor?.id || "";
  const selectedCompetitor = useMemo(
    () => competitors.find((competitor) => competitor.id === effectiveCompetitorId),
    [competitors, effectiveCompetitorId]
  );

  async function submit() {
    setError(null);
    setSuccessMessage(null);

    if (!effectiveCompetitorId) {
      setError("Selecione um concorrente antes de gerar um relatório.");
      return;
    }

    try {
      const payload: {
        competitorId: string;
        title: string;
        scope?: string;
        audience?: string;
        primaryQuestion?: string;
        periodStart?: string;
        periodEnd?: string;
      } = {
        competitorId: effectiveCompetitorId,
        title: form.title,
      };
      const scope = form.scope || selectedCompetitor?.domain;
      const periodStart = isoDate(form.periodStart);
      const periodEnd = isoDate(form.periodEnd);

      if (scope) payload.scope = scope;
      if (form.audience) payload.audience = form.audience;
      if (form.primaryQuestion) payload.primaryQuestion = form.primaryQuestion;
      if (periodStart) payload.periodStart = periodStart;
      if (periodEnd) payload.periodEnd = periodEnd;

      const result = await generateMutation.mutateAsync(payload);
      setSuccessMessage("Relatório gerado a partir do artefato da API ao vivo.");
      onGenerated?.(result.reportId);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Falha ao gerar relatório.");
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <InlineError title="Não foi possível gerar o relatório" description={error} /> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Concorrente</span>
        <select
          value={effectiveCompetitorId}
          onChange={(event) => setForm((current) => ({ ...current, competitorId: event.target.value }))}
          className="h-11 rounded-full border border-border-subtle bg-surface-1 px-4 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          {competitors.map((competitor) => (
            <option key={competitor.id} value={competitor.id}>
              {competitor.name}
            </option>
          ))}
        </select>
      </label>
      <Input placeholder="Título do relatório" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
      <Input placeholder="Escopo" value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input placeholder="Início do período" type="date" value={form.periodStart} onChange={(event) => setForm((current) => ({ ...current, periodStart: event.target.value }))} />
        <Input placeholder="Fim do período" type="date" value={form.periodEnd} onChange={(event) => setForm((current) => ({ ...current, periodEnd: event.target.value }))} />
      </div>
      <Input placeholder="Pergunta principal" value={form.primaryQuestion} onChange={(event) => setForm((current) => ({ ...current, primaryQuestion: event.target.value }))} />
      <Input placeholder="Público" value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))} />
      <div className="rounded-[24px] border border-border-subtle bg-surface-2/60 px-4 py-3 text-sm text-text-secondary">
        {selectedCompetitor
          ? `Este briefing será gerado para ${selectedCompetitor.name} (${selectedCompetitor.domain}) usando o endpoint de relatório ao vivo.`
          : "Nenhum concorrente disponível ainda. Adicione um concorrente primeiro."}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => setForm((current) => ({ ...current, title: "Resumo semanal de mudanças no funil", primaryQuestion: "O que mudou na estratégia de qualificação dos concorrentes?" }))}>
          Redefinir
        </Button>
        <Button onClick={submit} isLoading={generateMutation.isPending} disabled={!effectiveCompetitorId}>
          <Sparkles className="mr-2 h-4 w-4" />
          Gerar relatório
        </Button>
      </div>
    </div>
  );
}
