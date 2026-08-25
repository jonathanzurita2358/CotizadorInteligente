import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { listTechniques } from "@/lib/server/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";
  return Response.json(await listTechniques(!all));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const DEFAULT_CONFIG: Record<string, unknown> = {
  machineCostPerMinute: 0.12,
  electricityKw: 0.06,
  costPerKwh: 0.1,
  laborRatePerHour: 4.5,
  laborMinutes: 5,
  maintenanceMonthlyCost: 15,
  maintenanceMonthlyHours: 80,
  wastePercentOverMaterials: 3,
  prepOptions: [
    { id: "ready_file", label: "Archivo listo", cost: 0 },
    { id: "cleanup", label: "Limpieza de archivo", cost: 2 },
    { id: "vectorization", label: "Vectorización", cost: 4 },
    { id: "from_scratch", label: "Diseño desde cero", cost: 8 },
  ],
  extraSeconds: { costPerSecond: 0.002, includedSeconds: 180 },
  volumeDiscounts: [
    { minQty: 10, discountPercent: 5 },
    { minQty: 25, discountPercent: 10 },
    { minQty: 50, discountPercent: 15 },
  ],
};

export async function POST(request: Request) {
  let body: { name?: unknown; slug?: unknown; active?: unknown; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const slug =
    typeof body.slug === "string" && body.slug.trim()
      ? slugify(body.slug)
      : slugify(name);

  const exists = await db.technique.findUnique({ where: { slug } });
  if (exists) {
    return Response.json({ error: `Ya existe una técnica con el slug "${slug}"` }, { status: 409 });
  }

  const created = await db.technique.create({
    data: {
      name,
      slug,
      active: typeof body.active === "boolean" ? body.active : false,
      config:
        body.config !== null && body.config !== undefined && typeof body.config === "object"
          ? (body.config as Prisma.InputJsonValue)
          : (DEFAULT_CONFIG as Prisma.InputJsonValue),
    },
  });

  return Response.json(created, { status: 201 });
}
