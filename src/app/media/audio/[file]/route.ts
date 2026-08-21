import { stat, readFile } from "node:fs/promises";
import path from "node:path";

const mediaDir = path.resolve(process.env.LALEA_MEDIA_DIR ?? "audio/generated");
const fileNamePattern = /^[a-z0-9-]+\.wav$/;

export async function GET(request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!fileNamePattern.test(file)) return new Response("Not found", { status: 404 });

  const filePath = path.join(mediaDir, file);
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({
    "content-type": "audio/wav",
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=86400",
  });

  const range = request.headers.get("range");
  if (!range) {
    const buffer = await readFile(filePath);
    headers.set("content-length", String(buffer.length));
    return new Response(buffer, { status: 200, headers });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (match[1] === "" && match[2] === "")) return new Response("Invalid Range", { status: 416 });
  const start = match[1] === "" ? size - Number(match[2]) : Number(match[1]);
  const end = match[2] === "" ? size - 1 : Number(match[2]);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || end >= size) {
    return new Response("Invalid Range", { status: 416, headers: { "content-range": `bytes */${size}` } });
  }

  const buffer = await readFile(filePath);
  const chunk = buffer.subarray(start, end + 1);
  headers.set("content-length", String(chunk.length));
  headers.set("content-range", `bytes ${start}-${end}/${size}`);
  return new Response(chunk, { status: 206, headers });
}
