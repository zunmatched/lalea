import { stat, readFile } from "node:fs/promises";
import path from "node:path";

const imageDir = path.resolve(/*turbopackIgnore: true*/ process.env.LALEA_IMAGE_DIR ?? "images/uploaded");
const fileNamePattern = /^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/;
const contentTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const match = fileNamePattern.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  const filePath = path.join(/*turbopackIgnore: true*/ imageDir, file);
  let buffer;
  try {
    await stat(filePath);
    buffer = await readFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({
    "content-type": contentTypes[match[1]],
    "content-length": String(buffer.length),
    "cache-control": "private, max-age=86400",
  });
  return new Response(buffer, { status: 200, headers });
}
