import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { QuoteSnapshot } from "@/lib/snapshot";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await db.quote.findUnique({
    where: { id },
    include: { technique: { select: { name: true } } },
  });
  if (!quote) notFound();

  const snap = quote.snapshot as unknown as QuoteSnapshot;
  const c = snap.currency;
  const cost = snap.result.cost;

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link href="/historial" className="text-xs text-slate-500 hover:text-slate-700">
            ← Volver al historial
          </Link>
          <h1 className="mt-1 font-mono text-xl font-bold tracking-tight">{quote.folio}</h1>
          <p className="text-sm text-slate-500">
            Snapshot inmutable · guardado el {formatDate(quote.createdAt)}
          </p>
        </div>
        <Badge tone="blue">{snap.technique.name}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Costo real (congelado)"
              subtitle="Refleja la configuración vigente al momento de cotizar"
            />
            <CardBody className="space-y-1.5">
              <Row label="Producto base" value={formatMoney(cost.productBase, c)} />
              <Row
                label={`Máquina · ${cost.machine.minutes} min × ${formatMoney(cost.machine.costPerMinute, c)}/min`}
                value={formatMoney(cost.machine.total, c)}
              />
              <Row label={`Preparación · ${cost.preparation.label}`} value={formatMoney(cost.preparation.total, c)} />
              <Row label={`Electricidad · ${cost.operational.electricity.kwhUsed} kWh`} value={formatMoney(cost.operational.electricity.total, c)} muted />
              <Row label={`Mano de obra · ${cost.operational.labor.minutes} min`} value={formatMoney(cost.operational.labor.total, c)} muted />
              <Row label="Mantenimiento" value={formatMoney(cost.operational.maintenance.total, c)} muted />
              <Row label={`Desperdicio · ${cost.operational.waste.percentOverMaterials}%`} value={formatMoney(cost.operational.waste.total, c)} muted />
              <Row
                label={`Segundos extra · ${cost.extraEngraving.extraSeconds}s × ${formatMoney(cost.extraEngraving.costPerSecond, c)}`}
                value={formatMoney(cost.extraEngraving.total, c)}
              />
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2.5">
                <span className="text-sm font-semibold text-slate-700">Costo real unitario</span>
                <span className="font-mono text-base font-bold">{formatMoney(cost.realTotal, c)}</span>
              </div>
            </CardBody>
          </Card>

          {snap.visionAnalysis && (
            <Card>
              <CardHeader title="Análisis de diseño (sugerencia IA congelada)" />
              <CardBody className="space-y-2 text-sm text-slate-600">
                <p>
                  Categoría: <strong>{snap.visionAnalysis.category}</strong> · complejidad{" "}
                  <strong>{snap.visionAnalysis.complexity}</strong> · confianza{" "}
                  {(snap.visionAnalysis.confidence * 100).toFixed(0)}%
                </p>
                {snap.visionAnalysis.recommendation && (
                  <p className="italic">“{snap.visionAnalysis.recommendation}”</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Pedido" />
            <CardBody className="space-y-2 text-sm">
              <Row label="Cliente" value={quote.clientName ?? "—"} plain />
              <Row label="Producto" value={quote.productName} plain />
              <Row label="Cantidad" value={String(quote.quantity)} plain />
              <Row label="Tiempo de máquina" value={`${snap.input.machineMinutes} min`} plain />
              <Row label="Segundos grabados" value={String(snap.input.totalEngravedSeconds)} plain />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Precios de venta"
              action={
                snap.result.volumeDiscountPercent > 0 ? (
                  <Badge tone="green">−{snap.result.volumeDiscountPercent}% volumen</Badge>
                ) : undefined
              }
            />
            <CardBody className="space-y-3">
              <PriceBlock title="Mínimo" marginPct={snap.margins.minimumPct} unit={snap.result.prices.minimum.roundedUnitPrice} total={snap.result.totals.minimum} currency={c} />
              <PriceBlock title="Recomendado" marginPct={snap.margins.recommendedPct} unit={snap.result.prices.recommended.roundedUnitPrice} total={snap.result.totals.recommended} currency={c} highlighted />
              <PriceBlock title="Premium" marginPct={snap.margins.premiumPct} unit={snap.result.prices.premium.roundedUnitPrice} total={snap.result.totals.premium} currency={c} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Configuración congelada" subtitle="Márgenes y redondeo aplicados" />
            <CardBody className="space-y-1.5 text-xs text-slate-500">
              <Row label="Margen mínimo" value={`${snap.margins.minimumPct}%`} plain />
              <Row label="Margen recomendado" value={`${snap.margins.recommendedPct}%`} plain />
              <Row label="Margen premium" value={`${snap.margins.premiumPct}%`} plain />
              <Row
                label="Redondeo"
                value={
                  snap.rounding.mode === "none"
                    ? "sin redondeo"
                    : `${snap.rounding.mode === "up" ? "arriba" : "cercano"} a ${snap.rounding.step}`
                }
                plain
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  muted = false,
  plain = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  plain?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={muted ? "text-xs text-slate-500" : "text-slate-600"}>{label}</span>
      <span
        className={
          plain ? "text-right font-medium text-slate-800" : `font-mono tabular-nums ${muted ? "text-xs text-slate-500" : "text-slate-800"}`
        }
      >
        {value}
      </span>
    </div>
  );
}

function PriceBlock({
  title,
  marginPct,
  unit,
  total,
  currency,
  highlighted = false,
}: {
  title: string;
  marginPct: number;
  unit: number;
  total: number;
  currency: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlighted ? "border-red-300 bg-red-50/50 ring-1 ring-red-200" : "border-slate-200"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${highlighted ? "text-red-700" : "text-slate-700"}`}>{title}</span>
        <Badge tone={highlighted ? "red" : "slate"}>+{marginPct}%</Badge>
      </div>
      <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${highlighted ? "text-red-700" : ""}`}>
        {formatMoney(unit, currency)}
      </p>
      <p className="text-[11px] text-slate-500">Total pedido: {formatMoney(total, currency)}</p>
    </div>
  );
}
