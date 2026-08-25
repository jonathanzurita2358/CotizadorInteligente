import { describe, expect, it } from "vitest";
import { resolveVolumeDiscount } from "@/lib/pricing/volume";

const tiers = [
  { minQty: 10, discountPercent: 5 },
  { minQty: 25, discountPercent: 10 },
  { minQty: 50, discountPercent: 15 },
];

describe("resolveVolumeDiscount", () => {
  it("retorna 0 sin niveles configurados", () => {
    expect(resolveVolumeDiscount(100, [])).toBe(0);
  });

  it("retorna 0 por debajo del primer nivel", () => {
    expect(resolveVolumeDiscount(9, tiers)).toBe(0);
  });

  it("aplica el nivel exacto alcanzado (límite inclusivo)", () => {
    expect(resolveVolumeDiscount(10, tiers)).toBe(5);
    expect(resolveVolumeDiscount(25, tiers)).toBe(10);
    expect(resolveVolumeDiscount(50, tiers)).toBe(15);
  });

  it("aplica siempre el nivel más alto alcanzado aunque la lista venga desordenada", () => {
    const unordered = [tiers[2], tiers[0], tiers[1]];
    expect(resolveVolumeDiscount(60, unordered)).toBe(15);
  });
});
