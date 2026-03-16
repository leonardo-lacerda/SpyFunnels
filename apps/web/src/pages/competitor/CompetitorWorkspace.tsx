import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Globe2, Radar, RefreshCw, ScrollText } from "lucide-react";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useCompetitorQuery, useGenerateReportMutation, useRunCompetitorMutation } from "../../hooks/use-platform-data";
import { useUIStore } from "../../store/ui";
import { cn } from "../../utils/cn";
import { formatCompetitorStatus, formatTag } from "../../utils/labels";

const tabs = [
  { label: "Visão geral", to: "overview" },
  { label: "Funis", to: "funnels" },
  { label: "Páginas de destino", to: "pages" },
  { label: "Anúncios", to: "ads" },
  { label: "Emails", to: "emails" },
  { label: "Tecnologias", to: "technologies" },
  { label: "Monitoramento", to: "monitoring" },
];

export function CompetitorWorkspace() {
  const { competitorId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const { data: competitor, isLoading } = useCompetitorQuery(competitorId);
  const setSelectedCompetitorId = useUIStore((state) => state.setSelectedCompetitorId);
  const runMutation = useRunCompetitorMutation();
  const reportMutation = useGenerateReportMutation();

  useEffect(() => {
    if (competitorId) {
      setSelectedCompetitorId(competitorId);
    }
  }, [competitorId, setSelectedCompetitorId]);

  if (isLoading || !competitor) {
    return <LoadingPanel label="Carregando inteligência do concorrente..." />;
  }

  const currentCompetitor = competitor;

  async function handleRefresh() {
    if (!competitorId) return;
    setMessage(null);
    try {
      await runMutation.mutateAsync(competitorId);
      setMessage("Pipeline de monitoramento agendado a partir da API ao vivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao agendar o pipeline de monitoramento.");
    }
  }

  async function handleGenerateReport() {
    if (!competitorId) return;
    setMessage(null);
    try {
      const result = await reportMutation.mutateAsync({
        competitorId,
        title: `${currentCompetitor.name} Briefing Executivo de Inteligência`,
        scope: currentCompetitor.domain,
        audience: "Time de crescimento e executivos",
        primaryQuestion: "O que mudou no funil deste concorrente nesta semana?",
      });
      navigate(`/reports/${result.reportId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatório.");
    }
  }

  return (
    <div className="space-y-8">
      {message ? <Alert variant={message.includes("Falha") ? "destructive" : "success"}>{message}</Alert> : null}
      <section className="rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.93)_42%,rgba(248,245,239,0.34))] p-7 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/10 text-white shadow-[0_14px_36px_rgba(0,0,0,0.18)] backdrop-blur">
              <Globe2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Inteligência do concorrente</p>
                <Badge variant={currentCompetitor.status === "active" ? "success" : currentCompetitor.status === "syncing" ? "warning" : "secondary"}>
                  {formatCompetitorStatus(currentCompetitor.status)}
                </Badge>
              </div>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">{currentCompetitor.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">{currentCompetitor.notes}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {currentCompetitor.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/78 backdrop-blur">
                    {formatTag(tag)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/78 backdrop-blur">
              Última sincronização {new Date(currentCompetitor.lastSyncAt).toLocaleString()}
            </div>
            <Button
              variant="outline"
              className="border-white/15 bg-white/10 text-white hover:bg-white/20"
              onClick={handleRefresh}
              isLoading={runMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Forçar atualização
            </Button>
            <Button className="bg-white text-ink-strong hover:bg-white/90" onClick={handleGenerateReport} isLoading={reportMutation.isPending}>
              <ScrollText className="mr-2 h-4 w-4" />
              Gerar relatório
            </Button>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Nós mapeados</p>
            <p className="mt-2 text-2xl font-semibold">{currentCompetitor.funnelNodeCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Anúncios ativos</p>
            <p className="mt-2 text-2xl font-semibold">{currentCompetitor.activeAds}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Emails capturados</p>
            <p className="mt-2 text-2xl font-semibold">{currentCompetitor.capturedEmails}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Confiança</p>
            <p className="mt-2 text-2xl font-semibold">{currentCompetitor.confidenceScore}%</p>
          </div>
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-[28px] border border-white/70 bg-white/90 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "rounded-2xl px-4 py-3 text-sm font-medium transition whitespace-nowrap",
                isActive ? "bg-ink-strong text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]" : "text-text-secondary hover:bg-surface-2",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
