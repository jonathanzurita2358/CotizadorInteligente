import { VISION_SYSTEM_PROMPT } from "../prompts";
import { VisionUnavailableError, type VisionAnalysis, type VisionInput, type VisionProvider } from "../types";
import { extractJsonFromText, parseVisionAnalysis } from "../validate";

export class OllamaVisionProvider implements VisionProvider {
  readonly name = "ollama";

  constructor(
    private readonly baseUrl: string,
    private readonly model: string = "llava",
  ) {}

  isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  async analyze(input: VisionInput): Promise<VisionAnalysis> {
    if (!this.isConfigured()) throw new VisionUnavailableError(this.name);

    const base = this.baseUrl.replace(/\/+$/, "");
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: "Analiza esta imagen para cotización.",
            images: [input.base64],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama respondió ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return parseVisionAnalysis(extractJsonFromText(data.message?.content ?? ""));
  }
}
