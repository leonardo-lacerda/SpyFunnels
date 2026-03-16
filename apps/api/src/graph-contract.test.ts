import test from "node:test";
import assert from "node:assert/strict";
import { mapGraphEdge, mapGraphNode } from "./graph-contract.js";

test("mapGraphNode should normalize node types and numeric price", () => {
  const mapped = mapGraphNode({
    id: "n1",
    funnel_node_id: "f1",
    page_id: "p1",
    node_type: "product",
    label: "Oferta Principal",
    canonical_url: "https://example.com/offer",
    price_value: "297.00",
    currency: "USD",
    confidence_score: 0.91,
    first_seen: "2026-03-15T20:00:00.000Z",
    last_seen: "2026-03-15T20:01:00.000Z",
    change_type: "updated",
    metadata_json: { primaryCta: "Comprar Agora" },
    created_at: "2026-03-15T20:01:00.000Z"
  });

  assert.equal(mapped.node_type, "offer");
  assert.equal(mapped.raw_node_type, "product");
  assert.equal(mapped.price_value, 297);
  assert.equal(mapped.change_type, "updated");
  assert.equal(mapped.first_seen, "2026-03-15T20:00:00.000Z");
});

test("mapGraphNode should fallback for invalid number and unknown node type", () => {
  const mapped = mapGraphNode({
    id: "n2",
    funnel_node_id: null,
    page_id: null,
    node_type: "custom_type",
    label: "Node custom",
    canonical_url: null,
    price_value: "abc",
    currency: null,
    confidence_score: 0.7,
    first_seen: "2026-03-15T20:00:00.000Z",
    last_seen: "2026-03-15T20:01:00.000Z",
    change_type: "new",
    metadata_json: null,
    created_at: "2026-03-15T20:01:00.000Z"
  });

  assert.equal(mapped.node_type, "landing");
  assert.equal(mapped.price_value, null);
});

test("mapGraphEdge should expose graph temporal contract", () => {
  const mapped = mapGraphEdge({
    id: "e1",
    from_node_id: "n1",
    to_node_id: "n2",
    edge_type: "observed_navigation",
    confidence_score: 0.88,
    first_seen: "2026-03-15T20:00:00.000Z",
    last_seen: "2026-03-15T20:02:00.000Z",
    change_type: "new",
    metadata_json: { source: "simulation_steps" },
    created_at: "2026-03-15T20:02:00.000Z"
  });

  assert.equal(mapped.edge_type, "observed_navigation");
  assert.equal(mapped.change_type, "new");
  assert.equal(mapped.first_seen, "2026-03-15T20:00:00.000Z");
  assert.equal(mapped.last_seen, "2026-03-15T20:02:00.000Z");
});
