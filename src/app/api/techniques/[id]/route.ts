import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await db.technique.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Técnica no encontrada" }, { status: 404 });
  }

  let body: { name?: unknown; active?: unknown; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const updated = await db.technique.update({
    where: { id },
    data: {
      name: typeof body.name === "string" && body.name ? body.name.trim() : existing.name,
      active: typeof body.active === "boolean" ? body.active : existing.active,
      config:
        body.config !== null && body.config !== undefined && typeof body.config === "object"
          ? (body.config as Prisma.InputJsonValue)
          : (existing.config as Prisma.InputJsonValue),
    },
  });

  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await db.technique.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ error: "Técnica no encontrada" }, { status: 404 });
  }

  const hasQuotes = await db.quote.count({ where: { techniqueId: id } });
  if (hasQuotes > 0) {
    return Response.json(
      { error: "No se puede eliminar: existen cotizaciones asociadas a esta técnica." },
      { status: 409 },
    );
  }

  await db.technique.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
