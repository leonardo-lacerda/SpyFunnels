import type { FunnelVersion } from "../../types/intelligence";
import { DiffCard } from "../shared/DiffCard";

export function FunnelDiffView({ current, previous }: { current: FunnelVersion; previous?: FunnelVersion }) {
  const previousSummary = previous?.summary ?? "Nenhuma versão anterior do funil armazenada para este alvo.";

  return (
    <div className="space-y-4">
      <DiffCard title="Resumo do funil" before={previousSummary} after={current.summary} />
      <DiffCard title="Gancho principal" before={previous?.primaryHook ?? "Nenhum gancho anterior capturado"} after={current.primaryHook} />
      <DiffCard title="Ponto de conversão" before={previous?.conversionPoint ?? "Nenhum ponto de conversão anterior capturado"} after={current.conversionPoint} />
    </div>
  );
}
