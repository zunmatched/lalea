import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import manifest from "./manifest.json";
import { wavDurationMs } from "../../src/lib/wav";

const outputDir = path.resolve(process.env.LALEA_AUDIO_OUTPUT ?? "audio/generated");
const python = process.env.LALEA_PYTHON ?? "python3";
const dataDir = process.env.PIPER_DATA_DIR;
await mkdir(outputDir, { recursive: true });
const generated = [];
for (const asset of manifest.assets) {
  const output = path.join(outputDir, asset.file);
  const args = ["-m", "piper", "-m", manifest.engine.modelId, "-f", output];
  if (dataDir) args.push("--data-dir", dataDir);
  args.push("--", asset.text);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(python, args, { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Piper exited with ${code}`)));
  });
  const bytes = await readFile(output);
  generated.push({ ...asset, checksum: createHash("sha256").update(bytes).digest("hex"), durationMs: wavDurationMs(bytes), storagePath: `/media/audio/${asset.file}` });
}
await writeFile(path.join(outputDir, "metadata.json"), JSON.stringify({ engine: manifest.engine, generatedAt: new Date().toISOString(), assets: generated }, null, 2));
console.log(`Generated ${generated.length} audio assets in ${outputDir}`);
