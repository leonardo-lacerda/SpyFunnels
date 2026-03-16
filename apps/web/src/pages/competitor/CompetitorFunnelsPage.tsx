import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Eye, GitBranchPlus, LayoutGrid, ListTree, Network } from "lucide-react";
import { FunnelViewer } from "../../features/funnels/components/FunnelViewer";
import { FlowGraphExplorer } from "../../features/funnels/components/FlowGraphExplorer";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { LoadingPanel } from "../../components/shared/LoadingPanel";
import { FilterBar } from "../../components/shared/FilterBar";
import { EvidenceCard } from "../../components/shared/EvidenceCard";
import { FunnelTimeline } from "../../components/visualizations/FunnelTimeline";
import { FunnelDiffView } from "../../components/visualizations/FunnelDiffView";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { useFlowGraphCurrentQuery, useFlowGraphVersionQuery, useFlowGraphVersionsQuery, useFunnelVersionsQuery } from "../../hooks/use-platform-data";
import { useUIStore } from "../../store/ui";
import { cn } from "../../utils/cn";
import type { FunnelNode } from "../../types/intelligence";
import { formatConfidence, formatStage } from "../../utils/labels";

const views = [
  { id: "graph", label: "Explorador de fluxo", icon: Network },
  { id: "timeline", label: "Linha do tempo", icon: GitBranchPlus },
  { id: "table", label: "Tabela por etapa", icon: LayoutGrid },
  { id: "diff", label: "Diferenças", icon: ListTree }
] as const;

