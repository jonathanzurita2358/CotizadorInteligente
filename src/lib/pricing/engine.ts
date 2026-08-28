import { applyRounding, round2 } from "./rounding";
import { resolveVolumeDiscount } from "./volume";
import {
  PricingError,
  type CostBreakdown,
  type EngravingDimensions,
  type MarginConfig,
  type PricePoint,
  type PriceTierLabel,
  type PricingConfig,
  type QuoteInput,
  type QuoteResult,
  type RoundingConfig,
} from "./types";

/** Velocidad de máquina por defecto (segundos por cm²) si la técnica no la define. */
export const DEFAULT_SECONDS_PER_CM2 = 15;

function assertNonNegative(value: number, field: string): void {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new PricingError(`El campo "${field}" debe ser un número mayor o igual a 0.`);
  }
}

/** Calcula los segundos de grabado estimados a partir del área (mm²) y la velocidad (s por cm²). */
export function estimateEngravingSeconds(
  widthMm: number,
  heightMm: number,
  secondsPerCm2: number,
): { areaMm2: number; areaCm2: number; estimatedSeconds: number } {
  const areaMm2 = widthMm * heightMm;
  const areaCm2 = areaMm2 / 100;
  const estimatedSeconds = areaCm2 * secondsPerCm2;
  return { areaMm2, areaCm2, estimatedSeconds };
}

function findPrepOption(config: PricingConfig, prepOptionId: string) {
  const option = config.prepOptions.find((p) => p.id === prepOptionId);
  if (!option) {
    throw new PricingError(
      `Tipo de preparación "${prepOptionId}" no existe en la configuración de la técnica.`,
    );
  }
  return option;
}

function buildPricePoint(
  label: PriceTierLabel,
  marginPct: number,
  realTotal: number,
  volumeDiscountPercent: number,
  rounding: RoundingConfig,
): PricePoint {
  assertNonNegative(marginPct, `margen ${label}`);
  const rawUnitPrice = realTotal * (1 + marginPct / 100);
  const discountedUnitPrice = rawUnitPrice * (1 - volumeDiscountPercent / 100);
  const roundedUnitPrice = applyRounding(discountedUnitPrice, rounding);
  return {
    label,
    marginPct,
    rawUnitPrice: round2(rawUnitPrice),
    volumeDiscountPercent,
    roundedUnitPrice,
  };
}

