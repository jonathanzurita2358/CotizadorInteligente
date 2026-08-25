import { db } from "@/lib/db";
import { getGlobalSettings } from "@/lib/server/queries";

const ROUNDING_MODES = ["none", "up", "nearest"];

export async function GET() {
  return Response.json(await getGlobalSettings());
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    currency?: unknown;
    margins?: unknown;
    rounding?: unknown;
  };

  if (
    typeof body.margins !== "object" ||
    body.margins === null ||
    typeof body.rounding !== "object" ||
    body.rounding === null
  ) {
    return Response.json({ error: "margins y rounding son obligatorios" }, { status: 400 });
  }

  const margins = body.margins as Record<string, unknown>;
  for (const key of ["minimumPct", "recommendedPct", "premiumPct"]) {
    const v = margins[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return Response.json({ error: `Margen inválido: ${key}` }, { status: 400 });
    }
  }

  const rounding = body.rounding as Record<string, unknown>;
  if (!ROUNDING_MODES.includes(String(rounding.mode))) {
    return Response.json({ error: "Modo de redondeo inválido" }, { status: 400 });
  }
  const step = Number(rounding.step);
  if (String(rounding.mode) !== "none" && (!Number.isFinite(step) || step <= 0)) {
    return Response.json({ error: "El paso de redondeo debe ser > 0" }, { status: 400 });
  }

  await db.globalSettings.upsert({
    where: { id: "singleton" },
    update: {
      currency: typeof body.currency === "string" && body.currency ? body.currency : "USD",
      margins: body.margins,
      rounding: body.rounding,
    },
    create: {
      id: "singleton",
      currency: typeof body.currency === "string" && body.currency ? body.currency : "USD",
      margins: body.margins,
      rounding: body.rounding,
    },
  });

  return Response.json(await getGlobalSettings());
}
