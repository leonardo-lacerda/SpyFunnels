import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { CompetitorOnboardingForm } from "../../features/competitors/components/CompetitorOnboardingForm";

export function NewCompetitorPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Integração"
        title="Adicionar novo concorrente"
        description="Registre o domínio e pontos de entrada de perfil público para um novo alvo monitorado. Isso inicializa descoberta por crawl, simulação de navegador, captura de emails e monitoramento contínuo de mudanças."
      />
      <Card className="mx-auto max-w-3xl border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <CompetitorOnboardingForm onSuccess={(competitorId) => navigate(`/competitors/${competitorId}/overview`)} />
      </Card>
    </div>
  );
}
