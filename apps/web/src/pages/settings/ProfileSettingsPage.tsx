import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/auth";

export function ProfileSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const inferredName = user?.email ? user.email.split("@")[0] : "";
  const firstName = inferredName ? inferredName.charAt(0).toUpperCase() + inferredName.slice(1) : "";

  return (
    <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">Perfil</h2>
      <p className="mt-2 text-sm text-text-secondary">Atualize sua identidade de conta e preferências pessoais.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Input defaultValue={firstName} placeholder="Nome" />
        <Input placeholder="Sobrenome" />
        <Input defaultValue={user?.email ?? ""} placeholder="Email" className="md:col-span-2" />
      </div>
      <div className="mt-6 flex justify-end">
        <Button>Salvar perfil</Button>
      </div>
    </Card>
  );
}
