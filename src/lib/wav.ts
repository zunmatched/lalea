export function wavDurationMs(buffer: Buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not a WAV file");
  let offset = 12;
  let byteRate: number | undefined;
  let dataSize: number | undefined;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt " && size >= 12) byteRate = buffer.readUInt32LE(offset + 8 + 8);
    if (id === "data") dataSize = size;
    offset += 8 + size + (size % 2);
  }
  if (!byteRate || dataSize === undefined) throw new Error("Incomplete WAV header");
  return Math.round((dataSize / byteRate) * 1000);
}