export function calculateQuote(
  input: QuoteInput,
  config: PricingConfig,
  margins: MarginConfig,
  rounding: RoundingConfig,
): QuoteResult {
  assertNonNegative(input.baseProductCost, "costo del producto base");
  assertNonNegative(input.machineMinutes, "tiempo de máquina");
  assertNonNegative(input.totalEngravedSeconds, "segundos de grabado");
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new PricingError("La cantidad debe ser un entero mayor o igual a 1.");
  }
  if (input.widthMm !== undefined) assertNonNegative(input.widthMm, "ancho del grabado (mm)");
  if (input.heightMm !== undefined) assertNonNegative(input.heightMm, "alto del grabado (mm)");

  const prepOption = findPrepOption(config, input.prepOptionId);

  const secondsPerCm2 =
    config.secondsPerCm2 !== undefined && config.secondsPerCm2 > 0
      ? config.secondsPerCm2
      : DEFAULT_SECONDS_PER_CM2;

  const includedSeconds = config.extraSeconds.includedSeconds;

  const hasDimensions =
    input.widthMm !== undefined && input.heightMm !== undefined;

  let dimensions: EngravingDimensions | undefined;
  let machineMinutes = input.machineMinutes;
  // En el camino sin dimensiones, el grabado extra se cobra por segundo.
  let extraSeconds = 0;
  let engravedSeconds = input.totalEngravedSeconds;
  let machineBasedEngraving = false;

  if (hasDimensions) {
    const { areaMm2, areaCm2, estimatedSeconds } = estimateEngravingSeconds(
      input.widthMm as number,
      input.heightMm as number,
      secondsPerCm2,
    );
    const chargeableSeconds = Math.max(0, estimatedSeconds - includedSeconds);
    dimensions = {
      widthMm: input.widthMm as number,
      heightMm: input.heightMm as number,
      areaMm2: round2(areaMm2),
      areaCm2: round2(areaCm2),
      estimatedSeconds,
      secondsPerCm2,
      includedSeconds,
      chargeableSeconds,
      chargeableMinutes: chargeableSeconds / 60,
    };
    engravedSeconds = estimatedSeconds;
    // El tiempo sobrante (tras los incluidos) se convierte en minutos de máquina cobrables.
    machineMinutes = input.machineMinutes + chargeableSeconds / 60;
    machineBasedEngraving = true;
  }

  const productBase = round2(input.baseProductCost);

  const machineTotal = machineMinutes * config.machineCostPerMinute;

  const kwhUsed = config.electricityKw * (machineMinutes / 60);
  const electricityTotal = kwhUsed * config.costPerKwh;

  const laborTotal = config.laborRatePerHour * (config.laborMinutes / 60);

  const maintenancePerHour =
    config.maintenanceMonthlyHours > 0
      ? config.maintenanceMonthlyCost / config.maintenanceMonthlyHours
      : 0;
  const maintenanceTotal = maintenancePerHour * (machineMinutes / 60);

  const wasteBase = productBase;
  const wasteTotal = wasteBase * (config.wastePercentOverMaterials / 100);

  if (!machineBasedEngraving) {
    extraSeconds = Math.max(0, input.totalEngravedSeconds - includedSeconds);
  }
  const extraEngravingTotal =
    machineBasedEngraving ? 0 : extraSeconds * config.extraSeconds.costPerSecond;

  const operationalTotal =
    electricityTotal + laborTotal + maintenanceTotal + wasteTotal;

  const realTotalUnrounded =
    input.baseProductCost +
    machineTotal +
    prepOption.cost +
    operationalTotal +
    extraEngravingTotal;

  const realTotal = round2(realTotalUnrounded);

  const cost: CostBreakdown = {
    productBase,
    machine: {
      minutes: machineMinutes,
      costPerMinute: config.machineCostPerMinute,
      total: round2(machineTotal),
    },
    preparation: {
      optionId: prepOption.id,
      label: prepOption.label,
      total: round2(prepOption.cost),
    },
    operational: {
      electricity: {
        kw: config.electricityKw,
        kwhUsed: round2(kwhUsed),
        costPerKwh: config.costPerKwh,
        total: round2(electricityTotal),
      },
      labor: {
        minutes: config.laborMinutes,
        ratePerHour: config.laborRatePerHour,
        total: round2(laborTotal),
      },
      maintenance: {
        monthlyCost: config.maintenanceMonthlyCost,
        monthlyHours: config.maintenanceMonthlyHours,
        total: round2(maintenanceTotal),
      },
      waste: {
        percentOverMaterials: config.wastePercentOverMaterials,
        appliedOver: wasteBase,
        total: round2(wasteTotal),
      },
      total: round2(operationalTotal),
    },
    extraEngraving: {
      totalSeconds: engravedSeconds,
      includedSeconds,
      extraSeconds,
      costPerSecond: config.extraSeconds.costPerSecond,
      total: round2(extraEngravingTotal),
    },
    realTotal,
  };

  const volumeDiscountPercent = resolveVolumeDiscount(
    input.quantity,
    config.volumeDiscounts ?? [],
  );

  const prices = {
    minimum: buildPricePoint("minimum", margins.minimumPct, realTotal, volumeDiscountPercent, rounding),
    recommended: buildPricePoint("recommended", margins.recommendedPct, realTotal, volumeDiscountPercent, rounding),
    premium: buildPricePoint("premium", margins.premiumPct, realTotal, volumeDiscountPercent, rounding),
  };

  return {
    quantity: input.quantity,
    cost,
    prices,
    volumeDiscountPercent,
    dimensions,
    totals: {
      minimum: round2(prices.minimum.roundedUnitPrice * input.quantity),
      recommended: round2(prices.recommended.roundedUnitPrice * input.quantity),
      premium: round2(prices.premium.roundedUnitPrice * input.quantity),
    },
  };
}
