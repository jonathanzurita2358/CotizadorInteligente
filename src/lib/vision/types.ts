export type DesignComplexity = "low" | "medium" | "high";

export interface VisionAnalysis {
  category: string;
  complexity: DesignComplexity;
  contains_text: boolean;
  contains_illustration: boolean;
  contains_portrait: boolean;
  contains_logo: boolean;
  element_count_approx: number;
  detail_level: number;
  recommendation: string;
  requires_vectorization: boolean;
  requires_cleanup: boolean;
  confidence: number;
}

export interface VisionInput {
  base64: string;
  mimeType: string;
}

export interface VisionProvider {
  readonly name: string;
  isConfigured(): boolean;
  analyze(input: VisionInput): Promise<VisionAnalysis>;
}

export class VisionUnavailableError extends Error {
  constructor(providerName: string) {
    super(`El proveedor de visión "${providerName}" no está configurado.`);
    this.name = "VisionUnavailableError";
  }
}
