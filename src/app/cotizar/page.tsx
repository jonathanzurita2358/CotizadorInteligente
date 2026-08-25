import { QuoteStudio } from "@/components/cotizador/quote-studio";

export default function CotizarPage() {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Nueva cotización</h1>
        <p className="text-sm text-slate-500">
          El cálculo se actualiza en vivo. El costo real nunca se mezcla con el precio de venta.
        </p>
      </div>
      <QuoteStudio />
    </>
  );
}
