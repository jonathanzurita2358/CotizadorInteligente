import type {
  MarginConfig,
  PricingConfig,
  RoundingConfig,
} from "@/lib/pricing/types";

export interface TechniqueDTO {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  config: PricingConfig;
}

export interface SettingsDTO {
  currency: string;
  margins: MarginConfig;
  rounding: RoundingConfig;
}

export interface VisionStatusDTO {
  provider: string;
  available: boolean;
}
