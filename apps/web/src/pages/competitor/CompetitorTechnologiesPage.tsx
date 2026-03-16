import { useParams } from "react-router-dom";
import { StackMatrix } from "../../features/technologies/components/StackMatrix";
import { EmptyState } from "../../components/shared/EmptyState";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useTechnologiesQuery } from "../../hooks/use-platform-data";

export function CompetitorTechnologiesPage() {
  const { competitorId } = useParams();
  const { data: technologies = [], isLoading } = useTechnologiesQuery(competitorId);

  if (isLoading) {
    return <LoadingPanel label="Carregando detecções de tecnologia..." />;
  }

  if (!technologies.length) {
    return <EmptyState title="Nenhuma detecção de tecnologia" description="A identificação de tecnologias ainda não foi concluída para este alvo." />;
  }

  return <StackMatrix technologies={technologies} />;
}
