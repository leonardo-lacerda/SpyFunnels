import { useDeferredValue, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { AdCreative } from "../../../types/intelligence";
import { AdCard } from "./AdCard";

export function AdLibrary({ ads }: { ads: AdCreative[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);

  const filteredAds = ads.filter((ad) => {
    const haystack = `${ad.headline} ${ad.body} ${ad.hook} ${ad.platform}`.toLowerCase();
    return haystack.includes(deferredSearch.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">Biblioteca de inteligência de anúncios</h2>
          <p className="mt-1 text-sm text-text-secondary">Criativos capturados organizados por gancho, plataforma e associação de landing page.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Buscar ganchos, texto ou plataforma"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full sm:w-[320px]"
          />
          <Button variant="outline">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {filteredAds.map((ad) => (
          <AdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </div>
  );
}
