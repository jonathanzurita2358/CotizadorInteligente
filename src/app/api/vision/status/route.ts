import { visionStatus } from "@/lib/vision/factory";

export async function GET() {
  return Response.json(visionStatus());
}
