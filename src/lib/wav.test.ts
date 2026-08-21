import { describe, expect, it } from "vitest";
import { wavDurationMs } from "./wav";

describe("wavDurationMs", () => {
  it("reads duration from a PCM WAV header", () => {
    const buffer=Buffer.alloc(44+44100);buffer.write("RIFF",0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write("WAVEfmt ",8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(22050,24);buffer.writeUInt32LE(44100,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write("data",36);buffer.writeUInt32LE(44100,40);
    expect(wavDurationMs(buffer)).toBe(1000);
  });
  it("rejects non-WAV data",()=>expect(()=>wavDurationMs(Buffer.from("nope"))).toThrow("Not a WAV file"));
});
