import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyBaseNode,
  detectInstallmentSignal,
  detectPriceSignal,
  extractHeuristicSignals,
  normalizePrice
} from "./semantic-extraction.js";

test("normalizePrice should support BR format", () => {
  assert.equal(normalizePrice("1.297,90"), 1297.9);
  assert.equal(normalizePrice("297,00"), 297);
});

test("detectPriceSignal should parse major currencies", () => {
  assert.deepEqual(detectPriceSignal("Oferta especial R$ 497,00"), { priceValue: 497, currency: "BRL" });
  assert.deepEqual(detectPriceSignal("Only $ 99.90 today"), { priceValue: 99.9, currency: "USD" });
});

test("detectInstallmentSignal should parse installment count and value", () => {
  assert.deepEqual(detectInstallmentSignal("12x de R$ 97,00"), { count: 12, value: 97, currency: "BRL" });
});

test("classifyBaseNode should detect checkout text", () => {
  assert.equal(classifyBaseNode("https://example.com/checkout", "Finalizar compra agora"), "checkout");
});

test("extractHeuristicSignals should identify upsell/downsell and cta", () => {
  const html = `
    <html>
      <body>
        <h1>Oferta Especial</h1>
        <p>Downsell com ultima chance e desconto final.</p>
        <p>Aproveite por apenas R$ 297,00.</p>
        <button>Comprar Agora</button>
      </body>
    </html>
  `;
  const signals = extractHeuristicSignals("https://acme.com/oferta", html, "Oferta Especial");

  assert.equal(signals.resolvedNodeType, "upsell");
  assert.equal(signals.hasDownsell, true);
  assert.equal(signals.priceValue, 297);
  assert.equal(signals.currency, "BRL");
  assert.equal(signals.primaryCta, "Comprar Agora");
  assert.ok(signals.confidence >= 0.8);
});

test("extractHeuristicSignals should infer checkout from payment context", () => {
  const html = `
    <html>
      <body>
        <h1>Plano Premium</h1>
        <p>Pagamento em 10x de R$ 49,90 no checkout seguro.</p>
        <a>Ir para Checkout</a>
      </body>
    </html>
  `;
  const signals = extractHeuristicSignals("https://acme.com/pricing", html, "Plano Premium");

  assert.equal(signals.resolvedNodeType, "checkout");
  assert.equal(signals.installmentCount, 10);
  assert.equal(signals.installmentValue, 49.9);
  assert.equal(signals.currency, "BRL");
});

test("extractHeuristicSignals should use optional OCR text when html has no readable price", () => {
  const html = `
    <html>
      <body>
        <h1>Oferta em imagem</h1>
        <p>Veja o criativo para detalhes.</p>
      </body>
    </html>
  `;
  const signals = extractHeuristicSignals("https://acme.com/oferta-imagem", html, "Oferta em imagem", {
    ocrText: "Somente hoje: R$ 197,00 em 4x de R$ 49,25. Upgrade now."
  });

  assert.equal(signals.priceValue, 197);
  assert.equal(signals.currency, "BRL");
  assert.equal(signals.installmentCount, 4);
  assert.equal(signals.installmentValue, 49.25);
  assert.equal(signals.hasUpsell, true);
  assert.ok(signals.reason.some((value) => value.startsWith("ocr:")));
});
