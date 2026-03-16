import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { cn } from "../../../utils/cn";
import type { FlowGraphEdge, FlowGraphNode, FlowGraphVersion, FunnelStageType } from "../../../types/intelligence";
import { formatChangeType, formatChannel, formatGroupMode, formatStage } from "../../../utils/labels";

const stageOrder: Record<FunnelStageType, number> = {
  ad: 0,
  landing: 1,
  "lead-magnet": 2,
  email: 3,
  webinar: 4,
  offer: 5,
  checkout: 6,
  upsell: 7,
  "thank-you": 8
};

const channelOrder: Record<string, number> = {
  ad: 0,
  email: 1,
  webinar: 2,
  web: 3
};

const stageTheme: Record<FunnelStageType, { accent: string; chip: string }> = {
  ad: { accent: "from-sky-500/18 to-sky-500/7", chip: "text-sky-700" },
  landing: { accent: "from-emerald-500/18 to-emerald-500/7", chip: "text-emerald-700" },
  "lead-magnet": { accent: "from-amber-500/18 to-amber-500/7", chip: "text-amber-700" },
  email: { accent: "from-indigo-500/18 to-indigo-500/7", chip: "text-indigo-700" },
  webinar: { accent: "from-fuchsia-500/18 to-fuchsia-500/7", chip: "text-fuchsia-700" },
  offer: { accent: "from-orange-500/18 to-orange-500/7", chip: "text-orange-700" },
  checkout: { accent: "from-rose-500/18 to-rose-500/7", chip: "text-rose-700" },
  upsell: { accent: "from-violet-500/18 to-violet-500/7", chip: "text-violet-700" },
  "thank-you": { accent: "from-teal-500/18 to-teal-500/7", chip: "text-teal-700" }
};

type GroupMode = "stage" | "channel";

type FlowNodeData = {
  label: string;
  type: FunnelStageType;
  confidence: "high" | "medium" | "low";
  evidenceCount: number;
  changeType: string;
  priceLabel?: string;
  channel: string;
  groupMode: GroupMode;
  isGroup: boolean;
  groupKey: string;
  collapsedCount: number;
};

type GroupEntry = {
  key: string;
  label: string;
  order: number;
  nodes: FlowGraphNode[];
};

function edgeLabel(value: string) {
  return value.replace(/_/g, " ");
}

function confidenceClass(value: "high" | "medium" | "low") {
  if (value === "high") return "bg-emerald-500";
  if (value === "medium") return "bg-amber-500";
  return "bg-rose-500";
}

function nodePriceLabel(node: FlowGraphNode) {
  if (node.priceValue == null) return null;
  return `${node.currency ?? ""} ${node.priceValue}`.trim();
}

function inferChannel(node: FlowGraphNode): string {
  const url = (node.canonicalUrl ?? "").toLowerCase();
  if (
    /utm_medium=email|utm_source=email|newsletter|mail/.test(url) ||
    node.type === "email"
  ) {
    return "email";
  }
  if (
    /gclid|fbclid|utm_source=facebook|utm_source=google|utm_medium=cpc|utm_campaign/.test(url) ||
    node.type === "ad"
  ) {
    return "ad";
  }
  if (node.type === "webinar") {
    return "webinar";
  }
  return "web";
}

function normalizeGroupLabel(groupMode: GroupMode, key: string) {
  if (groupMode === "stage") {
    return formatStage(key);
  }
  return formatChannel(key);
}

function groupNodes(nodes: FlowGraphNode[], groupMode: GroupMode): GroupEntry[] {
  const grouped = new Map<string, FlowGraphNode[]>();
  for (const node of nodes) {
    const groupKey = groupMode === "stage" ? node.type : inferChannel(node);
    const list = grouped.get(groupKey) ?? [];
    list.push(node);
    grouped.set(groupKey, list);
  }

  return Array.from(grouped.entries())
    .map(([key, groupItems]) => {
      const representative = groupItems[0];
      const order =
        groupMode === "stage"
          ? representative
            ? stageOrder[representative.type] ?? 99
            : 99
          : channelOrder[key] ?? 99;
      return {
        key,
        label: normalizeGroupLabel(groupMode, key),
        order,
        nodes: groupItems
      };
    })
    .sort((left, right) => left.order - right.order || left.key.localeCompare(right.key));
}

