import { db } from "@/lib/db";
import { calculateQuote, PricingError } from "@/lib/pricing";
import type { QuoteInput } from "@/lib/pricing/types";
import type { VisionAnalysis } from "@/lib/vision/types";
import {
  getGlobalSettings,
  getTechniqueBySlug,
  nextFolio,
  parseTechniqueConfig,
} from "@/lib/server/queries";
import type { QuoteSnapshot } from "@/lib/snapshot";

export async function GET() {
  const quotes = await db.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { technique: { select: { name: true, slug: true } } },
  });
  return Response.json(quotes);
}

export async function POST(request: Request) {
  let body: {
    clientName?: unknown;
    productName?: unknown;
    techniqueSlug?: unknown;
    input?: unknown;
    visionAnalysis?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (typeof body.productName !== "string" || !body.productName.trim()) {
    return Response.json({ error: "El nombre del producto es obligatorio" }, { status: 400 });
  }
  if (typeof body.techniqueSlug !== "string") {
    return Response.json({ error: "techniqueSlug es obligatorio" }, { status: 400 });
  }
  const input = body.input as Partial<QuoteInput> | undefined;
  if (
    !input ||
    typeof input.baseProductCost !== "number" ||
    typeof input.machineMinutes !== "number" ||
    typeof input.totalEngravedSeconds !== "number" ||
    typeof input.quantity !== "number" ||
    typeof input.prepOptionId !== "string"
  ) {
    return Response.json({ error: "input incompleto o inválido" }, { status: 400 });
  }

  const technique = await getTechniqueBySlug(body.techniqueSlug);
  if (!technique) {
    return Response.json({ error: "Técnica no encontrada" }, { status: 404 });
  }

  const settings = await getGlobalSettings();
  const config = parseTechniqueConfig(technique.config);

  const quoteInput: QuoteInput = {
    baseProductCost: input.baseProductCost,
    prepOptionId: input.prepOptionId,
    machineMinutes: input.machineMinutes,
    totalEngravedSeconds: input.totalEngravedSeconds,
    quantity: Math.trunc(input.quantity),
    widthMm: typeof input.widthMm === "number" ? input.widthMm : undefined,
    heightMm: typeof input.heightMm === "number" ? input.heightMm : undefined,
  };

  try {
    const result = calculateQuote(quoteInput, config, settings.margins, settings.rounding);

    const snapshot: QuoteSnapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      currency: settings.currency,
      technique: { slug: technique.slug, name: technique.name },
      input: quoteInput,
      config,
      margins: settings.margins,
      rounding: settings.rounding,
      result,
      visionAnalysis:
        body.visionAnalysis !== null && typeof body.visionAnalysis === "object"
          ? (body.visionAnalysis as VisionAnalysis)
          : null,
    };

    const created = await db.quote.create({
      data: {
        folio: await nextFolio(),
        clientName:
          typeof body.clientName === "string" && body.clientName.trim()
            ? body.clientName.trim()
            : null,
        productName: body.productName.trim(),
        quantity: quoteInput.quantity,
        snapshot: snapshot as unknown as object,
        techniqueId: technique.id,
      },
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof PricingError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
