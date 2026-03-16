import { useMemo } from "react";
import { Background, Controls, type Edge, type Node, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FunnelNode, FunnelVersion } from "../../../types/intelligence";
import { CustomNode } from "./CustomNode";

const nodeTypes = {
  custom: CustomNode,
};

const stagePositions = [
  { x: 40, y: 60 },
  { x: 320, y: 60 },
  { x: 600, y: 60 },
  { x: 180, y: 260 },
  { x: 460, y: 260 },
  { x: 740, y: 260 },
  { x: 320, y: 460 },
  { x: 600, y: 460 },
  { x: 880, y: 460 },
];

export function FunnelViewer({
  funnelVersion,
  onNodeSelect,
}: {
  funnelVersion: FunnelVersion;
  onNodeSelect?: (node: FunnelNode) => void;
}) {
  const nodes = useMemo<Node[]>(() => {
    return funnelVersion.nodes.map((node, index) => ({
      id: node.id,
      type: "custom",
      position: stagePositions[index] ?? { x: 80 + index * 220, y: 80 + (index % 2) * 180 },
      data: {
        label: node.title,
        type: node.type,
        confidence: node.confidence,
        metric: node.description,
        meta: `${node.evidenceCount} evidências`,
      },
      draggable: false,
    }));
  }, [funnelVersion]);

  const edges = useMemo<Edge[]>(() => {
    return funnelVersion.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: edge.confidence === "high",
      style: {
        stroke: edge.confidence === "high" ? "#1d4ed8" : edge.confidence === "medium" ? "#64748b" : "#c084fc",
        strokeWidth: edge.confidence === "high" ? 2.25 : 1.4,
      },
      labelStyle: { fill: "#475569", fontSize: 11, fontWeight: 600 },
      labelBgPadding: [10, 4],
      labelBgBorderRadius: 999,
      labelBgStyle: { fill: "rgba(255,255,255,0.92)", stroke: "rgba(203,213,225,0.8)" },
      type: "smoothstep",
    }));
  }, [funnelVersion]);

  return (
    <div className="h-[620px] w-full overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.08),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,245,239,0.88))] shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
      <ReactFlow
        fitView
        minZoom={0.4}
        maxZoom={1.4}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        panOnDrag
        zoomOnScroll={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, clickedNode) => {
          const rawNode = funnelVersion.nodes.find((node) => node.id === clickedNode.id);
          if (rawNode && onNodeSelect) {
            onNodeSelect(rawNode);
          }
        }}
      >
        <Background gap={18} size={1} color="rgba(148,163,184,0.22)" />
        <Controls className="!rounded-2xl !border !border-white/70 !bg-white/90 !shadow-[0_14px_28px_rgba(15,23,42,0.12)]" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
