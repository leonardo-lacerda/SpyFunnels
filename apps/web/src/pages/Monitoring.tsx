import { useState } from "react";
import { Filter, Search } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { LoadingPanel } from "../components/shared/LoadingPanel";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useMonitoringEventsQuery } from "../hooks/use-platform-data";
import { CompetitorMonitoringFeed } from "../features/monitoring/components/CompetitorMonitoringFeed";

export function Monitoring() {
  const [search, setSearch] = useState("");
  const { data: events = [], isLoading } = useMonitoringEventsQuery();

  if (isLoading) {
    return <LoadingPanel label="Carregando linha do tempo de monitoramento..." />;
  }

  const filtered = events.filter((event) => `${event.title} ${event.summary} ${event.type}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Feed unificado de mudanças"
        title="Linha do tempo de monitoramento"
        description="Uma superfície única de revisão operacional para mudanças de funil, alterações de oferta, edições de landing pages, explosões de anúncios e detecções de stack em todo o portfólio monitorado."
        actions={
          <>
            <Input icon={<Search className="h-4 w-4" />} placeholder="Buscar eventos de mudança" value={search} onChange={(event) => setSearch(event.target.value)} className="w-[320px]" />
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filtros</Button>
          </>
        }
      />
      <CompetitorMonitoringFeed events={filtered} />
    </div>
  );
}