function FlowNodeCard({ data, selected }: NodeProps) {
  const node = data as FlowNodeData;
  const theme = stageTheme[node.type] ?? stageTheme.landing;
  const headline = node.isGroup ? `${node.label} (${node.collapsedCount})` : node.label;

  return (
    <div
      className={cn(
        "relative min-w-[220px] rounded-[22px] border border-white/75 bg-white/94 px-4 py-3 shadow-[0_18px_42px_rgba(15,23,42,0.11)] transition",
        selected ? "ring-2 ring-brand-500/45" : "hover:-translate-y-0.5"
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500" />
      <div className={cn("absolute inset-x-0 top-0 h-14 rounded-t-[22px] bg-gradient-to-r", theme.accent)} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.2em]", theme.chip)}>
              {node.groupMode === "stage" ? formatStage(node.type) : formatChannel(node.channel)}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{headline}</p>
          </div>
          <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", confidenceClass(node.confidence))} />
        </div>
        <div className="mt-3 text-xs text-text-secondary">
          <p>{node.evidenceCount} evidências</p>
          {node.isGroup ? (
            <p className="mt-1">Nós agrupados: {node.collapsedCount}</p>
          ) : (
            <p className="mt-1 capitalize">{formatChangeType(node.changeType)}</p>
          )}
          {node.priceLabel ? <p className="mt-1 font-semibold text-text-primary">{node.priceLabel}</p> : null}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500" />
    </div>
  );
}

const nodeTypes = {
  flowNode: FlowNodeCard
};

export function FlowGraphExplorer({ graph }: { graph: FlowGraphVersion }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(graph.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>("stage");
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  useEffect(() => {
    setSelectedNodeId(graph.nodes[0]?.id ?? null);
    setSelectedEdgeId(null);
    setSelectedGroupKey(null);
  }, [graph.id]);

  const groups = useMemo(() => groupNodes(graph.nodes, groupMode), [graph.nodes, groupMode]);
  const collapsedLookup = useMemo(() => new Set(collapsedGroups), [collapsedGroups]);

  const rendered = useMemo(() => {
    const nodeIdToRenderId = new Map<string, string>();
    const nodes: Node[] = [];

    for (const [groupIndex, group] of groups.entries()) {
      const isCollapsed = collapsedLookup.has(group.key);
      const groupNodesList = group.nodes;
      if (isCollapsed) {
        const groupId = `group:${groupMode}:${group.key}`;
        for (const item of groupNodesList) {
          nodeIdToRenderId.set(item.id, groupId);
        }
        const confidence =
          groupNodesList.some((item) => item.confidence === "high") ? "high" :
          groupNodesList.some((item) => item.confidence === "medium") ? "medium" :
          "low";
        const evidenceCount = groupNodesList.reduce((sum, item) => sum + item.evidenceCount, 0);
        const representative = groupNodesList[0];
        nodes.push({
          id: groupId,
          type: "flowNode",
          position: { x: 100 + groupIndex * 300, y: 120 },
          data: {
            label: group.label,
            type: representative?.type ?? "landing",
            confidence,
            evidenceCount,
            changeType: "grouped",
            channel: representative ? inferChannel(representative) : "web",
            groupMode,
            isGroup: true,
            groupKey: group.key,
            collapsedCount: groupNodesList.length
          },
          draggable: false
        });
        continue;
      }

      for (const [nodeIndex, item] of groupNodesList.entries()) {
        nodeIdToRenderId.set(item.id, item.id);
        const priceLabel = nodePriceLabel(item);
        nodes.push({
          id: item.id,
          type: "flowNode",
          position: { x: 100 + groupIndex * 300, y: 90 + nodeIndex * 188 },
          data: {
            label: item.label,
            type: item.type,
            confidence: item.confidence,
            evidenceCount: item.evidenceCount,
            changeType: item.changeType,
            ...(priceLabel ? { priceLabel } : {}),
            channel: inferChannel(item),
            groupMode,
            isGroup: false,
            groupKey: group.key,
            collapsedCount: 1
          },
          draggable: false
        });
      }
    }

    const edgeByRenderId = new Map<string, Edge>();
    const edgeSourceMap = new Map<string, string[]>();
    for (const edge of graph.edges) {
      const source = nodeIdToRenderId.get(edge.fromNodeId);
      const target = nodeIdToRenderId.get(edge.toNodeId);
      if (!source || !target || source === target) continue;

      const renderEdgeId = `edge:${source}:${target}:${edge.edgeType}`;
      const list = edgeSourceMap.get(renderEdgeId) ?? [];
      list.push(edge.id);
      edgeSourceMap.set(renderEdgeId, list);

      if (edgeByRenderId.has(renderEdgeId)) {
        continue;
      }
      edgeByRenderId.set(renderEdgeId, {
        id: renderEdgeId,
        source,
        target,
        label: edgeLabel(edge.edgeType),
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#334155" },
        animated: edge.confidence === "high",
        style: {
          stroke: edge.confidence === "high" ? "#1d4ed8" : edge.confidence === "medium" ? "#64748b" : "#94a3b8",
          strokeWidth: edge.confidence === "high" ? 2.4 : 1.5
        },
        labelStyle: { fill: "#334155", fontSize: 11, fontWeight: 600 },
        labelBgPadding: [9, 4],
        labelBgBorderRadius: 999,
        labelBgStyle: { fill: "rgba(255,255,255,0.94)", stroke: "rgba(148,163,184,0.35)" }
      });
    }

    return {
      nodes,
      edges: Array.from(edgeByRenderId.values()),
      edgeSourceMap
    };
  }, [graph.edges, groups, groupMode, collapsedLookup]);

  const selectedNode = selectedNodeId ? graph.nodes.find((item) => item.id === selectedNodeId) ?? null : null;
  const selectedEdgeSourceIds = selectedEdgeId ? rendered.edgeSourceMap.get(selectedEdgeId) ?? [] : [];
  const selectedEdge =
    selectedEdgeSourceIds.length > 0 ? graph.edges.find((item) => item.id === selectedEdgeSourceIds[0]) ?? null : null;
  const selectedGroup = selectedGroupKey ? groups.find((item) => item.key === selectedGroupKey) ?? null : null;

  const selectedNodeEvidence = useMemo(() => {
    if (!selectedNodeId) return [];
    return graph.evidence.filter((item) => item.nodeId === selectedNodeId);
  }, [graph.evidence, selectedNodeId]);

  const selectedEdgeEvidence = useMemo(() => {
    if (!selectedEdgeSourceIds.length) return [];
    const edgeIdSet = new Set(selectedEdgeSourceIds);
    return graph.evidence.filter((item) => item.edgeId && edgeIdSet.has(item.edgeId));
  }, [graph.evidence, selectedEdgeSourceIds]);

  const selectedGroupEvidence = useMemo(() => {
    if (!selectedGroup) return [];
    const nodeIds = new Set(selectedGroup.nodes.map((item) => item.id));
    return graph.evidence.filter((item) => item.nodeId && nodeIds.has(item.nodeId));
  }, [graph.evidence, selectedGroup]);

  function toggleGroupCollapse(groupKey: string) {
    setCollapsedGroups((current) =>
      current.includes(groupKey) ? current.filter((item) => item !== groupKey) : [...current, groupKey]
    );
  }

  function collapseAll() {
    setCollapsedGroups(groups.map((item) => item.key));
  }

  function expandAll() {
    setCollapsedGroups([]);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
      <div className="overflow-hidden rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(2,132,199,0.08),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,245,239,0.88))] shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <div className="border-b border-white/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={groupMode === "stage" ? "primary" : "outline"} onClick={() => setGroupMode("stage")}>
              Agrupar por etapa
            </Button>
            <Button size="sm" variant={groupMode === "channel" ? "primary" : "outline"} onClick={() => setGroupMode("channel")}>
              Agrupar por canal
            </Button>
            <Button size="sm" variant="ghost" onClick={collapseAll}>Recolher tudo</Button>
            <Button size="sm" variant="ghost" onClick={expandAll}>Expandir tudo</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {groups.map((group) => {
              const isCollapsed = collapsedLookup.has(group.key);
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => toggleGroupCollapse(group.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition",
                    isCollapsed
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-border-subtle bg-white/85 text-text-secondary hover:bg-white"
                  )}
                >
                  <span>{group.label}</span>
                  <span className="mono text-[11px]">{group.nodes.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[620px]">
          <ReactFlow
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.25}
            maxZoom={1.5}
            nodes={rendered.nodes}
            edges={rendered.edges}
            nodeTypes={nodeTypes}
            nodesConnectable={false}
            panOnDrag
            zoomOnScroll={false}
            onNodeClick={(_, clickedNode) => {
              if (clickedNode.id.startsWith("group:")) {
                const [_, mode, key] = clickedNode.id.split(":");
                setSelectedGroupKey(mode && key ? key : null);
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                return;
              }
              setSelectedNodeId(clickedNode.id);
              setSelectedEdgeId(null);
              setSelectedGroupKey(null);
            }}
            onEdgeClick={(_, clickedEdge) => {
              setSelectedEdgeId(clickedEdge.id);
              setSelectedNodeId(null);
              setSelectedGroupKey(null);
            }}
          >
            <Background gap={18} size={1} color="rgba(148,163,184,0.22)" />
            <MiniMap
              pannable
              zoomable
              className="!rounded-xl !border !border-white/70 !bg-white/92 !shadow-[0_14px_28px_rgba(15,23,42,0.12)]"
              maskColor="rgba(15,23,42,0.08)"
              nodeColor={(node) => (node.selected ? "#1d4ed8" : "#475569")}
            />
            <Controls className="!rounded-2xl !border !border-white/70 !bg-white/92 !shadow-[0_14px_28px_rgba(15,23,42,0.12)]" showInteractive={false} />
          </ReactFlow>
        </div>
      </div>

      <Card className="border-white/70 bg-white/92 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Grafo v{graph.versionNo}</Badge>
          <Badge variant="secondary">{graph.nodes.length} nós</Badge>
          <Badge variant="secondary">{graph.edges.length} arestas</Badge>
          <Badge variant="secondary">{formatGroupMode(groupMode)}</Badge>
        </div>

        {selectedNode ? (
          <div className="mt-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">Nó selecionado</p>
            <h3 className="text-lg font-semibold text-text-primary">{selectedNode.label}</h3>
            <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatStage(selectedNode.type)}</p>
            {selectedNode.canonicalUrl ? <p className="text-xs text-text-secondary">{selectedNode.canonicalUrl}</p> : null}
            {selectedNode.priceValue != null ? (
              <p className="text-sm font-semibold text-text-primary">{`${selectedNode.currency ?? ""} ${selectedNode.priceValue}`.trim()}</p>
            ) : null}
            <p className="text-xs capitalize text-text-secondary">Tipo de mudança: {formatChangeType(selectedNode.changeType)}</p>
            <p className="text-xs text-text-secondary">Visto pela primeira vez: {new Date(selectedNode.firstSeen).toLocaleString()}</p>
            <p className="text-xs text-text-secondary">Visto pela última vez: {new Date(selectedNode.lastSeen).toLocaleString()}</p>
            <p className="text-xs text-text-secondary">{selectedNodeEvidence.length} itens de evidência ligados a este nó.</p>
            <div className="space-y-2">
              {selectedNodeEvidence.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-3">
                  <p className="text-xs font-semibold text-text-primary">{item.sourceType.replace(/_/g, " ")}</p>
                  {item.snippet ? <p className="mt-1 text-xs text-text-secondary">{item.snippet}</p> : null}
                  {item.sourceUrl ? <p className="mt-1 truncate text-[11px] text-text-muted">{item.sourceUrl}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedEdge ? (
          <div className="mt-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">Aresta selecionada</p>
            <h3 className="text-lg font-semibold text-text-primary">{edgeLabel(selectedEdge.edgeType)}</h3>
            <p className="text-xs text-text-secondary">{selectedEdge.fromNodeId} para {selectedEdge.toNodeId}</p>
            <p className="text-xs capitalize text-text-secondary">Tipo de mudança: {formatChangeType(selectedEdge.changeType)}</p>
            <p className="text-xs text-text-secondary">Visto pela primeira vez: {new Date(selectedEdge.firstSeen).toLocaleString()}</p>
            <p className="text-xs text-text-secondary">Visto pela última vez: {new Date(selectedEdge.lastSeen).toLocaleString()}</p>
            <p className="text-xs text-text-secondary">{selectedEdgeEvidence.length} itens de evidência ligados a esta aresta.</p>
            <div className="space-y-2">
              {selectedEdgeEvidence.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-3">
                  <p className="text-xs font-semibold text-text-primary">{item.sourceType.replace(/_/g, " ")}</p>
                  {item.snippet ? <p className="mt-1 text-xs text-text-secondary">{item.snippet}</p> : null}
                  {item.sourceUrl ? <p className="mt-1 truncate text-[11px] text-text-muted">{item.sourceUrl}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedGroup ? (
          <div className="mt-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">Grupo selecionado</p>
            <h3 className="text-lg font-semibold text-text-primary">{selectedGroup.label}</h3>
            <p className="text-xs text-text-secondary">Nós no grupo: {selectedGroup.nodes.length}</p>
            <p className="text-xs text-text-secondary">Evidências no grupo: {selectedGroupEvidence.length}</p>
            <div className="space-y-2">
              {selectedGroup.nodes.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border-subtle bg-surface-2/60 p-3">
                  <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                  <p className="mt-1 text-xs text-text-secondary capitalize">{formatStage(item.type)}</p>
                  {item.canonicalUrl ? <p className="mt-1 truncate text-[11px] text-text-muted">{item.canonicalUrl}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!selectedNode && !selectedEdge && !selectedGroup ? (
          <div className="mt-5 rounded-2xl border border-border-subtle bg-surface-2/60 p-4 text-sm text-text-secondary">
            Selecione um nó, conexão ou grupo para inspecionar evidências e datas.
          </div>
        ) : null}
      </Card>
    </div>
  );
}
