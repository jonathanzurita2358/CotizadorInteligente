function readEnv(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

export const env = {
  get VISION_PROVIDER(): string {
    return (readEnv("VISION_PROVIDER") || "auto").toLowerCase();
  },
  get OPENAI_API_KEY(): string {
    return readEnv("OPENAI_API_KEY");
  },
  get OPENAI_VISION_MODEL(): string {
    return readEnv("OPENAI_VISION_MODEL") || "gpt-4o-mini";
  },
  get GEMINI_API_KEY(): string {
    return readEnv("GEMINI_API_KEY");
  },
  get GEMINI_VISION_MODEL(): string {
    return readEnv("GEMINI_VISION_MODEL") || "gemini-2.0-flash";
  },
  get OLLAMA_BASE_URL(): string {
    return readEnv("OLLAMA_BASE_URL");
  },
  get OLLAMA_VISION_MODEL(): string {
    return readEnv("OLLAMA_VISION_MODEL") || "llava";
  },
};
