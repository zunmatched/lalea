import { describe, expect, it } from "vitest";
import { seededShuffle } from "./shuffle";
describe("seededShuffle", () => {
  it("is stable", () => expect(seededShuffle([1,2,3,4], 42)).toEqual(seededShuffle([1,2,3,4], 42)));
  it("does not mutate input", () => { const source=[1,2,3]; seededShuffle(source, 7); expect(source).toEqual([1,2,3]); });
});
