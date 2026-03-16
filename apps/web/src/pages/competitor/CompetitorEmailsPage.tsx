import { useParams } from "react-router-dom";
import { EmailSequence } from "../../features/emails/components/EmailSequence";
import { EmptyState } from "../../components/shared/EmptyState";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useEmailsQuery } from "../../hooks/use-platform-data";

export function CompetitorEmailsPage() {
  const { competitorId } = useParams();
  const { data: emails = [], isLoading } = useEmailsQuery(competitorId);

  if (isLoading) {
    return <LoadingPanel label="Carregando inteligência de emails..." />;
  }

  if (!emails.length) {
    return <EmptyState title="Nenhum email capturado" description="Nenhum artefato de inbox capturado está associado a este concorrente ainda." />;
  }

  return <EmailSequence emails={emails} />;
}
