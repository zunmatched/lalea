import { describe, expect, it } from "vitest";
import { nextIntervalDays } from "./scheduler";
describe("nextIntervalDays", () => {
  it("schedules mistakes earlier", () => { expect(nextIntervalDays(4, false)).toBe(1); expect(nextIntervalDays(4, true, "mastered")).toBe(8); });
  it("caps intervals", () => expect(nextIntervalDays(60, true, "too_easy")).toBe(90));
});

