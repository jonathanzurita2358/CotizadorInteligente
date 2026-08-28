"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuote } from "@/lib/pricing";
import type { QuoteResult } from "@/lib/pricing/types";
import type { VisionAnalysis } from "@/lib/vision/types";
import type {
  SettingsDTO,
  TechniqueDTO,
  VisionStatusDTO,
} from "@/lib/client-types";
import { formatMoney } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  FieldError,
  Input,
  Label,
  Select,
} from "@/components/ui/primitives";
import { DesignAnalyzer } from "./design-analyzer";
import { ResultsPanel } from "./results-panel";

export function QuoteStudio() {
  const [techniques, setTechniques] = useState<TechniqueDTO[]>([]);
  const [settings, setSettings] = useState<SettingsDTO | null>(null);
  const [visionStatus, setVisionStatus] = useState<VisionStatusDTO | null>(null);

  const [slug, setSlug] = useState("");
  const [clientName, setClientName] = useState("");
  const [productName, setProductName] = useState("");
  const [baseCost, setBaseCost] = useState("");
  const [machineMinutes, setMachineMinutes] = useState("");
  const [totalSeconds, setTotalSeconds] = useState("0");
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [prepId, setPrepId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFolio, setSavedFolio] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [techniquesRes, settingsRes, visionRes] = await Promise.all([
        fetch("/api/techniques"),
        fetch("/api/settings"),
        fetch("/api/vision/status"),
      ]);
      const techniquesData = (await techniquesRes.json()) as TechniqueDTO[];
      setTechniques(techniquesData);
      setSettings((await settingsRes.json()) as SettingsDTO);
      setVisionStatus((await visionRes.json()) as VisionStatusDTO);

      if (techniquesData.length > 0) {
        setSlug(techniquesData[0].slug);
        setPrepId(techniquesData[0].config.prepOptions[0]?.id ?? "");
      }
    })();
  }, []);

  const technique = useMemo(
    () => techniques.find((t) => t.slug === slug) ?? null,
    [techniques, slug],
  );

  function handleTechniqueChange(newSlug: string) {
    setSlug(newSlug);
    const next = techniques.find((t) => t.slug === newSlug);
    if (next && !next.config.prepOptions.some((p) => p.id === prepId)) {
      setPrepId(next.config.prepOptions[0]?.id ?? "");
    }
  }

  function applySuggestion(suggestion: VisionAnalysis) {
    if (!technique) return;
    const mapped = suggestion.requires_vectorization
      ? technique.config.prepOptions.find((p) => p.id === "vectorization")
      : suggestion.requires_cleanup
        ? technique.config.prepOptions.find((p) => p.id === "cleanup")
        : technique.config.prepOptions.find((p) => p.id === "ready_file");
    if (mapped) setPrepId(mapped.id);
    const suggestedSeconds = Math.round(
      technique.config.extraSeconds.includedSeconds * (suggestion.detail_level / 3),
    );
    setTotalSeconds(String(suggestedSeconds));
  }

  const result: QuoteResult | null = useMemo(() => {
    if (!technique || !settings || !prepId) return null;
    try {
      return calculateQuote(
        {
          baseProductCost: Number(baseCost) || 0,
          prepOptionId: prepId,
          machineMinutes: Number(machineMinutes) || 0,
          totalEngravedSeconds: Number(totalSeconds) || 0,
          quantity: Math.trunc(Number(quantity)) || 1,
          widthMm: widthMm !== "" ? Number(widthMm) : undefined,
          heightMm: heightMm !== "" ? Number(heightMm) : undefined,
        },
        technique.config,
        settings.margins,
        settings.rounding,
      );
    } catch {
      return null;
    }
  }, [technique, settings, prepId, baseCost, machineMinutes, totalSeconds, quantity, widthMm, heightMm]);

  const activeDiscountTier = technique?.config.volumeDiscounts
    .filter((t) => (Number(quantity) || 1) >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];

  async function saveQuote() {
    if (!result || !technique) return;
    if (!productName.trim()) {
      setSaveError("Escribe el nombre del producto.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSavedFolio(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim() || undefined,
          productName: productName.trim(),
          techniqueSlug: technique.slug,
          input: {
            baseProductCost: Number(baseCost) || 0,
            prepOptionId: prepId,
            machineMinutes: Number(machineMinutes) || 0,
            totalEngravedSeconds: Number(totalSeconds) || 0,
            quantity: Math.trunc(Number(quantity)) || 1,
            widthMm: widthMm !== "" ? Number(widthMm) : undefined,
            heightMm: heightMm !== "" ? Number(heightMm) : undefined,
          },
          visionAnalysis: analysis,
        }),
      });
      const data = (await response.json()) as { folio?: string; error?: string };
      if (!response.ok) {
        setSaveError(data.error ?? "No se pudo guardar la cotización.");
      } else if (data.folio) {
        setSavedFolio(data.folio);
      }
    } catch {
      setSaveError("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  }

  const currency = settings?.currency ?? "USD";

  return (    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Datos del pedido" />
          <CardBody className="space-y-3">
            <div>
              <Label htmlFor="client">Cliente (opcional)</Label>
              <Input
                id="client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <Label htmlFor="product">Producto</Label>
              <Input
                id="product"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ej. Placa de madera 20×30"
              />
            </div>
            <div>
              <Label htmlFor="technique">Técnica</Label>
              <Select id="technique" value={slug} onChange={(e) => handleTechniqueChange(e.target.value)}>
                {techniques.length === 0 && <option value="">Cargando…</option>}
                {techniques.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </CardBody>
        </Card>

        <DesignAnalyzer
          visionStatus={visionStatus}
          analysis={analysis}
          onAnalysisChange={setAnalysis}
          onApplySuggestion={applySuggestion}
        />

        <Card>
          <CardHeader title="Parámetros de producción" subtitle="Todos los valores son editables" />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="baseCost">Costo producto base</Label>
                <Input
                  id="baseCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={baseCost}
                  onChange={(e) => setBaseCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="machineMinutes">Tiempo de máquina (minutos)</Label>
              <Input
                id="machineMinutes"
                type="number"
                min="0"
                step="0.5"
                value={machineMinutes}
                onChange={(e) => setMachineMinutes(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="totalSeconds">Segundos totales de grabado</Label>
              <Input
                id="totalSeconds"
                type="number"
                min="0"
                step="1"
                value={totalSeconds}
                onChange={(e) => setTotalSeconds(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {technique
                  ? `Los primeros ${technique.config.extraSeconds.includedSeconds}s están incluidos en la preparación; se cobra ${formatMoney(technique.config.extraSeconds.costPerSecond, currency)} por segundo adicional.`
                  : ""}
              </p>
            </div>
            <div>
              <Label htmlFor="prep">Preparación / diseño</Label>
              <Select id="prep" value={prepId} onChange={(e) => setPrepId(e.target.value)}>
                {(technique?.config.prepOptions ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({formatMoney(p.cost, currency)})
                  </option>
                ))}
              </Select>
            </div>
            <DimensionsField
              widthMm={widthMm}
              heightMm={heightMm}
              onWidthChange={setWidthMm}
              onHeightChange={setHeightMm}
              secondsPerCm2={technique?.config.secondsPerCm2}
            />
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <ResultsPanel result={result} currency={currency} />

        {technique && technique.config.volumeDiscounts.length > 0 && (
          <Card>
            <CardHeader
              title="Descuentos por volumen"
              subtitle="Escalado configurado para esta técnica"
            />
            <CardBody>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="pb-2 font-medium">Cantidad mínima</th>
                    <th className="pb-2 text-right font-medium">Descuento</th>
                  </tr>
                </thead>
                <tbody>
                  {[...technique.config.volumeDiscounts]
                    .sort((a, b) => a.minQty - b.minQty)
                    .map((tier) => (
                      <tr key={tier.minQty} className="border-b border-slate-50 last:border-0">
                        <td className="py-1.5 text-slate-700">{tier.minQty}+ piezas</td>
                        <td className="py-1.5 text-right font-mono tabular-nums text-slate-700">
                          −{tier.discountPercent}%
                          {activeDiscountTier?.minQty === tier.minQty && (
                            <Badge tone="green">activo</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Guardar" subtitle="Se congela un snapshot inmutable de costos y configuración" />
          <CardBody>
            <Button onClick={() => void saveQuote()} disabled={!result || saving}>
              {saving ? "Guardando…" : "Guardar cotización"}
            </Button>
            <FieldError message={saveError ?? undefined} />
            {savedFolio && (
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Cotización guardada con folio{" "}
                <a href={`/historial`} className="font-semibold underline">
                  {savedFolio}
                </a>
                .
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function DimensionsField({
  widthMm,
  heightMm,
  onWidthChange,
  onHeightChange,
  secondsPerCm2,
}: {
  widthMm: string;
  heightMm: string;
  onWidthChange: (v: string) => void;
  onHeightChange: (v: string) => void;
  secondsPerCm2?: number;
}) {
  const w = widthMm === "" ? NaN : Number(widthMm);
  const h = heightMm === "" ? NaN : Number(heightMm);
  const hasDimensions = widthMm !== "" && heightMm !== "";
  const area = hasDimensions && !Number.isNaN(w) && !Number.isNaN(h) ? w * h : NaN;
  const rate = secondsPerCm2 !== undefined && secondsPerCm2 > 0 ? secondsPerCm2 : 15;

  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Dimensiones de grabado / marcaje
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="widthMm">Ancho (mm)</Label>
          <Input
            id="widthMm"
            type="number"
            min="0"
            step="0.1"
            value={widthMm}
            onChange={(e) => onWidthChange(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="heightMm">Alto (mm)</Label>
          <Input
            id="heightMm"
            type="number"
            min="0"
            step="0.1"
            value={heightMm}
            onChange={(e) => onHeightChange(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      {hasDimensions && !Number.isNaN(area) && (
        <p className="mt-2 text-[11px] text-slate-500">
          Área: {formatNumber(area / 100)} cm² ({w}×{h} mm){" "}
          | Tiempo est. grabado: {formatNumber((area / 100) * rate / 60)} min @ {rate} s/cm²
        </p>
      )}
    </fieldset>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}
