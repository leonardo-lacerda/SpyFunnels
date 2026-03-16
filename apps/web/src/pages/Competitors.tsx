import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe2, Plus, Radar, Search } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { LoadingPanel } from "../components/shared/LoadingPanel";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal, ModalClose, ModalContent, ModalDescription, ModalHeader, ModalTitle, ModalTrigger } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { useCompetitorsQuery } from "../hooks/use-platform-data";
import { useUIStore } from "../store/ui";
import { CompetitorOnboardingForm } from "../features/competitors/components/CompetitorOnboardingForm";
import { formatCompetitorStatus, formatPriority, formatTag } from "../utils/labels";

export function Competitors() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, isLoading } = useCompetitorsQuery();
  const setSelectedCompetitorId = useUIStore((state) => state.setSelectedCompetitorId);
  const navigate = useNavigate();

  if (isLoading || !data) {
    return <LoadingPanel label="Carregando concorrentes monitorados..." />;
  }

  const filtered = data.filter((competitor) => `${competitor.name} ${competitor.domain} ${competitor.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Portfólio de alvos"
        title="Concorrentes monitorados"
        description="Gerencie empresas, domínios e perfis sociais públicos que alimentam o grafo de inteligência. Este portfólio é a fonte de verdade para cadência de monitoramento, limites de alertas e escopos de relatório."
        actions={
          <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <ModalTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar concorrente
              </Button>
            </ModalTrigger>
            <ModalContent className="rounded-[28px] border-white/70 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
              <ModalHeader>
                <ModalTitle>Adicionar alvo monitorado</ModalTitle>
                <ModalDescription>Registre um domínio e seus pontos de entrada sociais públicos para iniciar o rastreio, a simulação e o pipeline de monitoramento.</ModalDescription>
              </ModalHeader>
              <CompetitorOnboardingForm
                onSuccess={(competitorId) => {
                  setIsCreateOpen(false);
                  setSelectedCompetitorId(competitorId);
                  navigate(`/competitors/${competitorId}/overview`);
                }}
              />
              <ModalClose asChild>
                <span className="hidden" />
              </ModalClose>
            </ModalContent>
          </Modal>
        }
      />

      <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Filtrar por nome, domínio ou tag"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full lg:w-[360px]"
          />
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span>{filtered.length} ativos</span>
            <Button variant="outline" asChild>
              <Link to="/competitors/new">Abrir página de integração</Link>
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {filtered.map((competitor) => (
            <Link
              key={competitor.id}
              to={`/competitors/${competitor.id}/overview`}
              onClick={() => setSelectedCompetitorId(competitor.id)}
              className="group rounded-[28px] border border-border-subtle bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.82))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(15,23,42,0.12)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-strong text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-[-0.03em] text-text-primary">{competitor.name}</h2>
                      <Badge variant={competitor.status === "active" ? "success" : competitor.status === "syncing" ? "warning" : "secondary"}>
                        {formatCompetitorStatus(competitor.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">{competitor.domain}</p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{competitor.notes}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-2 px-3 py-2 text-right text-xs font-semibold text-text-secondary">
                  <p>{competitor.region}</p>
                  <p className="mt-1 text-brand-600">{formatPriority(competitor.priority)}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-border-subtle bg-white/75 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Funis</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{competitor.funnelNodeCount}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-white/75 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Anúncios</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{competitor.activeAds}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-white/75 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Emails</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{competitor.capturedEmails}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-white/75 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Confiança</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{competitor.confidenceScore}%</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {competitor.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{formatTag(tag)}</Badge>
                ))}
                <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  <Radar className="h-4 w-4" />
                  Abrir visão de inteligência
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
