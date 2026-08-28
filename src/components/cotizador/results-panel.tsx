"use client";

import type { QuoteResult } from "@/lib/pricing/types";
import { formatMoney } from "@/lib/format";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui/primitives";

interface ResultsPanelProps {
  result: QuoteResult | null;
  currency: string;
}

export function ResultsPanel({ result, currency }: ResultsPanelProps) {
  if (!result) {
    return (
      <Card>
        <CardHeader
          title="Resultado"
          subtitle="Completa los datos para ver el cálculo en vivo"
        />
        <CardBody>
          <p className="py-8 text-center text-sm text-slate-400">
            Ingresa valores válidos de costo, tiempo y cantidad.
          </p>
        </CardBody>
      </Card>
    );
  }

  const { cost, prices, totals, quantity, volumeDiscountPercent, dimensions } = result;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Costo real de producción"
          subtitle="Lo que te cuesta producir una pieza — no se muestra al cliente"
        />
        <CardBody className="space-y-1.5">
          {dimensions && (
            <div className="mb-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Área: <strong>{dimensions.areaCm2} cm²</strong> ({dimensions.widthMm}×{dimensions.heightMm} mm){" "}
              | Tiempo estimado: <strong>{formatMinutes(dimensions.estimatedSeconds)} min</strong>{" "}
              | Tiempo a cobrar: <strong>{formatMinutes(dimensions.chargeableSeconds)} min</strong>{" "}
              @ {dimensions.secondsPerCm2} s/cm²
              {dimensions.includedSeconds > 0 && (
                <> (primeros {dimensions.includedSeconds}s incluidos)</>
              )}
            </div>
          )}
          <CostLine label="Producto base" value={cost.productBase} currency={currency} />
          <CostLine
            label={`Máquina · ${formatMinutes(cost.machine.minutes)} min × ${formatMoney(cost.machine.costPerMinute, currency)}/min`}
            value={cost.machine.total}
            currency={currency}
          />
          <CostLine label={`Preparación · ${cost.preparation.label}`} value={cost.preparation.total} currency={currency} />
          <div className="ml-3 space-y-1.5 border-l border-slate-100 pl-3">
            <CostLine
              label={`Electricidad · ${cost.operational.electricity.kwhUsed} kWh`}
              value={cost.operational.electricity.total}
              currency={currency}
              muted
            />
            <CostLine
              label={`Mano de obra · ${cost.operational.labor.minutes} min`}
              value={cost.operational.labor.total}
              currency={currency}
              muted
            />
            <CostLine label="Mantenimiento" value={cost.operational.maintenance.total} currency={currency} muted />
            <CostLine
              label={`Desperdicio · ${cost.operational.waste.percentOverMaterials}%`}
              value={cost.operational.waste.total}
              currency={currency}
              muted
            />
          </div>
          {dimensions ? (
            <p className="text-xs text-slate-400">
              El tiempo a cobrar del grabado ya está incluido en la línea de máquina.
            </p>
          ) : cost.extraEngraving.extraSeconds > 0 ? (
            <CostLine
              label={`Segundos extra · ${cost.extraEngraving.extraSeconds}s × ${formatMoney(cost.extraEngraving.costPerSecond, currency)}`}
              value={cost.extraEngraving.total}
              currency={currency}
            />
          ) : (
            <p className="text-xs text-slate-400">
              Segundos de grabado dentro del tiempo incluido ({cost.extraEngraving.includedSeconds}s).
            </p>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2.5">
            <span className="text-sm font-semibold text-slate-700">Costo real unitario</span>
            <span className="font-mono text-base font-bold text-slate-900">
              {formatMoney(cost.realTotal, currency)}
            </span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Precios de venta sugeridos"
          subtitle="Calculados sobre el costo real con los márgenes configurados"
          action={
            volumeDiscountPercent > 0 ? (
              <Badge tone="green">Descuento por volumen: −{volumeDiscountPercent}%</Badge>
            ) : undefined
          }
        />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <PriceCard
            title="Mínimo"
            hint="Piso de venta"
            marginPct={prices.minimum.marginPct}
            rawUnitPrice={prices.minimum.rawUnitPrice}
            roundedUnitPrice={prices.minimum.roundedUnitPrice}
            total={totals.minimum}
            quantity={quantity}
            currency={currency}
          />
          <PriceCard
            title="Recomendado"
            hint="Precio estándar"
            marginPct={prices.recommended.marginPct}
            rawUnitPrice={prices.recommended.rawUnitPrice}
            roundedUnitPrice={prices.recommended.roundedUnitPrice}
            total={totals.recommended}
            quantity={quantity}
            currency={currency}
            highlighted
          />
          <PriceCard
            title="Premium"
            hint="Alto valor / urgente"
            marginPct={prices.premium.marginPct}
            rawUnitPrice={prices.premium.rawUnitPrice}
            roundedUnitPrice={prices.premium.roundedUnitPrice}
            total={totals.premium}
            quantity={quantity}
            currency={currency}
          />
        </CardBody>
      </Card>

    </div>
  );
}

function CostLine({
  label,
  value,
  currency,
  muted = false,
}: {
  label: string;
  value: number;
  currency: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={muted ? "text-xs text-slate-500" : "text-slate-600"}>{label}</span>
      <span className={`font-mono tabular-nums ${muted ? "text-xs text-slate-500" : "text-slate-800"}`}>
        {formatMoney(value, currency)}
      </span>
    </div>
  );
}

function formatMinutes(seconds: number): string {
  return (seconds / 60).toFixed(1);
}

function PriceCard({
  title,
  hint,
  marginPct,
  rawUnitPrice,
  roundedUnitPrice,
  total,
  quantity,
  currency,
  highlighted = false,
}: {
  title: string;
  hint: string;
  marginPct: number;
  rawUnitPrice: number;
  roundedUnitPrice: number;
  total: number;
  quantity: number;
  currency: string;
  highlighted?: boolean;
}) {
  const roundedUp = roundedUnitPrice > rawUnitPrice;
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlighted ? "border-red-300 bg-red-50/50 ring-1 ring-red-200" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${highlighted ? "text-red-700" : "text-slate-700"}`}>
          {title}
        </span>
        <Badge tone={highlighted ? "red" : "slate"}>+{marginPct}%</Badge>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
      <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${highlighted ? "text-red-700" : "text-slate-900"}`}>
        {formatMoney(roundedUnitPrice, currency)}
      </p>
      <p className="text-[11px] text-slate-500">
        {roundedUp
          ? `Redondeado desde ${formatMoney(rawUnitPrice, currency)}`
          : "Sin ajuste de redondeo"}
      </p>
      <div className="mt-2 border-t border-slate-200/70 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-slate-500">Total {quantity} pz</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-slate-800">
            {formatMoney(total, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
