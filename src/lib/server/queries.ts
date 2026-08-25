import { db } from "@/lib/db";
import type {
  MarginConfig,
  PricingConfig,
  RoundingConfig,
} from "@/lib/pricing/types";

export const DEFAULT_MARGINS: MarginConfig = {
  minimumPct: 35,
  recommendedPct: 60,
  premiumPct: 90,
};

export const DEFAULT_ROUNDING: RoundingConfig = {
  mode: "up",
  step: 0.25,
};

export async function getGlobalSettings(): Promise<{
  currency: string;
  margins: MarginConfig;
  rounding: RoundingConfig;
}> {
  const row = await db.globalSettings.findUnique({ where: { id: "singleton" } });
  return {
    currency: row?.currency ?? "USD",
    margins: (row?.margins as unknown as MarginConfig) ?? DEFAULT_MARGINS,
    rounding: (row?.rounding as unknown as RoundingConfig) ?? DEFAULT_ROUNDING,
  };
}

export async function listTechniques(activeOnly = true) {
  return db.technique.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getTechniqueBySlug(slug: string) {
  return db.technique.findUnique({ where: { slug } });
}

export function parseTechniqueConfig(raw: unknown): PricingConfig {
  return raw as unknown as PricingConfig;
}

export async function nextFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.quote.count();
  return `COT-${year}-${String(count + 1).padStart(4, "0")}`;
}
