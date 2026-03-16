import { load } from "cheerio";
import type { FunnelNodeType } from "@funnel/types";

export type NodeSemanticSignals = {
  resolvedNodeType: FunnelNodeType;
  priceValue: number | null;
  currency: string | null;
  installmentCount: number | null;
  installmentValue: number | null;
  hasOrderBump: boolean;
  hasUpsell: boolean;
  hasDownsell: boolean;
  productName: string | null;
  primaryCta: string | null;
  confidence: number;
  reason: string[];
};

export type SemanticExtractionOptions = {
  ocrText?: string | null;
};

export function normalizePrice(raw: string): number | null {
  const sanitized = raw.replace(/[^\d,.-]/g, "").trim();
  if (!sanitized) return null;
  if (sanitized.includes(",") && sanitized.includes(".")) {
    const normalized = sanitized.replace(/\./g, "").replace(",", ".");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }
  if (sanitized.includes(",")) {
    const normalized = sanitized.replace(",", ".");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }
  const value = Number(sanitized);
  return Number.isFinite(value) ? value : null;
}

export function detectPriceSignal(text: string): { priceValue: number; currency: string } | null {
  const patterns: Array<{ regex: RegExp; currency: string }> = [
    { regex: /(r\$)\s?(\d[\d.,]*)/i, currency: "BRL" },
    { regex: /(\$)\s?(\d[\d.,]*)/, currency: "USD" },
    { regex: /(usd)\s?(\d[\d.,]*)/i, currency: "USD" },
    { regex: /(eur|\u20ac)\s?(\d[\d.,]*)/i, currency: "EUR" },
    { regex: /(gbp|\u00a3)\s?(\d[\d.,]*)/i, currency: "GBP" }
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    const amount = match?.[2];
    if (!amount) continue;
    const value = normalizePrice(amount);
    if (value == null) continue;
    return { priceValue: value, currency: pattern.currency };
  }

  return null;
}

export function detectInstallmentSignal(text: string): { count: number; value: number | null; currency: string | null } | null {
  const installmentMatch = text.match(/(\d{1,2})\s*x\s*(?:de)?\s*(r\$|\$|usd|eur|\u20ac|gbp|\u00a3)?\s*(\d[\d.,]*)/i);
  if (!installmentMatch) return null;
  const count = Number(installmentMatch[1]);
  if (!Number.isFinite(count) || count <= 1) return null;
  const symbol = (installmentMatch[2] ?? "").toLowerCase();
  const value = normalizePrice(installmentMatch[3] ?? "");
  const currency =
    symbol.includes("r$") ? "BRL" :
    symbol.includes("$") || symbol.includes("usd") ? "USD" :
    symbol.includes("eur") || symbol.includes("\u20ac") ? "EUR" :
    symbol.includes("gbp") || symbol.includes("\u00a3") ? "GBP" :
    null;

  return { count, value, currency };
}

