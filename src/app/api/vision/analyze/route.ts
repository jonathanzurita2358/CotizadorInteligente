import { getVisionProvider } from "@/lib/vision/factory";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const provider = getVisionProvider();
  if (!provider.isConfigured()) {
    return Response.json(
      {
        available: false,
        provider: provider.name,
        message:
          "No hay proveedor de visión configurado. Completa el análisis manualmente.",
      },
      { status: 200 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Se esperaba multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el campo 'image'" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return Response.json(
      { error: `Formato no soportado: ${file.type}. Usa PNG, JPEG, WEBP o GIF.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "La imagen excede 8 MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const analysis = await provider.analyze({
      base64: buffer.toString("base64"),
      mimeType: file.type,
    });
    return Response.json({ available: true, provider: provider.name, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return Response.json(
      {
        available: true,
        provider: provider.name,
        error: `El análisis falló: ${message}. Completa el análisis manualmente.`,
      },
      { status: 502 },
    );
  }
}
