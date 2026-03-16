import { useParams } from "react-router-dom";
import { CompetitorMonitoringFeed } from "../../features/monitoring/components/CompetitorMonitoringFeed";
import { EmptyState } from "../../components/shared/EmptyState";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useMonitoringEventsQuery } from "../../hooks/use-platform-data";

export function CompetitorMonitoringPage() {
  const { competitorId } = useParams();
  const { data: events = [], isLoading } = useMonitoringEventsQuery(competitorId);

  if (isLoading) {
    return <LoadingPanel label="Carregando feed de monitoramento..." />;
  }

  if (!events.length) {
    return <EmptyState title="Nenhum evento de monitoramento" description="O motor de monitoramento de mudanças ainda não emitiu eventos para este concorrente." />;
  }

  return <CompetitorMonitoringFeed events={events} />;
}
