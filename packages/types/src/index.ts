import { z } from "zod";

export const sourceTypeSchema = z.enum(["domain", "website", "instagram", "facebook"]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const competitorInputSchema = z.object({
  name: z.string().min(2),
  primaryDomain: z.string().min(3),
  sources: z.array(
    z.object({
      sourceType: sourceTypeSchema,
      url: z.string().url()
    })
  )
});
export type CompetitorInput = z.infer<typeof competitorInputSchema>;

export const funnelNodeTypeSchema = z.enum([
  "ad_entry",
  "landing",
  "lead_magnet",
  "webinar",
  "product",
  "checkout",
  "upsell",
  "thank_you",
  "retention",
  "unknown"
]);
export type FunnelNodeType = z.infer<typeof funnelNodeTypeSchema>;

export const changeTypeSchema = z.enum([
  "price_change",
  "new_page",
  "new_offer",
  "new_ad",
  "new_email_sequence",
  "tech_stack_change",
  "funnel_structure_change"
]);
export type ChangeType = z.infer<typeof changeTypeSchema>;

export const simulationScenarioSchema = z.enum(["engage", "abandon_checkout", "convert"]);
export type SimulationScenario = z.infer<typeof simulationScenarioSchema>;

export const eventEnvelopeSchema = z.object({
  topic: z.string().min(1),
  key: z.string().min(1),
  timestamp: z.string().datetime(),
  payload: z.record(z.any())
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

