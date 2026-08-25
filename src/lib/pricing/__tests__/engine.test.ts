import { describe, expect, it } from "vitest";
import { calculateQuote } from "@/lib/pricing/engine";
import { PricingError } from "@/lib/pricing/types";
import type {
  MarginConfig,
  PricingConfig,
  QuoteInput,
  RoundingConfig,
} from "@/lib/pricing/types";

export const fixtureConfig: PricingConfig = {
  machineCostPerMinute: 2.5,
  electricityKw: 0.9,
  costPerKwh: 3.2,
  laborRatePerHour: 60,
  laborMinutes: 5,
  maintenanceMonthlyCost: 480,
  maintenanceMonthlyHours: 160,
  wastePercentOverMaterials: 10,
  prepOptions: [
    { id: "ready_file", label: "Archivo listo", cost: 0 },
    { id: "cleanup", label: "Limpieza", cost: 15 },
  ],
  extraSeconds: { costPerSecond: 0.1, includedSeconds: 60 },
  volumeDiscounts: [
    { minQty: 10, discountPercent: 5 },
    { minQty: 25, discountPercent: 10 },
  ],
};

export const fixtureMargins: MarginConfig = {
  minimumPct: 30,
  recommendedPct: 55,
  premiumPct: 85,
};

export const fixtureRounding: RoundingConfig = { mode: "up", step: 1 };

const baseInput: QuoteInput = {
  baseProductCost: 20,
  prepOptionId: "ready_file",
  machineMinutes: 30,
  totalEngravedSeconds: 90,
  quantity: 1,
};

describe("calculateQuote — desglose de costo real", () => {
  it("calcula cada partida correctamente", () => {
    const result = calculateQuote(baseInput, fixtureConfig, fixtureMargins, fixtureRounding);

    expect(result.cost.productBase).toBe(20);
    expect(result.cost.machine).toEqual({
      minutes: 30,
      costPerMinute: 2.5,
      total: 75,
    });
    expect(result.cost.operational.electricity.kwhUsed).toBe(0.45);
    expect(result.cost.operational.electricity.total).toBe(1.44);
    expect(result.cost.operational.labor.total).toBe(5);
    expect(result.cost.operational.maintenance.total).toBe(1.5);
    expect(result.cost.operational.waste.appliedOver).toBe(20);
    expect(result.cost.operational.waste.total).toBe(2);
    expect(result.cost.extraEngraving.extraSeconds).toBe(30);
    expect(result.cost.extraEngraving.total).toBe(3);
    expect(result.cost.realTotal).toBe(107.94);
  });

  it("aplica el costo de preparación elegido y lo reporta con su etiqueta", () => {
    const result = calculateQuote(
      { ...baseInput, prepOptionId: "cleanup" },
      fixtureConfig,
      fixtureMargins,
      fixtureRounding,
    );
    expect(result.cost.preparation.optionId).toBe("cleanup");
    expect(result.cost.preparation.total).toBe(15);
  });

  it("archivo listo cuesta $0 de preparación", () => {
    const result = calculateQuote(baseInput, fixtureConfig, fixtureMargins, fixtureRounding);
    expect(result.cost.preparation.total).toBe(0);
  });

  it("no cobra segundos extra por debajo del tiempo incluido", () => {
    const result = calculateQuote(
      { ...baseInput, totalEngravedSeconds: 60 },
      fixtureConfig,
      fixtureMargins,
      fixtureRounding,
    );
    expect(result.cost.extraEngraving.extraSeconds).toBe(0);
    expect(result.cost.extraEngraving.total).toBe(0);
  });

  it("cobra solo los segundos que exceden el tiempo incluido", () => {
    const result = calculateQuote(
      { ...baseInput, totalEngravedSeconds: 63 },
      fixtureConfig,
      fixtureMargins,
      fixtureRounding,
    );
    expect(result.cost.extraEngraving.extraSeconds).toBe(3);
    expect(result.cost.extraEngraving.total).toBeCloseTo(0.3, 6);
  });

  it("maneja horas mensuales de mantenimiento en cero sin dividir entre cero", () => {
    const result = calculateQuote(
      baseInput,
      { ...fixtureConfig, maintenanceMonthlyHours: 0 },
      fixtureMargins,
      fixtureRounding,
    );
    expect(result.cost.operational.maintenance.total).toBe(0);
  });

  it("rechaza preparación inexistente en la configuración", () => {
    expect(() =>
      calculateQuote(
        { ...baseInput, prepOptionId: "fantasma" },
        fixtureConfig,
        fixtureMargins,
        fixtureRounding,
      ),
    ).toThrow(PricingError);
  });

  it.each([
    ["costo del producto base", { ...baseInput, baseProductCost: -1 }],
    ["tiempo de máquina", { ...baseInput, machineMinutes: -5 }],
    ["segundos de grabado", { ...baseInput, totalEngravedSeconds: -1 }],
  ])("rechaza valores negativos (%s)", (_field, input) => {
    expect(() =>
      calculateQuote(input as QuoteInput, fixtureConfig, fixtureMargins, fixtureRounding),
    ).toThrow(PricingError);
  });

  it("rechaza cantidad menor a 1 o no entera", () => {
    expect(() =>
      calculateQuote({ ...baseInput, quantity: 0 }, fixtureConfig, fixtureMargins, fixtureRounding),
    ).toThrow(PricingError);
    expect(() =>
      calculateQuote({ ...baseInput, quantity: 2.5 }, fixtureConfig, fixtureMargins, fixtureRounding),
    ).toThrow(PricingError);
  });
});

