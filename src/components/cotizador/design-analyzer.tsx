"use client";

import { useState } from "react";
import type { VisionAnalysis } from "@/lib/vision/types";
import type { VisionStatusDTO } from "@/lib/client-types";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui/primitives";

interface DesignAnalyzerProps {
  visionStatus: VisionStatusDTO | null;
  analysis: VisionAnalysis | null;
  onAnalysisChange: (analysis: VisionAnalysis | null) => void;
  onApplySuggestion: (analysis: VisionAnalysis) => void;
}

export function DesignAnalyzer({
  visionStatus,
  analysis,
  onAnalysisChange,
  onApplySuggestion,
}: DesignAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiAvailable = visionStatus?.available ?? false;

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/vision/analyze", { method: "POST", body: formData });
      const data = (await response.json()) as {
        available?: boolean;
        analysis?: VisionAnalysis;
        error?: string;
        message?: string;
      };
      if (data.analysis && data.available) {
        onAnalysisChange(data.analysis);
      } else if (data.error || data.message) {
        setError(data.error ?? data.message ?? null);
        onAnalysisChange(null);
      }
    } catch {
      setError("No se pudo analizar la imagen. Usa el modo manual.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Análisis del diseño"
        subtitle="Sugerencias editables — la IA nunca fija precios ni decisiones"
        action={
          <Badge tone={aiAvailable ? "green" : "amber"}>
            {aiAvailable ? `IA: ${visionStatus?.provider}` : "Modo manual"}
          </Badge>
        }
      />
      <CardBody className="space-y-3">
        {!aiAvailable && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No hay proveedor de visión configurado. El sistema funciona igual:
            selecciona manualmente el tipo de preparación y los datos del diseño.
            Puedes activar IA en <code className="rounded bg-amber-100 px-1">.env</code>.
          </p>
        )}

        {aiAvailable && (
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="block w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-red-50 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-red-700"
            />
            {loading && <p className="mt-2 text-xs text-slate-500">Analizando imagen…</p>}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        )}

        {analysis ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="blue">{analysis.category}</Badge>
              <Badge>complejidad: {analysis.complexity}</Badge>
              <Badge>{analysis.element_count_approx} elementos</Badge>
              <Badge>detalle {analysis.detail_level}/5</Badge>
              <Badge tone={analysis.confidence >= 0.7 ? "green" : "amber"}>
                confianza {(analysis.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
              <Flag label="Contiene texto" value={analysis.contains_text} />
              <Flag label="Ilustración" value={analysis.contains_illustration} />
              <Flag label="Retrato" value={analysis.contains_portrait} />
              <Flag label="Logo" value={analysis.contains_logo} />
              <Flag label="Requiere vectorizar" value={analysis.requires_vectorization} />
              <Flag label="Requiere limpieza" value={analysis.requires_cleanup} />
            </ul>
            {analysis.recommendation && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-600">
                “{analysis.recommendation}”
              </p>
            )}
            <Button variant="secondary" onClick={() => onApplySuggestion(analysis)}>
              Aplicar sugerencia al cálculo
            </Button>
          </div>
        ) : (
          !aiAvailable && (
            <p className="text-xs text-slate-500">
              Selecciona abajo la preparación que consideres y ajusta los segundos de
              grabado estimados.
            </p>
          )
        )}
      </CardBody>
    </Card>
  );
}

function Flag({ label, value }: { label: string; value: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${value ? "bg-emerald-500" : "bg-slate-300"}`} />
      {label}
    </li>
  );
}
