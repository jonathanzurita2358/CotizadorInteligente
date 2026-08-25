export interface PrepOption {
  id: string;
  label: string;
  cost: number;
}

export interface VolumeDiscountTier {
  minQty: number;
  discountPercent: number;
}

export interface ExtraSecondsConfig {
  costPerSecond: number;
  includedSeconds: number;
}

export interface PricingConfig {
  machineCostPerMinute: number;
  electricityKw: number;
  costPerKwh: number;
  laborRatePerHour: number;
  laborMinutes: number;
  maintenanceMonthlyCost: number;
  maintenanceMonthlyHours: number;
  wastePercentOverMaterials: number;
  prepOptions: PrepOption[];
  extraSeconds: ExtraSecondsConfig;
  volumeDiscounts: VolumeDiscountTier[];
}

export interface MarginConfig {
  minimumPct: number;
  recommendedPct: number;
  premiumPct: number;
}

export type RoundingMode = "none" | "up" | "nearest";

export interface RoundingConfig {
  mode: RoundingMode;
  step: number;
}

export interface QuoteInput {
  baseProductCost: number;
  prepOptionId: string;
  machineMinutes: number;
  totalEngravedSeconds: number;
  quantity: number;
}

export interface MachineCostLine {
  minutes: number;
  costPerMinute: number;
  total: number;
}

export interface PreparationCostLine {
  optionId: string;
  label: string;
  total: number;
}

export interface OperationalCostLines {
  electricity: { kw: number; kwhUsed: number; costPerKwh: number; total: number };
  labor: { minutes: number; ratePerHour: number; total: number };
  maintenance: { monthlyCost: number; monthlyHours: number; total: number };
  waste: { percentOverMaterials: number; appliedOver: number; total: number };
  total: number;
}

export interface ExtraEngravingCostLine {
  totalSeconds: number;
  includedSeconds: number;
  extraSeconds: number;
  costPerSecond: number;
  total: number;
}

export interface CostBreakdown {
  productBase: number;
  machine: MachineCostLine;
  preparation: PreparationCostLine;
  operational: OperationalCostLines;
  extraEngraving: ExtraEngravingCostLine;
  realTotal: number;
}

export type PriceTierLabel = "minimum" | "recommended" | "premium";

export interface PricePoint {
  label: PriceTierLabel;
  marginPct: number;
  rawUnitPrice: number;
  volumeDiscountPercent: number;
  roundedUnitPrice: number;
}

export interface QuoteTotals {
  minimum: number;
  recommended: number;
  premium: number;
}

export interface QuoteResult {
  quantity: number;
  cost: CostBreakdown;
  prices: Record<PriceTierLabel, PricePoint>;
  volumeDiscountPercent: number;
  totals: QuoteTotals;
}

export class PricingError extends Error {}
