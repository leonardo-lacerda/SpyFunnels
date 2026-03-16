const nodeTypeMap: Record<string, string> = {
  ad_entry: "ad",
  landing: "landing",
  lead_magnet: "lead-magnet",
  webinar: "webinar",
  product: "offer",
  checkout: "checkout",
  upsell: "upsell",
  thank_you: "thank-you",
  retention: "email",
  unknown: "landing"
};

export type GraphNodeRow = {
  id: string;
  funnel_node_id: string | null;
  page_id: string | null;
  node_type: string;
  label: string;
  canonical_url: string | null;
  price_value: string | number | null;
  currency: string | null;
  confidence_score: number;
  first_seen: string;
  last_seen: string;
  change_type: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type GraphEdgeRow = {
  id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: string;
  confidence_score: number;
  first_seen: string;
  last_seen: string;
  change_type: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function mapGraphNode(node: GraphNodeRow) {
  return {
    id: node.id,
    funnel_node_id: node.funnel_node_id,
    page_id: node.page_id,
    node_type: nodeTypeMap[node.node_type] ?? "landing",
    raw_node_type: node.node_type,
    label: node.label,
    canonical_url: node.canonical_url,
    price_value: toNumber(node.price_value),
    currency: node.currency,
    confidence_score: node.confidence_score,
    first_seen: node.first_seen,
    last_seen: node.last_seen,
    change_type: node.change_type,
    metadata_json: node.metadata_json,
    created_at: node.created_at
  };
}

export function mapGraphEdge(edge: GraphEdgeRow) {
  return {
    id: edge.id,
    from_node_id: edge.from_node_id,
    to_node_id: edge.to_node_id,
    edge_type: edge.edge_type,
    confidence_score: edge.confidence_score,
    first_seen: edge.first_seen,
    last_seen: edge.last_seen,
    change_type: edge.change_type,
    metadata_json: edge.metadata_json,
    created_at: edge.created_at
  };
}
