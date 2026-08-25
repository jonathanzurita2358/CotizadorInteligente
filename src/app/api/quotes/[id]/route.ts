import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const quote = await db.quote.findUnique({
    where: { id },
    include: { technique: { select: { name: true, slug: true } } },
  });
  if (!quote) return Response.json({ error: "Cotización no encontrada" }, { status: 404 });
  return Response.json(quote);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await db.quote.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return Response.json({ error: "Cotización no encontrada" }, { status: 404 });
  await db.quote.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
