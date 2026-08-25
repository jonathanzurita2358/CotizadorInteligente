import { VISION_SYSTEM_PROMPT } from "../prompts";
import { VisionUnavailableError, type VisionAnalysis, type VisionInput, type VisionProvider } from "../types";
import { parseVisionAnalysis } from "../validate";

export class GeminiVisionProvider implements VisionProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gemini-2.0-flash",
  ) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async analyze(input: VisionInput): Promise<VisionAnalysis> {
    if (!this.isConfigured()) throw new VisionUnavailableError(this.name);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: VISION_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: "Analiza esta imagen para cotización." },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: input.base64,
                },
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini respondió ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return parseVisionAnalysis(JSON.parse(text));
  }
}
