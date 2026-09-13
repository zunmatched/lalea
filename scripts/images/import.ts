import { loadEnvConfig } from "@next/env";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

const fileNamePattern = /^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/;

async function main() {
  const [source, name] = process.argv.slice(2);
  if (!source || !name) throw new Error("Usage: tsx scripts/images/import.ts <source-file> <target-name.ext>\n目標檔名只能用小寫字母、數字、連字號，副檔名限 jpg/jpeg/png/webp，例如 toeic-p1-office.jpg");
  if (!fileNamePattern.test(name)) throw new Error(`目標檔名 "${name}" 不合法，只能用小寫字母、數字、連字號，副檔名限 jpg/jpeg/png/webp`);

  const imageDir = path.resolve(process.env.LALEA_IMAGE_DIR ?? "images/uploaded");
  await mkdir(imageDir, { recursive: true });
  const destination = path.join(imageDir, name);
  await copyFile(source, destination);

  console.log(`已複製到 ${destination}`);
  console.log(`課程 JSON 裡的 exercise group 請用 "image": "${name}"，匯入後會存成 "/media/images/${name}"。`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
