import type { VisionAnalysis } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boolOr(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numClamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function parseVisionAnalysis(raw: unknown): VisionAnalysis {
  const obj = asRecord(raw);
  const inner = obj !== null && typeof obj.analysis === "object" ? asRecord(obj.analysis) : obj;
  if (!inner) throw new Error("La respuesta de visión no es un objeto válido.");

  const complexityRaw = String(inner.complexity ?? "").toLowerCase();
  const complexity =
    complexityRaw === "low" || complexityRaw === "high"
      ? complexityRaw
      : complexityRaw === "medium"
        ? "medium"
        : "medium";

  return {
    category: typeof inner.category === "string" ? inner.category : "unknown",
    complexity,
    contains_text: boolOr(inner.contains_text),
    contains_illustration: boolOr(inner.contains_illustration),
    contains_portrait: boolOr(inner.contains_portrait),
    contains_logo: boolOr(inner.contains_logo),
    element_count_approx: Math.round(numClamp(inner.element_count_approx, 0, 10_000, 1)),
    detail_level: Math.round(numClamp(inner.detail_level, 1, 5, 3)),
    recommendation:
      typeof inner.recommendation === "string" ? inner.recommendation : "",
    requires_vectorization: boolOr(inner.requires_vectorization),
    requires_cleanup: boolOr(inner.requires_cleanup),
    confidence: numClamp(inner.confidence, 0, 1, 0),
  };
}

export function extractJsonFromText(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.search(/[[{]/);
  const parsed = start >= 0 ? JSON.parse(candidate.slice(start)) : JSON.parse(candidate);
  return parsed;
}
