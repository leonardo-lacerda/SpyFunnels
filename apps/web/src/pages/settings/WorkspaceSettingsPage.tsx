import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useDashboardQuery } from "../../hooks/use-platform-data";
import { formatCadence } from "../../utils/labels";

export function WorkspaceSettingsPage() {
  const { data, isLoading } = useDashboardQuery();

  if (isLoading || !data) {
    return <LoadingPanel label="Carregando configurações do espaço de trabalho..." />;
  }

  return (
    <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">Espaço de trabalho</h2>
      <p className="mt-2 text-sm text-text-secondary">Defina a identidade compartilhada do espaço de trabalho e os padrões de monitoramento.</p>
      <div className="mt-6 grid gap-4">
        <Input defaultValue={data.workspace.name} placeholder="Nome do espaço de trabalho" />
        <Input defaultValue={formatCadence(data.workspace.monitoringCadence)} placeholder="Cadência de monitoramento" />
        <Input defaultValue="America/Sao_Paulo" placeholder="Fuso horário padrão" />
      </div>
      <div className="mt-6 flex justify-end">
        <Button>Atualizar espaço de trabalho</Button>
      </div>
    </Card>
  );
}
