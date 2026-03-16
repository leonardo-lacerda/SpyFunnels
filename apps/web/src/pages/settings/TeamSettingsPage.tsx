import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth";
import { formatRole } from "../../utils/labels";

export function TeamSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const members = user ? [{ email: user.email, role: user.role }] : [];

  return (
    <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">Acesso da equipe</h2>
      <p className="mt-2 text-sm text-text-secondary">Revise funções e acessos compartilhados a monitoramento, alertas e relatórios.</p>
      <div className="mt-6 space-y-3">
        {members.length ? members.map((member) => (
          <div key={member.email} className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3">
            <span className="text-sm font-medium text-text-primary">{member.email}</span>
            <Badge variant="secondary">{formatRole(member.role)}</Badge>
          </div>
        )) : (
          <div className="rounded-2xl border border-border-subtle bg-surface-2/60 px-4 py-3 text-sm text-text-secondary">
            Nenhum membro da equipe carregado nesta sessão.
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <Button>Convidar membro da equipe</Button>
      </div>
    </Card>
  );
}
