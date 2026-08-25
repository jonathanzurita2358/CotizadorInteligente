import Link from "next/link";
import { db } from "@/lib/db";
import type { QuoteSnapshot } from "@/lib/snapshot";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, Card } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const quotes = await db.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { technique: { select: { name: true } } },
  });

  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Historial</h1>
        <p className="text-sm text-slate-500">
          Cada cotización guarda un snapshot inmutable de costos y parámetros vigentes al momento de crearse.
        </p>
      </div>

      {quotes.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-slate-500">Aún no hay cotizaciones guardadas.</p>
          <Link
            href="/cotizar"
            className="mt-3 inline-block text-sm font-medium text-red-600 hover:text-red-700"
          >
            Crear la primera →
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-medium">Folio</th>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Producto</th>
                <th className="px-4 py-2.5 font-medium">Técnica</th>
                <th className="px-4 py-2.5 text-right font-medium">Cant.</th>
                <th className="px-4 py-2.5 text-right font-medium">P. recomendado</th>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const snapshot = quote.snapshot as unknown as QuoteSnapshot;
                return (
                  <tr
                    key={quote.id}
                    className="border-b border-slate-50 transition-colors last:border-0 hover:bg-red-50/30"
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/historial/${quote.id}`} className="font-mono text-xs font-semibold text-red-600 hover:underline">
                        {quote.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{quote.clientName ?? "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{quote.productName}</td>
                    <td className="px-4 py-2.5"><Badge>{quote.technique.name}</Badge></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{quote.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatMoney(snapshot.result?.totals?.recommended ?? 0, snapshot.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(quote.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
