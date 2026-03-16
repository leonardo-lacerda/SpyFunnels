import { useParams } from "react-router-dom";
import { AdLibrary } from "../../features/ads/components/AdLibrary";
import { EmptyState } from "../../components/shared/EmptyState";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { useAdsQuery } from "../../hooks/use-platform-data";

export function CompetitorAdsPage() {
  const { competitorId } = useParams();
  const { data: ads = [], isLoading } = useAdsQuery(competitorId);

  if (isLoading) {
    return <LoadingPanel label="Carregando inteligência de anúncios..." />;
  }

  if (!ads.length) {
    return <EmptyState title="Nenhum anúncio capturado" description="As superfícies públicas de anúncios ainda não renderam criativos para este alvo." />;
  }

  return <AdLibrary ads={ads} />;
}
