import { describe, expect, it } from "vitest";
import { applyRounding, round2 } from "@/lib/pricing/rounding";

describe("applyRounding", () => {
  it("modo up con paso 0.10 redondea hacia arriba al siguiente decena de centavos", () => {
    expect(applyRounding(21.73, { mode: "up", step: 0.1 })).toBe(21.8);
    expect(applyRounding(21.701, { mode: "up", step: 0.1 })).toBe(21.8);
  });

  it("modo up con paso 1.00 redondea al peso siguiente", () => {
    expect(applyRounding(21.73, { mode: "up", step: 1 })).toBe(22);
    expect(applyRounding(22, { mode: "up", step: 1 })).toBe(22);
  });

  it("modo nearest con paso 0.50 redondea al medio más cercano", () => {
    expect(applyRounding(21.73, { mode: "nearest", step: 0.5 })).toBe(21.5);
    expect(applyRounding(21.80, { mode: "nearest", step: 0.5 })).toBe(22);
  });

  it("modo none solo normaliza a dos decimales", () => {
    expect(applyRounding(21.734, { mode: "none", step: 0 })).toBe(21.73);
  });
});

describe("round2", () => {
  it("mitiga errores de punto flotante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
  });
});
