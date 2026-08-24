import { describe, expect, it } from "vitest";
import { computeProficiency, PROFICIENCY_MAX } from "./proficiency";

const day = (offset: number) => new Date(Date.UTC(2026, 0, 10 + offset, 4, 0, 0)); // ~noon Asia/Taipei

describe("computeProficiency", () => {
  it("scores an empty history as zero", () => {
    expect(computeProficiency([], day(0))).toBe(0);
  });

  it("gives full points for a correct review same day", () => {
    expect(computeProficiency([{ isCorrect: true, createdAt: day(0) }], day(0))).toBe(20);
  });

  it("takes the best of multiple reviews on the same day", () => {
    const events = [{ isCorrect: false, createdAt: day(0) }, { isCorrect: true, createdAt: day(0) }, { isCorrect: false, createdAt: day(0) }];
    expect(computeProficiency(events, day(0))).toBe(20);
  });

  it("an all-wrong day scores zero for that day", () => {
    expect(computeProficiency([{ isCorrect: false, createdAt: day(0) }], day(0))).toBe(0);
  });

  it("accumulates across the 5-day window, one correct review per day", () => {
    const events = [0, 1, 2, 3, 4].map((offset) => ({ isCorrect: true, createdAt: day(-offset) }));
    expect(computeProficiency(events, day(0))).toBe(PROFICIENCY_MAX);
  });

  it("drops a day out of the window once it falls more than 5 days behind", () => {
    const events = [{ isCorrect: true, createdAt: day(-5) }];
    expect(computeProficiency(events, day(0))).toBe(0);
  });

  it("keeps a day exactly at the 5-day edge", () => {
    const events = [{ isCorrect: true, createdAt: day(-4) }];
    expect(computeProficiency(events, day(0))).toBe(20);
  });
});