describe("calculateQuote — precios de venta", () => {
  it("aplica márgenes sobre el costo real y redondea hacia arriba al paso configurado", () => {
    const result = calculateQuote(baseInput, fixtureConfig, fixtureMargins, fixtureRounding);

    expect(result.prices.minimum.rawUnitPrice).toBe(140.32);
    expect(result.prices.recommended.rawUnitPrice).toBe(167.31);
    expect(result.prices.premium.rawUnitPrice).toBe(199.69);

    expect(result.prices.minimum.roundedUnitPrice).toBe(141);
    expect(result.prices.recommended.roundedUnitPrice).toBe(168);
    expect(result.prices.premium.roundedUnitPrice).toBe(200);

    expect(result.totals.minimum).toBe(141);
    expect(result.totals.recommended).toBe(168);
    expect(result.totals.premium).toBe(200);
  });

  it("mantiene el orden mínimo <= recomendado <= premium aun tras redondeo", () => {
    const result = calculateQuote(
      { ...baseInput, quantity: 40 },
      fixtureConfig,
      fixtureMargins,
      fixtureRounding,
    );
    expect(result.prices.minimum.roundedUnitPrice).toBeLessThanOrEqual(
      result.prices.recommended.roundedUnitPrice,
    );
    expect(result.prices.recommended.roundedUnitPrice).toBeLessThanOrEqual(
      result.prices.premium.roundedUnitPrice,
    );
  });
});

describe("calculateQuote — escalado por cantidad", () => {
  it("sin descuento cuando la cantidad no alcanza ningún nivel", () => {
    const result = calculateQuote(
      { ...baseInput, quantity: 9 },
      fixtureConfig,
      fixtureMargins,
      fixtureRounding,
    );
    expect(result.volumeDiscountPercent).toBe(0);
  });

  it("aplica el descuento del nivel alcanzado antes del redondeo", () => {
    const input: QuoteInput = {
      baseProductCost: 100,
      prepOptionId: "cleanup",
      machineMinutes: 0,
      totalEngravedSeconds: 0,
      quantity: 25,
    };
    const result = calculateQuote(input, fixtureConfig, fixtureMargins, fixtureRounding);

    expect(result.cost.realTotal).toBe(130);
    expect(result.volumeDiscountPercent).toBe(10);
    expect(result.prices.recommended.rawUnitPrice).toBe(201.5);
    expect(result.prices.recommended.roundedUnitPrice).toBe(182);
    expect(result.totals.recommended).toBe(4550);
  });
});

describe("inmutabilidad", () => {
  it("no muta entradas profundamente congeladas ni falla al operar sobre ellas", () => {
    const config = deepFreeze(structuredClone(fixtureConfig));
    const margins = deepFreeze(structuredClone(fixtureMargins));
    const rounding = deepFreeze(structuredClone(fixtureRounding));
    const input = deepFreeze(structuredClone(baseInput));

    const result = calculateQuote(input, config, margins, rounding);

    expect(result.cost.realTotal).toBe(107.94);
    expect(config.prepOptions[0].cost).toBe(0);
    expect(input.baseProductCost).toBe(20);
  });
});

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    Object.values(obj as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(obj);
  }
  return obj;
}
