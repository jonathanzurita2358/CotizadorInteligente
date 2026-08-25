import type {
  MarginConfig,
  PricingConfig,
  QuoteInput,
  QuoteResult,
  RoundingConfig,
} from "@/lib/pricing/types";
import type { VisionAnalysis } from "@/lib/vision/types";

export interface QuoteSnapshot {
  version: 1;
  savedAt: string;
  currency: string;
  technique: { slug: string; name: string };
  input: QuoteInput;
  config: PricingConfig;
  margins: MarginConfig;
  rounding: RoundingConfig;
  result: QuoteResult;
  visionAnalysis: VisionAnalysis | null;
}
