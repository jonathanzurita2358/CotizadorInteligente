import type { RoundingConfig } from "./types";

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function stepDecimals(step: number): number {
  const str = String(step);
  const dot = str.indexOf(".");
  return dot === -1 ? 0 : str.length - dot - 1;
}

export function applyRounding(value: number, config: RoundingConfig): number {
  if (config.mode === "none" || !config.step || config.step <= 0) {
    return round2(value);
  }
  const d = stepDecimals(config.step);
  if (config.mode === "up") {
    return Number((Math.ceil(value / config.step) * config.step).toFixed(d));
  }
  return Number((Math.round(value / config.step) * config.step).toFixed(d));
}
