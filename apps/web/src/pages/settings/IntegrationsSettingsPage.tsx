import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function IntegrationsSettingsPage() {
  return (
    <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">Integrações</h2>
      <p className="mt-2 text-sm text-text-secondary">Controle canais de entrega, acesso à API e automações do espaço de trabalho.</p>
      <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3 text-sm text-text-secondary">
        Nenhuma integração do espaço de trabalho configurada ainda.
      </div>
      <div className="mt-6 flex justify-end">
        <Button>Gerenciar integrações</Button>
      </div>
    </Card>
  );
}