export function classifyBaseNode(url: string, text: string): FunnelNodeType {
  const candidate = `${url} ${text}`.toLowerCase();
  if (/(ad[s]?|utm_source|campaign)/.test(candidate)) return "ad_entry";
  if (/(lead magnet|ebook|free guide|download)/.test(candidate)) return "lead_magnet";
  if (/(webinar|masterclass|workshop)/.test(candidate)) return "webinar";
  if (/(checkout|cart|payment|buy now|order now|finalizar compra)/.test(candidate)) return "checkout";
  if (/(upsell|order bump|one click)/.test(candidate)) return "upsell";
  if (/(thank you|order confirmed|success|obrigado)/.test(candidate)) return "thank_you";
  if (/(subscribe|membership|community)/.test(candidate)) return "retention";
  if (/(pricing|product|offer|plan|plano|produto|oferta)/.test(candidate)) return "product";
  if (/(landing|lp|signup|register|cadastro)/.test(candidate)) return "landing";
  return "unknown";
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function mergeSignalReason(base: string[], addition: string[]) {
  const seen = new Set(base);
  for (const item of addition) {
    if (!seen.has(item)) {
      base.push(item);
      seen.add(item);
    }
  }
}

function extractSignalsFromText(rawText: string): Partial<NodeSemanticSignals> {
  const text = compactText(rawText);
  if (!text) {
    return {};
  }

  const priceSignal = detectPriceSignal(text);
  const installment = detectInstallmentSignal(text);
  const lower = text.toLowerCase();
  const hasOrderBump = /(order bump|adicionar ao pedido|bump)/i.test(lower);
  const hasUpsell = /(upsell|one click|upgrade now|eleve seu plano)/i.test(lower);
  const hasDownsell = /(downsell|oferta especial|(?:ultima|\u00faltima) chance|desconto final)/i.test(lower);
  const resolvedNodeType = classifyBaseNode("", text);

  const reasons: string[] = [];
  if (priceSignal) reasons.push("ocr:price_signal");
  if (installment) reasons.push("ocr:installment_signal");
  if (hasOrderBump || hasUpsell || hasDownsell) reasons.push("ocr:commerce_signal");
  if (resolvedNodeType !== "unknown") reasons.push(`ocr:node_type:${resolvedNodeType}`);

  return {
    ...(priceSignal ? { priceValue: priceSignal.priceValue, currency: priceSignal.currency } : {}),
    ...(installment
      ? {
          installmentCount: installment.count,
          installmentValue: installment.value,
          ...(installment.currency ? { currency: installment.currency } : {})
        }
      : {}),
    ...(hasOrderBump ? { hasOrderBump: true } : {}),
    ...(hasUpsell ? { hasUpsell: true } : {}),
    ...(hasDownsell ? { hasDownsell: true } : {}),
    ...(resolvedNodeType !== "unknown" ? { resolvedNodeType } : {}),
    reason: reasons
  };
}

export function extractHeuristicSignals(
  url: string,
  html: string,
  pageTitle: string,
  options?: SemanticExtractionOptions
): NodeSemanticSignals {
  const $ = load(html);
  const bodyText = compactText($("body").text()).slice(0, 50_000);
  const title = pageTitle || $("title").first().text().trim() || url;
  const ocrText = compactText(options?.ocrText ?? "").slice(0, 30_000);
  const baseType = classifyBaseNode(url, `${title} ${bodyText}`);
  const baseText = `${title} ${bodyText}`;
  const priceSignal = detectPriceSignal(baseText);
  const installment = detectInstallmentSignal(baseText);
  const ocrSignals = ocrText ? extractSignalsFromText(ocrText) : {};
  const cta =
    $("button, a")
      .toArray()
      .map((entry) => compactText($(entry).text()))
      .find((text) => /comprar|checkout|pagar|assinar|start|buy|plan|trial|book|register/i.test(text)) ?? null;

  const lower = `${title} ${bodyText} ${ocrText}`.toLowerCase();
  const hasOrderBump = /(order bump|adicionar ao pedido|bump)/i.test(lower);
  const hasUpsell = /(upsell|one click|upgrade now|eleve seu plano)/i.test(lower);
  const hasDownsell = /(downsell|oferta especial|(?:ultima|\u00faltima) chance|desconto final)/i.test(lower);

  let resolvedNodeType = baseType;
  const reasons: string[] = [`base:${baseType}`];

  if ((hasUpsell || hasDownsell || hasOrderBump) && resolvedNodeType !== "checkout") {
    resolvedNodeType = "upsell";
    reasons.push("commerce:upsell_signal");
  }
  if (resolvedNodeType === "unknown" && priceSignal) {
    resolvedNodeType = "product";
    reasons.push("price:product_inference");
  }
  if (resolvedNodeType === "product" && /checkout|cart|payment|finalizar/i.test(lower)) {
    resolvedNodeType = "checkout";
    reasons.push("checkout:keyword");
  }
  if (resolvedNodeType === "unknown" && ocrSignals.resolvedNodeType && ocrSignals.resolvedNodeType !== "unknown") {
    resolvedNodeType = ocrSignals.resolvedNodeType;
    reasons.push("ocr:node_type_override");
  }

  const productName =
    $("h1").first().text().trim() ||
    $("h2").first().text().trim() ||
    title ||
    null;

  const confidenceBoost = [
    priceSignal ? 0.05 : 0,
    installment ? 0.04 : 0,
    hasUpsell || hasDownsell || hasOrderBump ? 0.08 : 0,
    cta ? 0.04 : 0,
    ocrText ? 0.06 : 0
  ].reduce((sum, value) => sum + value, 0);

  mergeSignalReason(reasons, ocrSignals.reason ?? []);
  const mergedPriceValue = priceSignal?.priceValue ?? ocrSignals.priceValue ?? installment?.value ?? null;
  const mergedCurrency = priceSignal?.currency ?? ocrSignals.currency ?? installment?.currency ?? null;
  const mergedInstallmentCount = installment?.count ?? ocrSignals.installmentCount ?? null;
  const mergedInstallmentValue = installment?.value ?? ocrSignals.installmentValue ?? null;
  const mergedHasOrderBump = hasOrderBump || Boolean(ocrSignals.hasOrderBump);
  const mergedHasUpsell = hasUpsell || Boolean(ocrSignals.hasUpsell);
  const mergedHasDownsell = hasDownsell || Boolean(ocrSignals.hasDownsell);

  return {
    resolvedNodeType,
    priceValue: mergedPriceValue,
    currency: mergedCurrency,
    installmentCount: mergedInstallmentCount,
    installmentValue: mergedInstallmentValue,
    hasOrderBump: mergedHasOrderBump,
    hasUpsell: mergedHasUpsell,
    hasDownsell: mergedHasDownsell,
    productName: productName || null,
    primaryCta: cta,
    confidence: Math.min(0.95, 0.68 + confidenceBoost),
    reason: reasons
  };
}
