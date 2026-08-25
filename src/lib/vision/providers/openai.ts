import { VISION_SYSTEM_PROMPT } from "../prompts";
import { VisionUnavailableError, type VisionAnalysis, type VisionInput, type VisionProvider } from "../types";
import { extractJsonFromText, parseVisionAnalysis } from "../validate";

export class OpenAIVisionProvider implements VisionProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gpt-4o-mini",
  ) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async analyze(input: VisionInput): Promise<VisionAnalysis> {
    if (!this.isConfigured()) throw new VisionUnavailableError(this.name);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analiza esta imagen para cotización." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${input.base64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI respondió ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return parseVisionAnalysis(extractJsonFromText(content));
  }
}
