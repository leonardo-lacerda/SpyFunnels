type InsightInput = {
  competitorName: string;
  funnelNodeCount: number;
  adCount: number;
  emailCount: number;
  keyChanges: string[];
};

export function buildInsightPrompt(input: InsightInput): string {
  return [
    `Competitor: ${input.competitorName}`,
    `Funnel nodes: ${input.funnelNodeCount}`,
    `Ads detected: ${input.adCount}`,
    `Emails captured: ${input.emailCount}`,
    `Key changes: ${input.keyChanges.join("; ") || "none"}`,
    "Produce a concise intelligence brief with tactical recommendations and confidence notes."
  ].join("\n");
}

export async function generateInsights(
  apiKey: string | undefined,
  model: string,
  input: InsightInput
): Promise<{ summary: string; recommendations: string[] }> {
  const fallbackSummary = `Observed ${input.funnelNodeCount} funnel nodes, ${input.adCount} ads, and ${input.emailCount} email messages for ${input.competitorName}.`;
  const fallbackRecommendations = [
    "Review top funnel entry pages and align ad hooks with landing copy.",
    "Prioritize high-frequency CTAs and evaluate upsell opportunities.",
    "Track pricing/offer changes weekly and trigger A/B tests quickly."
  ];

  if (!apiKey) {
    return { summary: fallbackSummary, recommendations: fallbackRecommendations };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: "You are a senior growth intelligence analyst." },
          { role: "user", content: buildInsightPrompt(input) }
        ]
      })
    });
    if (!response.ok) {
      return { summary: fallbackSummary, recommendations: fallbackRecommendations };
    }
    const json = (await response.json()) as { output_text?: string };
    const text = json.output_text ?? fallbackSummary;
    const recommendations = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[\-\d]/.test(line))
      .slice(0, 5);
    return {
      summary: text,
      recommendations: recommendations.length ? recommendations : fallbackRecommendations
    };
  } catch {
    return { summary: fallbackSummary, recommendations: fallbackRecommendations };
  }
}

