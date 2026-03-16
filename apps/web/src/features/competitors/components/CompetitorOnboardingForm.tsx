import { useMemo, useState } from "react";
import { Globe2, Instagram, Rocket, Save } from "lucide-react";
import { InlineError } from "../../../components/shared/InlineError";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useCreateCompetitorMutation, useRunCompetitorMutation } from "../../../hooks/use-platform-data";

interface CompetitorOnboardingFormProps {
  onSuccess?: (competitorId: string) => void;
}

interface FormState {
  name: string;
  primaryDomain: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  cadence: string;
  priority: string;
}

const initialState: FormState = {
  name: "",
  primaryDomain: "",
  websiteUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  cadence: "cadência escalonada de 6 horas",
  priority: "nível 2",
};

function normalizeDomain(value: string) {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function ensureUrl(value: string) {
  if (!value.trim()) return "";
  return /^https?:\/\//i.test(value) ? value.trim() : `https://${value.trim()}`;
}

export function CompetitorOnboardingForm({ onSuccess }: CompetitorOnboardingFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createMutation = useCreateCompetitorMutation();
  const runMutation = useRunCompetitorMutation();

  const isBusy = createMutation.isPending || runMutation.isPending;
  const derivedWebsite = useMemo(
    () => (form.websiteUrl.trim() ? form.websiteUrl : form.primaryDomain.trim() ? `https://${normalizeDomain(form.primaryDomain)}` : ""),
    [form.primaryDomain, form.websiteUrl]
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setSuccessMessage(null);
  }

  async function submit(mode: "save" | "run") {
    setError(null);
    setSuccessMessage(null);

    const primaryDomain = normalizeDomain(form.primaryDomain);
    const websiteUrl = ensureUrl(derivedWebsite);
    const instagramUrl = form.instagramUrl.trim() ? ensureUrl(form.instagramUrl) : undefined;
    const facebookUrl = form.facebookUrl.trim() ? ensureUrl(form.facebookUrl) : undefined;

    if (!form.name.trim() || !primaryDomain || !websiteUrl) {
      setError("Nome de exibição, domínio principal e URL do site são obrigatórios.");
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: form.name.trim(),
        primaryDomain,
        websiteUrl,
        ...(instagramUrl ? { instagramUrl } : {}),
        ...(facebookUrl ? { facebookUrl } : {}),
      });

      if (mode === "run") {
        await runMutation.mutateAsync(created.id);
        setSuccessMessage("Concorrente criado e pipeline de monitoramento agendado.");
      } else {
        setSuccessMessage("Concorrente criado e salvo no portfólio monitorado.");
      }

      onSuccess?.(created.id);
      setForm(initialState);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Falha ao criar concorrente.");
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <InlineError title="Não foi possível salvar o concorrente" description={error} /> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      <Input
        placeholder="Nome de exibição"
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
      />
      <Input
        placeholder="Domínio principal"
        value={form.primaryDomain}
        onChange={(event) => update("primaryDomain", event.target.value)}
      />
      <Input
        placeholder="URL do site"
        value={form.websiteUrl}
        onChange={(event) => update("websiteUrl", event.target.value)}
        icon={<Globe2 className="h-4 w-4" />}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          placeholder="Perfil do Instagram"
          value={form.instagramUrl}
          onChange={(event) => update("instagramUrl", event.target.value)}
          icon={<Instagram className="h-4 w-4" />}
        />
        <Input
          placeholder="Página do Facebook"
          value={form.facebookUrl}
          onChange={(event) => update("facebookUrl", event.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input value={form.cadence} onChange={(event) => update("cadence", event.target.value)} placeholder="Cadência de monitoramento" />
        <Input value={form.priority} onChange={(event) => update("priority", event.target.value)} placeholder="Nível de prioridade" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => submit("save")} isLoading={createMutation.isPending && !runMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Salvar rascunho
        </Button>
        <Button onClick={() => submit("run")} isLoading={isBusy}>
          <Rocket className="mr-2 h-4 w-4" />
          Iniciar monitoramento
        </Button>
      </div>
    </div>
  );
}