export function CompetitorFunnelsPage() {
  const { competitorId } = useParams();
  const { data: funnels = [], isLoading } = useFunnelVersionsQuery(competitorId);
  const { data: flowGraphCurrent } = useFlowGraphCurrentQuery(competitorId);
  const { data: flowGraphVersions = [] } = useFlowGraphVersionsQuery(competitorId);
  const [view, setView] = useState<(typeof views)[number]["id"]>("graph");
  const [selectedGraphVersionId, setSelectedGraphVersionId] = useState<string | null>(null);
  const [compareGraphVersionId, setCompareGraphVersionId] = useState<string | null>(null);
  const { data: selectedFlowGraph } = useFlowGraphVersionQuery(competitorId, selectedGraphVersionId);
  const { data: compareFlowGraph } = useFlowGraphVersionQuery(competitorId, compareGraphVersionId);
  const openContextPanel = useUIStore((state) => state.openContextPanel);

  if (isLoading) {
    return <LoadingPanel label="Carregando reconstruções de funil..." />;
  }

  const active = funnels[0];
  const previous = funnels[1];

  if (!active) {
    return <LoadingPanel label="Nenhuma versão de funil detectada ainda." />;
  }

  const selectNode = (node: FunnelNode) => {
    openContextPanel({
      title: node.title,
      description: node.description,
      meta: [
        `Etapa: ${formatStage(node.type)}`,
        `Confiança: ${formatConfidence(node.confidence)}`,
        `Evidências: ${node.evidenceCount}`,
        `Dispositivo: ${node.device}`,
        ...(node.priceValue != null ? [`Preço: ${node.currency ?? ""} ${node.priceValue}`.trim()] : []),
        ...(node.url ? [`URL: ${node.url}`] : []),
        ...node.labels
      ]
    });
  };

  const tableRows = useMemo(() => {
    return active.nodes.map((node) => ({
      ...node,
      nextStep: active.edges.find((edge) => edge.source === node.id)?.label ?? "Fim / ramificação"
    }));
  }, [active]);

  useEffect(() => {
    if (flowGraphVersions.length === 0) {
      setSelectedGraphVersionId(null);
      setCompareGraphVersionId(null);
      return;
    }
    if (!selectedGraphVersionId || !flowGraphVersions.some((item) => item.id === selectedGraphVersionId)) {
      setSelectedGraphVersionId(flowGraphVersions[0]?.id ?? null);
    }
    if (compareGraphVersionId && !flowGraphVersions.some((item) => item.id === compareGraphVersionId)) {
      setCompareGraphVersionId(null);
    }
  }, [flowGraphVersions, selectedGraphVersionId, compareGraphVersionId]);

  useEffect(() => {
    if (compareGraphVersionId && compareGraphVersionId === selectedGraphVersionId) {
      setCompareGraphVersionId(null);
    }
  }, [compareGraphVersionId, selectedGraphVersionId]);

  const activeFlowGraph = selectedFlowGraph ?? flowGraphCurrent;
  const compareSummary = useMemo(() => {
    if (!activeFlowGraph || !compareFlowGraph) return null;
    const nodeDelta = activeFlowGraph.nodes.length - compareFlowGraph.nodes.length;
    const edgeDelta = activeFlowGraph.edges.length - compareFlowGraph.edges.length;
    const evidenceDelta = activeFlowGraph.evidence.length - compareFlowGraph.evidence.length;
    return { nodeDelta, edgeDelta, evidenceDelta };
  }, [activeFlowGraph, compareFlowGraph]);

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">Reconstrução do funil</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">{active.name}</h2>
            <p className="mt-2 text-sm leading-7 text-text-secondary">{active.summary}</p>
          </div>
          <div className="flex gap-3">
            <Badge>{formatConfidence(active.confidence)} confiança</Badge>
            <Link to={`${active.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
              Abrir detalhes da versão
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Card>

      <FilterBar
        left={views.map((item) => {
          const Icon = item.icon;
          return (
            <Button key={item.id} variant={view === item.id ? "primary" : "outline"} onClick={() => setView(item.id)}>
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
        right={
          <>
            <Badge variant="secondary">Mapa de confiança</Badge>
            <Badge variant="secondary">Destaques de mudança</Badge>
            <Badge variant="secondary">Marcadores de canal</Badge>
          </>
        }
      />

      {view === "graph" ? (
        <>
          {flowGraphVersions.length > 0 ? (
            <Card className="border-white/70 bg-white/92 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">Linha do tempo do grafo</p>
                  <Badge variant="secondary">{flowGraphVersions.length} versões</Badge>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {flowGraphVersions.map((version) => {
                    const isSelected = version.id === selectedGraphVersionId;
                    const isCompared = version.id === compareGraphVersionId;
                    return (
                      <div
                        key={version.id}
                        className={cn(
                          "min-w-[220px] rounded-2xl border p-3",
                          isSelected ? "border-brand-400 bg-brand-50/60" : "border-border-subtle bg-white"
                        )}
                      >
                        <p className="text-sm font-semibold text-text-primary">v{version.versionNo}</p>
                        <p className="mt-1 text-xs text-text-secondary">{new Date(version.generatedAt).toLocaleString()}</p>
                        <p className="mt-1 text-xs text-text-muted">{version.nodesCount} nós / {version.edgesCount} arestas</p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant={isSelected ? "primary" : "outline"} onClick={() => setSelectedGraphVersionId(version.id)}>
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant={isCompared ? "secondary" : "ghost"}
                            onClick={() => setCompareGraphVersionId((current) => (current === version.id ? null : version.id))}
                          >
                            {isCompared ? "Comparando" : "Comparar"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ) : null}

          {activeFlowGraph ? (
            compareFlowGraph ? (
              <div className="space-y-6">
                {compareSummary ? (
                  <Card className="border-white/70 bg-white/92 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">Diferença de versões</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">Delta de nós {compareSummary.nodeDelta >= 0 ? "+" : ""}{compareSummary.nodeDelta}</Badge>
                      <Badge variant="secondary">Delta de arestas {compareSummary.edgeDelta >= 0 ? "+" : ""}{compareSummary.edgeDelta}</Badge>
                      <Badge variant="secondary">Delta de evidências {compareSummary.evidenceDelta >= 0 ? "+" : ""}{compareSummary.evidenceDelta}</Badge>
                    </div>
                  </Card>
                ) : null}
                <div className="grid gap-6 2xl:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">
                      Versão base v{activeFlowGraph.versionNo}
                    </p>
                    <FlowGraphExplorer graph={activeFlowGraph} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">
                      Versão comparada v{compareFlowGraph.versionNo}
                    </p>
                    <FlowGraphExplorer graph={compareFlowGraph} />
                  </div>
                </div>
              </div>
            ) : (
              <FlowGraphExplorer graph={activeFlowGraph} />
            )
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.7fr]">
              <FunnelViewer funnelVersion={active} onNodeSelect={selectNode} />
              <div className="space-y-4">
                {active.nodes.slice(0, 3).map((node) => (
                  <div key={node.id} onClick={() => selectNode(node)} className="cursor-pointer">
                    <EvidenceCard
                      title={node.title}
                      description={node.description}
                      meta={[`Etapa: ${formatStage(node.type)}`, `Confiança: ${formatConfidence(node.confidence)}`, `${node.evidenceCount} evidências`]}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {!activeFlowGraph ? (
            <Card className="border-white/70 bg-white/92 p-4 text-sm text-text-secondary shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              O explorador de grafos ainda não está disponível para este concorrente. Execute uma nova rodada para gerar versões em `graph_versions`.
            </Card>
          ) : null}
        </>
      ) : null}

      {view === "timeline" ? <FunnelTimeline funnelVersion={active} /> : null}

      {view === "table" ? (
        <Card className="border-white/70 bg-white/92 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etapa</TableHead>
                <TableHead>Nó</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Evidências</TableHead>
                <TableHead>Próxima etapa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => selectNode(row)}>
                  <TableCell className="capitalize">{formatStage(row.type)}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell className="capitalize">{formatConfidence(row.confidence)}</TableCell>
                  <TableCell className="mono">{row.evidenceCount}</TableCell>
                  <TableCell>{row.nextStep}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {view === "diff" ? <FunnelDiffView current={active} {...(previous ? { previous } : {})} /> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-strong text-white">
              <GitBranchPlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Transições-chave</p>
              <h3 className="text-lg font-semibold text-text-primary">Arestas observadas</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {active.edges.map((edge) => (
              <div key={edge.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4">
                <p className="text-sm font-semibold text-text-primary">{edge.label}</p>
                <p className="mt-2 text-xs text-text-secondary">{edge.source} para {edge.target}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-strong text-white">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Dicas do analista</p>
              <h3 className="text-lg font-semibold text-text-primary">O que inspecionar a seguir</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-7 text-text-secondary">
            <p>Clique em qualquer etapa para abrir o painel de evidências com confiança, URL de origem e rótulos de suporte.</p>
            <p>Use `Diferenças` para comparar a narrativa atual com a versão anterior mapeada.</p>
            <p>Use `Tabela por etapa` quando precisar de revisão densa ou ordenação rápida por evidências.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
