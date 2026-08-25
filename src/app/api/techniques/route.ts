import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { listTechniques } from "@/lib/server/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";
  return Response.json(await listTechniques(!all));
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    slug?: unknown;
    name?: unknown;
    active?: unknown;
    config?: unknown;
  };

  if (typeof body.slug !== "string" || !body.slug) {
    return Response.json({ error: "slug es obligatorio" }, { status: 400 });
  }

  const existing = await db.technique.findUnique({ where: { slug: body.slug } });
  if (!existing) {
    return Response.json({ error: "Técnica no encontrada" }, { status: 404 });
  }

  const updated = await db.technique.update({
    where: { slug: body.slug },
    data: {
      name: typeof body.name === "string" && body.name ? body.name : existing.name,
      active: typeof body.active === "boolean" ? body.active : existing.active,
      config:
        body.config !== null && body.config !== undefined && typeof body.config === "object"
          ? (body.config as Prisma.InputJsonValue)
          : (existing.config as Prisma.InputJsonValue),
    },
  });

  return Response.json(updated);
}
