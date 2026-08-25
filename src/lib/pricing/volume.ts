import type { VolumeDiscountTier } from "./types";

export function resolveVolumeDiscount(
  quantity: number,
  tiers: VolumeDiscountTier[],
): number {
  const applicable = tiers
    .filter((t) => quantity >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty);
  return applicable.length > 0 ? applicable[0].discountPercent : 0;
}
