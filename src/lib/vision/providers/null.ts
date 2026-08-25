import { VisionUnavailableError, type VisionAnalysis, type VisionInput, type VisionProvider } from "../types";

export class NullVisionProvider implements VisionProvider {
  readonly name = "manual";

  isConfigured(): boolean {
    return false;
  }

  async analyze(_input: VisionInput): Promise<VisionAnalysis> {
    throw new VisionUnavailableError(this.name);
  }
}
