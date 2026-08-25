import { env } from "@/lib/env";
import { GeminiVisionProvider } from "./providers/gemini";
import { NullVisionProvider } from "./providers/null";
import { OllamaVisionProvider } from "./providers/ollama";
import { OpenAIVisionProvider } from "./providers/openai";
import type { VisionProvider } from "./types";

export function getVisionProvider(): VisionProvider {
  const explicit = env.VISION_PROVIDER;

  if (explicit === "openai" && env.OPENAI_API_KEY) {
    return new OpenAIVisionProvider(env.OPENAI_API_KEY, env.OPENAI_VISION_MODEL);
  }
  if (explicit === "gemini" && env.GEMINI_API_KEY) {
    return new GeminiVisionProvider(env.GEMINI_API_KEY, env.GEMINI_VISION_MODEL);
  }
  if (explicit === "ollama" && env.OLLAMA_BASE_URL) {
    return new OllamaVisionProvider(env.OLLAMA_BASE_URL, env.OLLAMA_VISION_MODEL);
  }

  if (explicit === "none") return new NullVisionProvider();

  if (env.OPENAI_API_KEY) {
    return new OpenAIVisionProvider(env.OPENAI_API_KEY, env.OPENAI_VISION_MODEL);
  }
  if (env.GEMINI_API_KEY) {
    return new GeminiVisionProvider(env.GEMINI_API_KEY, env.GEMINI_VISION_MODEL);
  }
  if (env.OLLAMA_BASE_URL) {
    return new OllamaVisionProvider(env.OLLAMA_BASE_URL, env.OLLAMA_VISION_MODEL);
  }

  return new NullVisionProvider();
}

export function visionStatus(): { provider: string; available: boolean } {
  const provider = getVisionProvider();
  return { provider: provider.name, available: provider.isConfigured() };
}
